export const REPORT_VERSION = 'yuan-facts-v2';
export const yuan = cents => (cents / 100).toFixed(2);
export function reportFacts(rows, date, weekly, store) {
  const start=new Date(date+'T00:00:00Z');start.setUTCDate(start.getUTCDate()-(weekly?6:27));
  const selected=rows.filter(r=>r.date>=start.toISOString().slice(0,10)&&r.date<=date);
  const sum=rs=>{const income=rs.reduce((n,r)=>n+r.income,0),expense=rs.reduce((n,r)=>n+r.expense,0);return {incomeYuan:yuan(income),expenseYuan:yuan(expense),cashDifferenceYuan:yuan(income-expense),recordedDays:rs.length};};
  return {version:REPORT_VERSION,currency:'CNY',moneyUnit:'元（不是分，也不是万元）',date,period:weekly?'近7天':'当日及近28天',weekly,
    focus:sum(weekly?selected:selected.filter(r=>r.date===date)),history:sum(selected),
    bills:selected.map(r=>({date:r.date,incomeYuan:yuan(r.income),expenseYuan:yuan(r.expense),cashDifferenceYuan:yuan(r.income-r.expense),note:r.note})),
    store:{name:store.name,investmentYuan:Number(store.investment).toFixed(2),targetMonths:store.months}};
}
export function reportSummary(input, advice) {
  const f=input.focus;
  const facts=f.recordedDays?`${input.weekly?'近7天已记录'+f.recordedDays+'天':'当日'}收入${f.incomeYuan}元，支出${f.expenseYuan}元，收支差额${f.cashDifferenceYuan}元。`:'当日尚未记账。';
  // The model cannot introduce numerical facts or financial units into the advice.
  const valid=typeof advice==='string'&&advice.length<=200&&!/[\d零〇一二两三四五六七八九十百千万亿元角分%％]/u.test(advice);
  const fallback=Number(f.cashDifferenceYuan)<0?'建议核查采购和固定开支，结合客流调整备货。':'建议补齐采购和固定开支记录，结合客流安排备货。';
  return facts+'收支差额不等于完整净利润。'+(valid?advice:fallback);
}
