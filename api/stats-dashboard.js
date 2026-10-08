const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req,res){
  const key = req.headers['x-stats-dashboard-key'];
  if (!process.env.STATS_DASHBOARD_KEY || key !== process.env.STATS_DASHBOARD_KEY)
    return res.status(401).json({ok:false,error:'Unauthorized'});

  const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
  try{
    if(req.method==='GET'){
      const [overall,clients,quizzes,questions]=await Promise.all([
        supabase.from('v_quiz_stats_overall').select('*'),
        supabase.from('v_quiz_stats_by_client').select('*'),
        supabase.from('v_quiz_stats_by_quiz').select('*'),
        supabase.from('v_quiz_stats_by_question').select('*')
      ]);
      for(const x of [overall,clients,quizzes,questions]) if(x.error) throw x.error;
      return res.status(200).json({ok:true,data:{overall:overall.data?.[0]||null,clients:clients.data||[],quizzes:quizzes.data||[],questions:questions.data||[]}});
    }
    return res.status(405).json({ok:false,error:'Method not allowed'});
  }catch(e){return res.status(502).json({ok:false,error:e.message})}
};