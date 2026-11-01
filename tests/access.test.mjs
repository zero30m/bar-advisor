import { test } from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomBytes} from 'node:crypto';
test('remote API requires bearer; preflight, single-use activation and revocation work',async()=>{
 const dir=mkdtempSync(tmpdir()+'/bar-access-'), token=randomBytes(32).toString('hex'), port=14318;
 const p=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),DB_PATH:dir+'/db.sqlite',BAR_REMOTE_MODE:'1',BAR_API_TOKEN:token,DISABLE_JOBS:'1',CHATANYWHERE_API_KEY:''},stdio:'pipe'});
 const base=`http://127.0.0.1:${port}/api/`;
 try{
 await new Promise((ok,no)=>{p.stdout.on('data',d=>{if(String(d).includes('http://'))ok();});p.on('error',no);p.on('exit',c=>{if(c)no(Error('startup failed'));});});
 assert.equal((await fetch(base+'state')).status,401);
 const options=await fetch(base+'state',{method:'OPTIONS',headers:{Origin:'https://app.example','Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'}});
 assert.equal(options.status,204);assert.equal(options.headers.get('access-control-allow-origin'),'https://app.example');
 assert.equal((await fetch(base+'state',{headers:{Authorization:'Bearer '+token}})).status,200);
 const db=new DatabaseSync(dir+'/db.sqlite'),code=randomBytes(32).toString('hex');
 db.prepare('INSERT INTO activation_codes VALUES(?,?,0)').run(createHash('sha256').update(code).digest('hex'),Date.now()+60000);db.close();
 const exchange=()=>fetch(base+'session/exchange',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://app.example'},body:JSON.stringify({code})});
 const r=await exchange();assert.equal(r.status,200);const session=await r.json();assert.equal((await exchange()).status,401);
 const headers={Authorization:'Bearer '+session.token,Origin:'https://app.example'};
 assert.equal((await fetch(base+'state',{headers})).status,200);
 assert.equal((await fetch(base+'session/revoke',{method:'POST',headers})).status,200);
 assert.equal((await fetch(base+'state',{headers})).status,401);
 }finally{if(p.exitCode===null&&p.signalCode===null)await new Promise(r=>{p.once('exit',r);p.kill();});rmSync(dir,{recursive:true,force:true});}
});
