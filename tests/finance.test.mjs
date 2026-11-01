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
