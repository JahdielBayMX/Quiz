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
      Prefer: 'return=representation',
      ...(opts.headers || {})
    }
  }).then(async (r) => {
    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}

    if (!r.ok) {
      throw new Error('Supabase rejected request: ' + r.status + ' ' + text);
    }

    return data;
  });
}

function enc(v) {
  return encodeURIComponent(v);
}

async function getAttemptIds(scope, value) {
  let filter = '';

  if (scope === 'quiz') {
    filter = '&quiz_slug=eq.' + enc(value);
  } else if (scope === 'client') {
    filter = '&client_slug=eq.' + enc(value);
  }

  const rows = await sb('quiz_attempts?select=attempt_id' + filter);
  return (rows || []).map(x => x.attempt_id).filter(Boolean);
}

async function deleteInBatches(table, field, ids) {
  let deleted = 0;

  // Keep the URL reasonably small for clients with many test attempts.
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const inValue = batch.map(enc).join(',');
    const rows = await sb(
      table + '?' + field + '=in.(' + inValue + ')',
      { method: 'DELETE' }
    );
    deleted += Array.isArray(rows) ? rows.length : 0;
  }

  return deleted;
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

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed'
    });
  }

  try {
    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body)
        : (req.body || {});

    if (!['quiz', 'client', 'all'].includes(body.scope)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid scope'
      });
    }

    if (body.scope !== 'all' && !body.value) {
      return res.status(400).json({
        ok: false,
        error: 'Value required'
      });
    }

    const attemptIds = await getAttemptIds(body.scope, body.value || '');

    if (!attemptIds.length) {
      return res.status(200).json({
        ok: true,
        data: {
          deletedAttempts: 0,
          deletedAnswers: 0
        }
      });
    }

    // Answers are deleted first so this remains safe even if the FK
    // does not use ON DELETE CASCADE.
    const deletedAnswers = await deleteInBatches(
      'quiz_answers',
      'attempt_id',
      attemptIds
    );

    const deletedAttempts = await deleteInBatches(
      'quiz_attempts',
      'attempt_id',
      attemptIds
    );

    return res.status(200).json({
      ok: true,
      data: {
        deletedAttempts,
        deletedAnswers
      }
    });
  } catch (e) {
    console.error('Statistics delete error:', e);

    return res.status(502).json({
      ok: false,
      error: e.message
    });
  }
};
