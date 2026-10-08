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

function query(params){
  const filters=[];
  if(params.client) filters.push('client_slug=eq.'+enc(params.client));
  if(params.quiz) filters.push('quiz_slug=eq.'+enc(params.quiz));
  if(params.year) filters.push('period_year=eq.'+enc(params.year));
  if(params.month) filters.push('period_month=eq.'+enc(params.month));
  return filters.length ? '&'+filters.join('&') : '';
}

module.exports = async function handler(req,res){
  const key=req.headers['x-stats-dashboard-key'];

  if(!process.env.STATS_DASHBOARD_KEY || key!==process.env.STATS_DASHBOARD_KEY)
    return res.status(401).json({ok:false,error:'Unauthorized'});

  if(req.method!=='GET')
    return res.status(405).json({ok:false,error:'Method not allowed'});

  try{
    const p=req.query||{};
    const filter=query(p);

    const attempts=await sb(
      'quiz_attempts?select=*'+filter+'&order=completed_at.desc'
    );

    const attemptIds=attempts.map(x=>x.attempt_id);
    let answers=[];

    if(attemptIds.length){
      const idFilter=attemptIds.map(id=>enc(id)).join(',');
      answers=await sb(
        'quiz_answers?select=*&attempt_id=in.('+idFilter+')&order=id.asc'
      );
    }

    const totalAttempts=attempts.length;
    const totalCorrect=attempts.reduce((s,x)=>s+(Number(x.correct)||0),0);
    const totalAnswers=answers.length;
    const avgPercent=totalAttempts
      ? Math.round(attempts.reduce((s,x)=>s+(Number(x.percent)||0),0)/totalAttempts)
      : 0;

    const quizMap=new Map();
    for(const a of attempts){
      const k=[a.client_slug,a.quiz_slug].join('|');
      if(!quizMap.has(k)){
        quizMap.set(k,{
          client_slug:a.client_slug,
          client_name:a.client_name,
          quiz_slug:a.quiz_slug,
          quiz_title:a.quiz_title,
          attempts:0,
          total_correct:0,
          total_answers:0
        });
      }
      const q=quizMap.get(k);
      q.attempts++;
      q.total_correct+=Number(a.correct)||0;
    }

    const quizzes=[...quizMap.values()].map(q=>({
      ...q,
      avg_percent:q.attempts?Math.round((q.total_correct/q.attempts)*10)/10:0
    }));

    const clientMap=new Map();
    for(const a of attempts){
      const k=a.client_slug||'';
      if(!clientMap.has(k)){
        clientMap.set(k,{
          client_slug:k,
          client_name:a.client_name,
          attempts:0,
          total_correct:0
        });
      }
      const c=clientMap.get(k);
      c.attempts++;
      c.total_correct+=Number(a.correct)||0;
    }

    const clients=[...clientMap.values()];

    const questionMap=new Map();
    const attemptById=new Map(attempts.map(a=>[a.attempt_id,a]));

    for(const a of answers){
      const attempt=attemptById.get(a.attempt_id);
      if(!attempt)continue;

      const k=[
        attempt.client_slug,
        attempt.quiz_slug,
        a.question_id||a.question_text
      ].join('|');

      if(!questionMap.has(k)){
        questionMap.set(k,{
          client_id:attempt.client_id,
          client_slug:attempt.client_slug,
          client_name:attempt.client_name,
          quiz_id:attempt.quiz_id,
          quiz_slug:attempt.quiz_slug,
          quiz_title:attempt.quiz_title,
          question_id:a.question_id,
          question_text:a.question_text,
          attempts:0,
          correct:0
        });
      }

      const q=questionMap.get(k);
      q.attempts++;
      if(a.is_correct)q.correct++;
    }

    const questions=[...questionMap.values()].map(q=>({
      ...q,
      percent_correct:q.attempts?Math.round(q.correct/q.attempts*100):0
    }));

    const allAttempts=await sb(
      'quiz_attempts?select=client_slug,client_name,quiz_slug,quiz_title,period_year,period_month'
    );

    const allClients=[
      ...new Map(
        allAttempts.map(x=>[
          x.client_slug,
          {value:x.client_slug,label:x.client_name||x.client_slug}
        ])
      ).values()
    ];

    // Include client_slug in quiz options so the client -> quiz dependency
    // can be enforced correctly in the browser.
    const allQuizzes=[
      ...new Map(
        allAttempts.map(x=>[
          [x.client_slug,x.quiz_slug].join('|'),
          {
            value:x.quiz_slug,
            label:x.quiz_title||x.quiz_slug,
            client_slug:x.client_slug
          }
        ])
      ).values()
    ];

    const allYears=[
      ...new Set(allAttempts.map(x=>x.period_year).filter(x=>x!=null))
    ].sort((a,b)=>b-a);

    const allMonths=[
      ...new Set(allAttempts.map(x=>x.period_month).filter(Boolean))
    ];

    return res.status(200).json({
      ok:true,
      data:{
        overall:{
          attempts:totalAttempts,
          avg_percent:avgPercent,
          total_correct:totalCorrect,
          total_answers:totalAnswers
        },
        clients,
        quizzes,
        questions,
        options:{
          clients:allClients,
          quizzes:allQuizzes,
          years:allYears,
          months:allMonths
        }
      }
    });
  }catch(e){
    console.error('Statistics dashboard error:',e);
    return res.status(502).json({ok:false,error:e.message});
  }
};
