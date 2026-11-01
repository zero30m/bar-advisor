// Owner-authorized public shared ledger; no user authentication.
import http from 'node:http';
import {randomUUID,createHash} from 'node:crypto';
const token=process.env.BAR_API_TOKEN;
if(!token || token.length<40) throw Error('Missing backend token');
const routes=new Set(['GET /state','GET /hotspots','PUT /bills','DELETE /bills','PUT /settings','POST /report','POST /campaigns']);
const jobs=new Map();let active=0,running=0;
async function upstream(route,payload){
 const [method,path]=route.split(' ');
 try{
  const r=await fetch('http://127.0.0.1:4319/api'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:method==='GET'?undefined:JSON.stringify(payload??{}),signal:AbortSignal.timeout(70000)});
  return {status:r.status,data:await r.json()};
 }catch{return {status:502,data:{error:'后端暂时不可达，请稍后重试'}};}
}
http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type');
 res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');res.setHeader('Access-Control-Max-Age','600');
 res.setHeader('Cache-Control','no-store, private');res.setHeader('X-Content-Type-Options','nosniff');
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
 if(req.url!=='/'){send(404,{error:'接口不存在'});return;}
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 if(req.method!=='POST'){send(405,{error:'仅支持POST'});return;}
 if(active>=16){send(429,{error:'请求较多，请稍后重试'});return;}
 active++;const started=Date.now();let route='invalid';
 try{
  let raw='',size=0;for await(const chunk of req){size+=chunk.length;if(size>16384){send(413,{error:'提交内容过长'});return;}raw+=chunk;}
  let body;try{body=JSON.parse(raw);}catch{send(400,{error:'数据格式无效'});return;}
  route=body?.route;
  for(const [id,job] of jobs)if(job.expires<Date.now()&&job.result)jobs.delete(id);
  if(route==='GET /job'){
   const job=jobs.get(body.payload?.jobId);
   if(!job){send(410,{error:'生成任务已过期或服务已重启，请重新发起'});return;}
   if(job.result)send(job.result.status,job.result.data);else send(202,{pending:true,jobId:body.payload.jobId});
   return;
  }
  if(!routes.has(route)){send(400,{error:'该请求不在代理白名单内'});return;}
  if(body.async===true&&['POST /report','POST /campaigns'].includes(route)){
   const key=createHash('sha256').update(JSON.stringify([route,body.payload??{}])).digest('hex');
   const existing=[...jobs].find(([,j])=>j.key===key&&!j.result);
   if(existing){send(202,{pending:true,jobId:existing[0]});return;}
   if(running>=4||jobs.size>=200){send(429,{error:'生成任务较多，请稍后重试'});return;}
   const id=randomUUID(),job={key,expires:Date.now()+600000,result:null};jobs.set(id,job);running++;
   upstream(route,body.payload).then(result=>{job.result=result;running--;});
   send(202,{pending:true,jobId:id});return;
  }
  const result=await upstream(route,body.payload);send(result.status,result.data);
 }catch{if(!res.headersSent)send(502,{error:'请求处理失败，请稍后重试'});else res.end();}
 finally{active--;console.log(JSON.stringify({route:routes.has(route)||route==='GET /job'?route:'invalid',status:res.statusCode,ms:Date.now()-started}));}
}).listen({host:'127.0.0.1',port:8790},()=>console.log('Public shared-ledger proxy listening on loopback:8790'));
