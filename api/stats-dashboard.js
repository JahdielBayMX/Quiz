export default async function handler(req,res){
if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
const key=process.env.STATS_DASHBOARD_KEY;
if(!key||req.headers["x-stats-dashboard-key"]!==key)return res.status(401).json({error:"Unauthorized"});
const u=process.env.SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!u||!k)return res.status(503).json({error:"Statistics service is not configured"});
const q=req.query||{}, headers={apikey:k,Authorization:`Bearer ${k}`,Accept:"application/json"};
const esc=v=>encodeURIComponent(v);
const f=(name,val)=>val?`&${name}=eq.${esc(val)}`:"";
const filters=f("client_slug",q.client)+f("quiz_slug",q.quiz)+f("period_year",q.year)+f("period_month",q.month);
async function get(view,params=""){const r=await fetch(`${u}/rest/v1/${view}?${params}`,{headers});if(!r.ok)throw Error(`${view}: ${r.status} ${await r.text()}`);return r.json()}
try{
const [overall,clients,quizzes,periods,distribution,questions,wrong]=await Promise.all([
get("v_quiz_stats_overall","select=*"),
get("v_quiz_stats_by_client","select=*&order=total_attempts.desc"),
get("v_quiz_stats_by_quiz","select=*&order=total_attempts.desc"),
get("v_quiz_stats_by_period","select=*&order=period_year.desc&period_month.desc"),
get("v_quiz_stats_score_distribution","select=*&order=sort_order.asc"),
get("v_quiz_stats_by_question",`select=*&order=percent_correct.asc${filters}`),
get("v_quiz_stats_wrong_answers",`select=*&order=total_selected.desc${filters}`)
]);
let filteredOverall=overall;
if(q.client||q.quiz||q.year||q.month){
const rows=await get("quiz_attempts",`select=percent,duration_seconds,completed_at${filters}`);
const n=rows.length,a=n?rows.reduce((s,x)=>s+Number(x.percent||0),0)/n:0,d=n?rows.reduce((s,x)=>s+Number(x.duration_seconds||0),0)/n:0,o=rows.filter(x=>Number(x.percent)>=80).length,b=rows.filter(x=>Number(x.percent)<60).length;
filteredOverall=[{total_attempts:n,average_percent:+a.toFixed(2),average_duration_seconds:+d.toFixed(2),attempts_80_plus:o,percent_80_plus:n?+(o/n*100).toFixed(2):0,attempts_below_60:b,attempts_60_to_79:n-o-b,attempts_80_to_100:o}];
}
res.status(200).json({overall:filteredOverall,clients,quizzes,periods,distribution,questions,wrongAnswers:wrong});
}catch(e){console.error(e);res.status(502).json({error:"Could not load statistics",detail:e.message})}}
