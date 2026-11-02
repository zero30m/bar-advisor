// Official State Council schedules; unknown years are explicitly unverified.
// 2025: https://www.forestry.gov.cn/c/www/szxx/594663.jhtml
// 2026: https://www.beijing.gov.cn/cs/gncs/zcwj/202603/t20260327_4568275.html
const schedules={
  2025:{holidays:[['01-01','01-01','元旦'],['01-28','02-04','春节'],['04-04','04-06','清明节'],['05-01','05-05','劳动节'],['05-31','06-02','端午节'],['10-01','10-08','国庆中秋假期']],work:['01-26','02-08','04-27','09-28','10-11']},
  2026:{holidays:[['01-01','01-03','元旦'],['02-15','02-23','春节'],['04-04','04-06','清明节'],['05-01','05-05','劳动节'],['06-19','06-21','端午节'],['09-25','09-27','中秋节'],['10-01','10-07','国庆节']],work:['01-04','02-14','02-28','05-09','09-20','10-10']}
};
export function businessDay(date){
 const weekday=new Date(date+'T00:00:00Z').getUTCDay(),schedule=schedules[date.slice(0,4)],md=date.slice(5);
 const holiday=schedule?.holidays.find(([from,to])=>md>=from&&md<=to)?.[2]||null;
 const makeup=!!schedule?.work.includes(md),weekend=weekday===0||weekday===6;
 const type=holiday?'holiday':makeup?'makeup':weekend?'weekend':'weekday';
 return {date,weekday:'周'+'日一二三四五六'[weekday],weekend,holiday,makeup,calendarVerified:!!schedule,type,label:holiday|| (makeup?'调休工作日':weekend?'周末':'工作日')};
}
