import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reportFacts,reportSummary} from '../report-finance.mjs';
const store={name:'测试',investment:6000000,months:12};
test('fen are converted to yuan and model cannot replace deterministic financial facts',()=>{
 const input=reportFacts([{date:'2026-11-01',income:300000,expense:10000,note:''}],'2026-11-01',false,store);
 assert.equal(input.focus.cashDifferenceYuan,'2900.00');assert.equal(input.bills[0].incomeYuan,'3000.00');
 const output=reportSummary(input,'收入30万元，净利润29万元');
 assert.match(output,/收入3000.00元，支出100.00元，收支差额2900.00元/);assert.ok(!output.includes('万元'));
 const exact=reportFacts([{date:'2026-11-01',income:50000,expense:20000,note:''}],'2026-11-01',false,store);
 assert.match(reportSummary(exact,'利润三十万元'),/收支差额300.00元/);
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
test('weekly ratios require two complete periods and advice must cite an available evidence key',()=>{
 const rows=Array.from({length:14},(_,i)=>({date:'2026-10-'+String(i+1).padStart(2,'0'),income:i<7?10000:20000,expense:5000}));
 const f=reportFacts(rows,'2026-10-14',true,store);assert.equal(f.comparisons.previous.incomeChangePercent,'100.0');
 const output=reportSummary(f,{observations:[{evidenceId:'previous',interpretation:'收入趋势有所改善，需核查是否来自临时活动。',action:'对照活动记录与到店人数，区分客流和客单价变化。'}]});
 assert.match(output,/对照活动记录/);assert.match(output,/增长100.0%/);
 const bad=reportSummary(f,{observations:[{evidenceId:'fake',interpretation:'利润900万元',action:'继续投入'}]});assert.ok(!bad.includes('900万元'));
});

test('calendar without comparable sample cannot produce a claimed revenue expectation',()=>{
 const f=reportFacts([{date:'2026-11-01',income:30000,expense:0}],'2026-11-01',false,store);
 const text=reportSummary(f,{observations:[{evidenceId:'calendar',interpretation:'尽管周末收入仍低于预期。',action:'补齐历史同类型日期的账单再做判断。'}]});
 assert.ok(!text.includes('尽管周末'));assert.ok(text.includes('补齐历史'));
});
