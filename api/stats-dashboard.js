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

  const q = req.query || {};
  const filter = (field, value) => value ? `&${field}=eq.${encodeURIComponent(value)}` : '';
  const filters =
    filter('client_slug', q.client) +
    filter('quiz_slug', q.quiz) +
    filter('period_year', q.year) +
    filter('period_month', q.month);

  try {
    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    };

    const [clients, quizzes, periods, distribution, questions, wrongAnswers] =
      await Promise.all([
        fetchView('v_quiz_stats_by_client', headers, 'order=total_attempts.desc'),
        fetchView('v_quiz_stats_by_quiz', headers, 'order=total_attempts.desc'),
        fetchView('v_quiz_stats_by_period', headers, 'order=period_year.desc&period_month.desc'),
        fetchView('v_quiz_stats_score_distribution', headers, 'order=sort_order.asc'),
        fetchView('v_quiz_stats_by_question', headers, `order=percent_correct.asc${filters}`),
        fetchView('v_quiz_stats_wrong_answers', headers, `order=total_selected.desc${filters}`)
      ]);

    let overall;
    if (q.client || q.quiz || q.year || q.month) {
      const attempts = await fetchView(
        'quiz_attempts',
        headers,
        `select=percent,duration_seconds,completed_at${filters}`
      );
      const total = attempts.length;
      const avg = total ? attempts.reduce((s, r) => s + Number(r.percent || 0), 0) / total : 0;
      const avgDuration = total ? attempts.reduce((s, r) => s + Number(r.duration_seconds || 0), 0) / total : 0;
      const over80 = attempts.filter(r => Number(r.percent || 0) >= 80).length;
      const below60 = attempts.filter(r => Number(r.percent || 0) < 60).length;

      overall = [{
        total_attempts: total,
        average_percent: Number(avg.toFixed(2)),
        average_duration_seconds: Number(avgDuration.toFixed(2)),
        attempts_80_plus: over80,
        percent_80_plus: total ? Number((over80 / total * 100).toFixed(2)) : 0,
        attempts_below_60: below60,
        attempts_60_to_79: total - over80 - below60,
        attempts_80_to_100: over80
      }];
    } else {
      overall = await fetchView('v_quiz_stats_overall', headers);
    }

    return res.status(200).json({
      ok: true,
      data: { overall: overall[0] || null, clients, quizzes, periods, distribution, questions, wrongAnswers }
    });
  } catch (error) {
    console.error('Statistics dashboard error:', error);
    return res.status(502).json({ ok: false, error: 'Could not load statistics', detail: error.message });
  }

  async function fetchView(view, headers, query = '') {
    const url = `${supabaseUrl}/rest/v1/${view}${query ? `?${query}` : ''}`;
    const response = await fetch(url, { headers });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.error(`Supabase dashboard error (${view}):`, response.status, data);
      throw new Error(`Supabase rejected ${view}: ${response.status}`);
    }
    return Array.isArray(data) ? data : [];
  }
};