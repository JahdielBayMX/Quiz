function rpc(name,body){
  const base=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!base||!key) throw Error('Supabase environment variables are missing');
  return fetch(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body)}).then(async r=>{
    const text=await r.text(); let data=null; try{data=text?JSON.parse(text):null}catch{}
    if(!r.ok) throw Error('Supabase rejected request: '+r.status+' '+text);
    return data;
  });
}
module.exports=async function(req,res){
  const key=req.headers['x-stats-dashboard-key'];
  if(!process.env.STATS_DASHBOARD_KEY||key!==process.env.STATS_DASHBOARD_KEY) return res.status(401).json({ok:false,error:'Unauthorized'});
  if(req.method!=='POST') return res.status(405).json({ok:false,error:'Method not allowed'});
  try{
    const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    if(!['quiz','client','all'].includes(b.scope)) return res.status(400).json({ok:false,error:'Invalid scope'});
    if(b.scope!=='all'&&!b.value) return res.status(400).json({ok:false,error:'Value required'});
    const d=await rpc('create_stats_cut',{p_scope:b.scope,p_value:b.value||null});
    return res.status(200).json({ok:true,data:{resetAt:d?.resetAt||d?.reset_at||new Date().toISOString()}});
  }catch(e){ console.error('Statistics reset error:',e); return res.status(502).json({ok:false,error:e.message}); }
};
