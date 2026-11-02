import {businessDay} from './business-calendar.mjs';
export const REPORT_VERSION='operating-analysis-v3.1';
export const yuan=cents=>(cents/100).toFixed(2);
const shift=(date,n)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const days=(start,end)=>Math.round((new Date(end+'T00:00:00Z')-new Date(start+'T00:00:00Z'))/86400000)+1;
const sum=rows=>{const income=rows.reduce((n,r)=>n+r.income,0),expense=rows.reduce((n,r)=>n+r.expense,0);return {incomeYuan:yuan(income),expenseYuan:yuan(expense),cashDifferenceYuan:yuan(income-expense),recordedDays:rows.length};};
const pct=(a,b)=>b>0?((a-b)/b*100).toFixed(1):null;
const display=n=>Number(n).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})+'元';
const direction=p=>Number(p)>=0?'增长'+p+'%':'下降'+Math.abs(Number(p)).toFixed(1)+'%';
function priorYear(date){const candidate=(Number(date.slice(0,4))-1)+date.slice(4);return new Date(candidate+'T00:00:00Z').toISOString().slice(0,10)===candidate?candidate:null;}
export function reportFacts(rows,date,weekly,store){
 const range=(from,to)=>rows.filter(r=>r.date>=from&&r.date<=to);
 const focusStart=shift(date,weekly?-6:0),focusRows=range(focusStart,date),selected=range(shift(date,-27),date),focus=sum(focusRows);
 const calendar=businessDay(date),evidence={};
 evidence.overview=`${weekly?'近7天已记录'+focus.recordedDays+'天':'当日'}收入${focus.incomeYuan}元，支出${focus.expenseYuan}元，收支差额${focus.cashDifferenceYuan}元。`;
 if(!weekly&&!focus.recordedDays)evidence.overview='当日尚未记账，不以零收入代替缺失记录。';
 const compare=(id,label,from,to)=>{
  const oldRows=from&&to?range(from,to):[],old=sum(oldRows),expected=weekly?7:1,complete=focus.recordedDays===expected&&old.recordedDays===expected;
  const result={label,from,to,current:focus,previous:old,complete,incomeChangePercent:complete?pct(Number(focus.incomeYuan),Number(old.incomeYuan)):null};
  if(!complete){evidence[id]=`${label}暂不可算（本期${focus.recordedDays}/${expected}天、对照期${old.recordedDays}/${expected}天有账；未记账不按零营业额处理）。`;}
  else{
   const change=result.incomeChangePercent;
   const incomeDelta=Number(focus.incomeYuan)-Number(old.incomeYuan),expenseDelta=Number(focus.expenseYuan)-Number(old.expenseYuan);
   const diff=(Number(focus.cashDifferenceYuan)-Number(old.cashDifferenceYuan)).toFixed(2);
   evidence[id]=`${label}：收入${change===null?'增加'+display(incomeDelta)+'（对照期为零，不计算增长率）':direction(change)}，支出${expenseDelta>=0?'增加':'减少'}${display(Math.abs(expenseDelta))}，收支差额较对照期${Number(diff)>=0?'增加':'减少'}${display(Math.abs(Number(diff)))}。`;
   if(!weekly&&from){const previousDay=businessDay(from);if(previousDay.type!==calendar.type||previousDay.holiday!==calendar.holiday)evidence[id]+='两日客流日历类型不同，不能把变化直接归因于经营能力。';}
  }
  return result;
 };
 const comparisons={};
 if(weekly)comparisons.previous=compare('previous','较前7天',shift(date,-13),shift(date,-7));
 else{comparisons.previous=compare('previous','较前一天',shift(date,-1),shift(date,-1));comparisons.sameWeekday=compare('sameWeekday','较上周同日',shift(date,-7),shift(date,-7));}
 const yearEnd=priorYear(date),yearStart=priorYear(focusStart);
 comparisons.year=compare('year',weekly?'较去年同日期区间':'较去年同日',yearStart,yearEnd);
 if(yearEnd)evidence.year+='公历同期不保证农历节庆或星期一致。';
 const monthStart=date.slice(0,8)+'01',monthDays=new Date(Date.UTC(Number(date.slice(0,4)),Number(date.slice(5,7)),0)).getUTCDate(),elapsed=Number(date.slice(8));
 const monthRows=range(monthStart,date),month=sum(monthRows),remaining=monthDays-elapsed;
 const monthCoverage=month.recordedDays===elapsed;
 const investment=Number(store.investment)||0,months=Number(store.months)||12,monthlyProfit=investment>0?investment/months:null;
 const scenarios=monthlyProfit===null?[]:[0.10,0.15,0.20].map(margin=>{
  const revenue=monthlyProfit/margin,gap=Math.max(0,revenue-Number(month.incomeYuan));
  return {netMarginPercent:margin*100,monthlyRevenueTargetYuan:revenue.toFixed(2),progressPercent:(Number(month.incomeYuan)/revenue*100).toFixed(2),remainingRevenueYuan:gap.toFixed(2),remainingDailyRevenueYuan:monthCoverage&&remaining>0?(gap/remaining).toFixed(2):null};
 });
 const payback={investmentYuan:investment.toFixed(2),targetMonths:months,monthlyNetProfitTargetYuan:monthlyProfit?.toFixed(2)??null,scenarios};
 if(monthlyProfit!==null){
  evidence.target=`按投资${display(investment)}、目标${months}个月回本，月净利润目标${display(monthlyProfit)}。以净利率10%作为测算假设，月营业额目标${display(scenarios[0].monthlyRevenueTargetYuan)}；15%和20%情景分别为${display(scenarios[1].monthlyRevenueTargetYuan)}和${display(scenarios[2].monthlyRevenueTargetYuan)}。`;
  const base=scenarios[0];evidence.month=`本月截至${date}已记${month.recordedDays}/${elapsed}天，累计收入${display(month.incomeYuan)}，达到10%净利率情景营业额目标的${base.progressPercent}%，日历进度${(elapsed/monthDays*100).toFixed(1)}%。`;
  evidence.month+=monthCoverage?(remaining>0?`若以整月目标执行，余下${remaining}个自然日日均需${display(base.remainingDailyRevenueYuan)}（不是营业日预测）。`:'本月已结束，可对照目标复盘。'):'本月存在未记账日期，不能据此判断真实达标进度或外推月底收入。';
  const benchmark=Number(scenarios[0].monthlyRevenueTargetYuan);
  evidence.sensitivity=`若月营业额保持在${display(benchmark)}，净利率10%、15%、20%对应的静态回本期约为${months.toFixed(1)}、${(investment/(benchmark*.15)).toFixed(1)}、${(investment/(benchmark*.2)).toFixed(1)}个月；不代表实际回本承诺。`;
 }else{evidence.target='尚未填写有效投资额，暂不计算回本目标。';evidence.month=`本月截至${date}已记${month.recordedDays}/${elapsed}天，累计收入${display(month.incomeYuan)}。`;}
 const dayTypes={};for(let i=weekly?6:0;i>=0;i--){const d=businessDay(shift(date,-i));dayTypes[d.label]=(dayTypes[d.label]||0)+1;}
 const sameType=range(shift(date,-28),shift(date,-1)).filter(r=>businessDay(r.date).calendarVerified&&businessDay(r.date).type===calendar.type);
 evidence.calendar=weekly?'本期日历构成：'+Object.entries(dayTypes).map(([label,n])=>label+n+'天').join('、')+'。':`${date}为${calendar.weekday}，${calendar.label}。`;
 if(!calendar.calendarVerified)evidence.calendar+='该年份节假日安排尚未核验，不能确定法定假期或调休。';
 if(!weekly&&sameType.length>=3&&calendar.calendarVerified&&focus.recordedDays){
  const avg=Number(sum(sameType).incomeYuan)/sameType.length,p=pct(Number(focus.incomeYuan),avg);
  evidence.calendar+=`此前28天有${sameType.length}个同类型已记账日，日均收入${display(avg)}；当日${p===null?'对照基数为零':direction(p)}。样本不等于完整营业记录。`;
 }
 return {version:REPORT_VERSION,currency:'CNY',moneyUnit:'人民币元，所有金额已换算，禁止再次乘除100或10000',date,weekly,period:weekly?'近7天':'当日及近28天',focus,history:sum(selected),calendar,comparisons,month:{...month,elapsedDays:elapsed,calendarDays:monthDays,complete:monthCoverage},payback,evidence,
  bills:selected.map(r=>({date:r.date,incomeYuan:yuan(r.income),expenseYuan:yuan(r.expense),cashDifferenceYuan:yuan(r.income-r.expense),note:r.note,calendar:businessDay(r.date)})),
  store:{name:store.name,investmentYuan:investment.toFixed(2),targetMonths:months}};
}
export function reportSummary(input, output){
 const e=input.evidence;
 const sections=[e.overview,e.calendar,[e.previous,e.sameWeekday,e.year].filter(Boolean).join(''),e.target+e.month+(e.sensitivity||'')];
 const observations=Array.isArray(output?.observations)?output.observations:[];
 const safe=text=>typeof text==='string'&&text.length>3&&text.length<=160&&!/[\d%％万元亿]|仅运营|刚开业|初始阶段|提升顾客体验|强化员工培训|无酒精|口味匹配/u.test(text);
 const valid=observations.filter(o=>o&&e[o.evidenceId]).map(o=>({interpretation:safe(o.interpretation)&&!e[o.evidenceId].includes('暂不可算')&&(o.evidenceId!=='calendar'||e.calendar.includes('日均收入'))?o.interpretation:'',action:safe(o.action)?o.action:''})).filter(o=>o.action).slice(0,2);
 if(valid.length)sections.push(valid.map(o=>o.interpretation+'建议：'+o.action).join(''));
 else{
  const advice=[];
  if(!input.comparisons.previous.complete)advice.push('先补齐对照期账单，或核实缺失日期是否停业，再判断营业变化。');
  if(!input.month.complete)advice.push('当月仍有漏记日期，应先对账补齐，不能把已记录金额直接作为完整经营进度。');
  else if(input.payback.scenarios.length&&Number(input.payback.scenarios[0].progressPercent)<input.month.elapsedDays/input.month.calendarDays*100)advice.push('已记录收入低于均匀日历进度参考，先核对后续周末及节日的预订，拆解客流和客单价需求，而非只靠降价追营业额。');
  if(Number(input.focus.cashDifferenceYuan)<0)advice.push('本期支出高于收入，先区分集中采购、固定支出和一次性付款，再决定是否压缩可变支出。');
  if(!advice.length)advice.push('结合对照期活动记录核查收入变化来源，并核对采购、房租与人工的付款时点是否扭曲当期差额。');
  sections.push(advice.slice(0,2).join(''));
 }
 sections.push('口径：已记录收支差额用于现金观察；回本情景需以扣齐成本后的净利润验证，10%不是实际净利率。');
 return sections.join('\n\n');
}
