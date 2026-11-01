// Owner-authorized public shared ledger. This gateway intentionally has no user authentication.
import http from 'node:http';
const token=process.env.BAR_API_TOKEN;
if(!token || token.length<40) throw Error('Missing backend token');
const routes=new Set(['GET /state','GET /hotspots','PUT /bills','DELETE /bills','PUT /settings','POST /report','POST /campaigns']);
let active=0;
http.createServer(async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Max-Age','600');
  res.setHeader('Cache-Control','no-store, private');
  res.setHeader('X-Content-Type-Options','nosniff');
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
  if(req.url!=='/'){send(404,{error:'接口不存在'});return;}
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  if(req.method!=='POST'){send(405,{error:'仅支持POST'});return;}
  if(active>=4){send(429,{error:'请求较多，请稍后重试'});return;}
  active++;
  try{
    let raw='',size=0;
    for await(const chunk of req){size+=chunk.length;if(size>16384){send(413,{error:'提交内容过长'});return;}raw+=chunk;}
    let body;try{body=JSON.parse(raw);}catch{send(400,{error:'数据格式无效'});return;}
    if(!body || !routes.has(body.route)){send(400,{error:'该请求不在代理白名单内'});return;}
    const [method,path]=body.route.split(' ');
    const upstream=await fetch('http://127.0.0.1:4319/api'+path,{
      method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:method==='GET'?undefined:JSON.stringify(body.payload??{}),signal:AbortSignal.timeout(70000)
    });
    const text=await upstream.text();
    res.writeHead(upstream.status,{'Content-Type':'application/json; charset=utf-8'});res.end(text);
  }catch{if(!res.headersSent)send(502,{error:'后端暂时不可达，请稍后重试'});else res.end();}
  finally{active--;}
}).listen({host:'127.0.0.1',port:8790},()=>console.log('Public shared-ledger proxy listening on loopback:8790'));
