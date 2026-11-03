import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const block=app.slice(app.indexOf('function reportMarkup('),app.indexOf('function renderBills('));
const ctx=vm.createContext({selected:'2026-11-03',state:{bills:[{date:'2026-11-01',income:30000,expense:0},{date:'2026-11-03',income:0,expense:10000}]}});
vm.runInContext(`const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); const money=n=>String(n/100);const signed=n=>(n>=0?'+':'−')+money(Math.abs(n));`+block,ctx);
test('report renderer preserves AI paragraphs and bold, escapes executable markup',()=>{
 const output=vm.runInContext('reportMarkup("收入**300元**。\\n\\n<script>alert(1)</script>")',ctx);
 assert.match(output,/<strong class="report-number">300元<svg/); assert.match(output,/&lt;script&gt;/); assert.equal((output.match(/<p>/g)||[]).length,2);assert.ok(!output.includes('<script>'));
});
test('chart preserves missing dates and does not connect separate observations',()=>{
 const output=vm.runInContext('profitChart()',ctx);
 assert.equal((output.match(/class="profit-dot"/g)||[]).length,2);
 assert.ok(!output.includes('class="profit-line"'));assert.match(output,/\+200 元/);assert.match(output,/11\/02/);assert.match(output,/已记 2 天/);
});
