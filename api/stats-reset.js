const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req,res){
  const key=req.headers['x-stats-dashboard-key'];
  if(req.method!=='POST') return res.status(405).json({ok:false,error:'Method not allowed'});
  if(!process.env.STATS_DASHBOARD_KEY || key!==process.env.STATS_DASHBOARD_KEY) return res.status(401).json({ok:false,error:'Unauthorized'});
  try{
    const {scope,value}=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    if(!['quiz','client','all'].includes(scope)) return res.status(400).json({ok:false,error:'Invalid scope'});
    const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
    // Requires the SQL function below to be installed in Supabase.
    const {data,error}=await supabase.rpc('create_stats_cut',{p_scope:scope,p_value:value||null});
    if(error) throw error;
    return res.status(200).json({ok:true,data:{resetAt:data?.resetAt||data?.reset_at||new Date().toISOString()}});
  }catch(e){return res.status(502).json({ok:false,error:e.message})}
};