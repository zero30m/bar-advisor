import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'node:crypto';
const db=new DatabaseSync(process.env.DB_PATH||'private/bar.sqlite');
const code=randomBytes(32).toString('base64url');
db.prepare('INSERT INTO activation_codes(hash,expires,used) VALUES(?,?,0)').run(createHash('sha256').update(code).digest('hex'),Date.now()+7*86400000);
console.log(code);
