function sb(path, opts = {}) {
  const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!base || !key) {
    throw new Error('Supabase environment variables are missing');
  }

  return fetch(base + '/rest/v1/' + path, {
    ...opts,
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    }
  }).then(async (r) => {
    const text = await r.text();

    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {}

    if (!r.ok) {
      throw new Error(
        'Supabase rejected request: ' + r.status + ' ' + text
      );
    }

    return data;
  });
}

module.exports = async function handler(req, res) {
  const key = req.headers['x-stats-dashboard-key'];

  if (
    !process.env.STATS_DASHBOARD_KEY ||
    key !== process.env.STATS_DASHBOARD_KEY
  ) {
    return res.status(401).json({
      ok: false,
      error: 'Unauthorized'
    });
  }

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({
        ok: false,
        error: 'Method not allowed'
      });
    }

    const [overall, clients, quizzes, questions] =
      await Promise.all([
        sb('v_quiz_stats_overall?select=*'),
        sb('v_quiz_stats_by_client?select=*'),
        sb('v_quiz_stats_by_quiz?select=*'),
        sb('v_quiz_stats_by_question?select=*')
      ]);

    return res.status(200).json({
      ok: true,
      data: {
        overall: overall?.[0] || null,
        clients: clients || [],
        quizzes: quizzes || [],
        questions: questions || []
      }
    });

  } catch (e) {
    console.error('Statistics dashboard error:', e);

    return res.status(502).json({
      ok: false,
      error: e.message
    });
  }
};
