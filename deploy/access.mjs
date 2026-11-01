import { createHash, timingSafeEqual } from 'node:crypto';
const digest = s => createHash('sha256').update(s).digest('hex');
const equal = (a,b) => timingSafeEqual(Buffer.from(digest(a)),Buffer.from(digest(b)));
export function accessGate() {
  const master = process.env.BAR_API_TOKEN;
  if (!master || master.length < 40) throw new Error('BAR_API_TOKEN must contain at least 40 characters');
  const reply=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  return async (req,res,p)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    const origin=req.headers.origin;
    if(origin){
      let valid=origin==='null';
      try{const u=new URL(origin);valid ||= u.origin===origin && (u.protocol==='https:' || ['http://localhost','http://127.0.0.1'].some(x=>u.origin===x||u.origin.startsWith(x+':')));}catch{}
      if(!valid){reply(res,403,{error:'Origin not allowed'});return false;}
      // Bearer-only authorization. No cookies or ambient credentials are accepted.
      res.setHeader('Access-Control-Allow-Origin',origin);
      res.setHeader('Vary','Origin');
      res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');
      res.setHeader('Access-Control-Max-Age','600');
    }
    if(req.method==='OPTIONS'){res.writeHead(204);res.end();return false;}
    if(p==='/api/health'&&req.method==='GET'){reply(res,200,{ok:true,service:'bar-advisor',version:'1'});return false;}
    const auth=req.headers.authorization||'',token=auth.startsWith('Bearer ')?auth.slice(7):'';
    const serviceAccess=token.length>=40&&equal(token,master);
    if(!serviceAccess){reply(res,401,{error:'需要有效的后端访问凭证',code:'UNAUTHORIZED'});return false;}
    return true;
  };
}
