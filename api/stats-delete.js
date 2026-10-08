function sb(path, opts = {}) {
  const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!base || !key) throw new Error('Supabase environment variables are missing');

  return fetch(base + '/rest/v1/' + path, {
    ...opts,
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    }
  }).then(async r => {
    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!r.ok) throw new Error('Supabase rejected request: ' + r.status + ' ' + text);
    return data;
  });
}

function enc(v){ return encodeURIComponent(v); }

module.exports = async function handler(req,res){
  const key=req.headers['x-stats-dashboard-key'];

  if(!process.env.STATS_DASHBOARD_KEY || key!==process.env.STATS_DASHBOARD_KEY)
    return res.status(401).json({ok:false,error:'Unauthorized'});

  if(req.method!=='POST')
    return res.status(405).json({ok:false,error:'Method not allowed'});

  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});
    const scope=body.scope;
    const value=body.value;

    if(!['quiz','client','all'].includes(scope))
      return res.status(400).json({ok:false,error:'Invalid scope'});

    if(scope!=='all'&&!value)
      return res.status(400).json({ok:false,error:'Value required'});

    let filter='';
    if(scope==='quiz') filter='quiz_slug=eq.'+enc(value);
    if(scope==='client') filter='client_slug=eq.'+enc(value);

    const attempts=await sb(
      'quiz_attempts?select=attempt_id'+(filter?'&'+filter:'')
    );

    const ids=attempts.map(x=>x.attempt_id);
    let deletedAnswers=0;
    let deletedAttempts=0;

    if(ids.length){
      const idFilter=ids.map(id=>enc(id)).join(',');

      const answerRows=await sb(
        'quiz_answers?select=id&attempt_id=in.('+idFilter+')'
      );

      if(answerRows.length){
        await sb(
          'quiz_answers?attempt_id=in.('+idFilter+')',
          {method:'DELETE',headers:{Prefer:'return=minimal'}}
        );
        deletedAnswers=answerRows.length;
      }

      await sb(
        'quiz_attempts?attempt_id=in.('+idFilter+')',
        {method:'DELETE',headers:{Prefer:'return=minimal'}}
      );
      deletedAttempts=ids.length;
    }

    return res.status(200).json({
      ok:true,
      data:{deletedAttempts,deletedAnswers}
    });
  }catch(e){
    console.error('Statistics delete error:',e);
    return res.status(502).json({ok:false,error:e.message});
  }
};
