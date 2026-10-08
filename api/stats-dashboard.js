module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const expectedKey = String(process.env.STATS_DASHBOARD_KEY || '');
  const suppliedKey = String(req.headers['x-stats-dashboard-key'] || '');
  if (!expectedKey || suppliedKey !== expectedKey) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
  if (!supabaseUrl || !serviceKey) {
    return res.status(503).json({ ok: false, error: 'Statistics storage is not configured' });
  }

  try {
    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    };

    const [overall, clients, quizzes, periods, distribution] = await Promise.all([
      fetchView('v_quiz_stats_overall', headers),
      fetchView('v_quiz_stats_by_client', headers, 'order=total_attempts.desc'),
      fetchView('v_quiz_stats_by_quiz', headers, 'order=total_attempts.desc'),
      fetchView('v_quiz_stats_by_period', headers, 'order=period_year.desc&period_month.desc'),
      fetchView('v_quiz_stats_score_distribution', headers, 'order=sort_order.asc')
    ]);

    return res.status(200).json({
      ok: true,
      data: {
        overall: overall[0] || null,
        clients,
        quizzes,
        periods,
        distribution
      }
    });
  } catch (error) {
    console.error('Statistics dashboard error:', error);
    return res.status(502).json({ ok: false, error: 'Could not load statistics' });
  }

  async function fetchView(view, headers, query = '') {
    const url = `${supabaseUrl}/rest/v1/${view}${query ? `?${query}` : ''}`;
    const response = await fetch(url, { headers });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.error(`Supabase dashboard error (${view}):`, response.status, data);
      throw new Error(`Supabase rejected ${view}`);
    }
    return Array.isArray(data) ? data : [];
  }
};
