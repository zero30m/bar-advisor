import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reportFacts,reportSummary} from '../report-finance.mjs';
const store={name:'测试',investment:6000000,months:12};
test('fen are converted to yuan and model cannot replace deterministic financial facts',()=>{
 const input=reportFacts([{date:'2026-11-01',income:300000,expense:10000,note:''}],'2026-11-01',false,store);
 assert.equal(input.focus.cashDifferenceYuan,'2900.00');assert.equal(input.bills[0].incomeYuan,'3000.00');
 const output=reportSummary(input,'收入30万元，净利润29万元');
 assert.match(output,/收入3000元，支出100元，账面还剩2900元/);assert.ok(!output.includes('收入30万元'));
 const exact=reportFacts([{date:'2026-11-01',income:50000,expense:20000,note:''}],'2026-11-01',false,store);
 assert.match(reportSummary(exact,'利润三十万元'),/账面还剩300元/);
});
test('weekly sum includes only seven Shanghai business dates, preserves cents and negatives',()=>{
 const rows=[{date:'2026-10-25',income:999999,expense:0},{date:'2026-10-26',income:101,expense:202},{date:'2026-11-01',income:100,expense:0}];
 const weekly=reportFacts(rows,'2026-11-01',true,store);
 assert.equal(weekly.focus.recordedDays,2);assert.equal(weekly.focus.cashDifferenceYuan,'-0.01');
 const daily=reportFacts(rows,'2026-11-01',false,store);assert.equal(daily.focus.incomeYuan,'1.00');
});
import {businessDay} from '../business-calendar.mjs';
test('comparisons use exact dates, never convert missing records or zero denominators to percentages',()=>{
 const rows=[{date:'2025-11-02',income:100000,expense:50000},{date:'2026-10-26',income:200000,expense:50000},{date:'2026-11-01',income:0,expense:10000},{date:'2026-11-02',income:300000,expense:10000}];
 const f=reportFacts(rows,'2026-11-02',false,store);
 assert.equal(f.comparisons.previous.incomeChangePercent,null);
 assert.equal(f.comparisons.sameWeekday.incomeChangePercent,'50.0');
 assert.equal(f.comparisons.year.incomeChangePercent,'200.0');
 const missing=reportFacts(rows.slice(-1),'2026-11-02',false,store);
 assert.equal(missing.comparisons.previous.complete,false);assert.match(missing.evidence.previous,/暂不可算/);
});
test('investment and months drive 10/15/20 percent scenarios without using cash difference as net profit',()=>{
 const f=reportFacts([{date:'2026-11-02',income:300000,expense:0}],'2026-11-02',false,store);
 assert.equal(f.payback.monthlyNetProfitTargetYuan,'500000.00');
 assert.deepEqual(f.payback.scenarios.map(s=>s.monthlyRevenueTargetYuan),['5000000.00','3333333.33','2500000.00']);
 assert.equal(f.payback.scenarios[0].remainingDailyRevenueYuan,null); // missing Nov 1
 assert.match(f.evidence.sensitivity,/12.0、8.0、6.0个月/);
 const changed=reportFacts([],'2026-11-02',false,{...store,months:24});assert.equal(changed.payback.monthlyNetProfitTargetYuan,'250000.00');
});
test('official holiday, makeup workday and unknown future calendars are distinct',()=>{
 assert.equal(businessDay('2026-10-01').holiday,'国庆节');
 assert.equal(businessDay('2026-10-10').type,'makeup');
 assert.equal(businessDay('2026-11-01').type,'weekend');
 assert.equal(businessDay('2030-10-01').calendarVerified,false);
});
test('complete comparisons stay available but concise narrative uses validated number tokens',()=>{
 const rows=Array.from({length:14},(_,i)=>({date:'2026-10-'+String(i+1).padStart(2,'0'),income:i<7?10000:20000,expense:5000}));
 const f=reportFacts(rows,'2026-10-14',true,store);assert.equal(f.comparisons.previous.incomeChangePercent,'100.0');
 const output=reportSummary(f,{summary:'这周收入{{income}}，支出{{expense}}，账面还剩{{balance}}。收入较前周{{previousChange}}，可以看看哪场活动带来了更多收入。'});
 assert.match(output,/增长100.0%/);assert.ok(!output.includes('{{'));
});
test('short reports reject invented amounts and remove defensive boilerplate',()=>{
 const f=reportFacts([{date:'2026-11-01',income:300000,expense:10000}],'2026-11-02',true,{...store,investment:300000});
 const summary=reportSummary(f,{summary:'收入{{income}}，支出{{expense}}，净赚30万元。'});
 assert.match(summary,/收入3000元/);assert.ok(summary.length<220);assert.ok(!/口径|同比|日历进度|不代表|净赚30万元/.test(summary));
 const clean=reportSummary(f,{summary:'这周目前记了{{days}}天账，收入{{income}}，支出{{expense}}，账面还剩{{balance}}。先把剩下的账补齐，再看整周生意怎么样。'});
 assert.match(clean,/记了1天账/);
});
