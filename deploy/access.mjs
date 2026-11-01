import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
const digest = s => createHash('sha256').update(s).digest('hex');
const equal = (a,b) => timingSafeEqual(Buffer.from(digest(a)),Buffer.from(digest(b)));
export function accessGate(db) {
  const master = process.env.BAR_API_TOKEN;
  if (!master || master.length < 40) throw new Error('BAR_API_TOKEN must contain at least 40 characters');
  db.exec(`CREATE TABLE IF NOT EXISTS device_sessions(hash TEXT PRIMARY KEY, created INTEGER NOT NULL, expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS activation_codes(hash TEXT PRIMARY KEY, expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);`);
  const limits = new Map();
  function limited(ip) {
    const now=Date.now(), old=limits.get(ip);
    if(limits.size>10000) limits.clear();
    if(!old||old.until<now){limits.set(ip,{n:1,until:now+60000});return false;}
    return ++old.n>10;
  }
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
    if(p==='/api/session/exchange'&&req.method==='POST'){
      if(limited(req.headers['x-real-ip']||req.socket.remoteAddress)){reply(res,429,{error:'Too many attempts'});return false;}
      let raw='';for await(const c of req){raw+=c;if(raw.length>1000){reply(res,413,{error:'Payload too large'});return false;}}
      let code;try{code=JSON.parse(raw).code;}catch{}
      if(typeof code!=='string'||code.length>200){reply(res,400,{error:'Invalid activation code'});return false;}
      const now=Date.now(),token=randomBytes(32).toString('base64url'),expires=now+90*86400000;
      db.exec('BEGIN IMMEDIATE');
      try{
        const used=db.prepare('UPDATE activation_codes SET used=1 WHERE hash=? AND used=0 AND expires>?').run(digest(code),now);
        if(used.changes!==1){db.exec('ROLLBACK');reply(res,401,{error:'Activation code expired or already used'});return false;}
        db.prepare('INSERT INTO device_sessions VALUES(?,?,?)').run(digest(token),now,expires);
        db.exec('COMMIT');
      }catch(e){db.exec('ROLLBACK');throw e;}
      reply(res,200,{token,expiresAt:new Date(expires).toISOString()});return false;
    }
    const auth=req.headers.authorization||'',token=auth.startsWith('Bearer ')?auth.slice(7):'';
    const serviceAccess=token.length>=40&&equal(token,master);
    const deviceAccess=token.length>=40&&db.prepare('SELECT 1 FROM device_sessions WHERE hash=? AND expires>?').get(digest(token),Date.now());
    if(!serviceAccess&&!deviceAccess){reply(res,401,{error:'需要有效的后端访问凭证',code:'UNAUTHORIZED'});return false;}
    if(p==='/api/session/revoke'&&req.method==='POST'){
      if(deviceAccess)db.prepare('DELETE FROM device_sessions WHERE hash=?').run(digest(token));
      reply(res,200,{ok:true});return false;
    }
    return true;
  };
}
