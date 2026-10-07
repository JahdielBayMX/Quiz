module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const maxBodyBytes = 100000;
  const rawLength = Number(req.headers["content-length"] || 0);
  if (rawLength > maxBodyBytes) {
    return res.status(413).json({ ok: false, error: "Payload too large" });
  }

  const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
  if (!supabaseUrl || !serviceKey) {
    console.error("Statistics storage is not configured.");
    return res.status(503).json({ ok: false, error: "Statistics storage is not configured" });
  }

  let payload = req.body;
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload); }
    catch { return res.status(400).json({ ok: false, error: "Invalid JSON" }); }
  }

  const validation = validateEvent(payload);
  if (!validation.ok) {
    return res.status(400).json({ ok: false, error: validation.error });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/record_quiz_attempt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`
      },
      body: JSON.stringify({ p_event: payload })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.error("Supabase statistics error:", response.status, data);
      return res.status(502).json({ ok: false, error: "Statistics storage rejected the event" });
    }

    return res.status(202).json({ ok: true, stored: true, attemptId: payload.attemptId, result: data });
  } catch (error) {
    console.error("Statistics request failed:", error);
    return res.status(502).json({ ok: false, error: "Statistics storage unavailable" });
  }
};

function validateEvent(event) {
  if (!event || typeof event !== "object") return { ok: false, error: "Invalid event" };
  if (event.event !== "quiz_completed") return { ok: false, error: "Invalid event type" };
  if (event.schemaVersion !== 1) return { ok: false, error: "Unsupported schemaVersion" };
  if (!isString(event.attemptId, 1, 120)) return { ok: false, error: "Invalid attemptId" };
  if (!isString(event.completedAt, 10, 80)) return { ok: false, error: "Invalid completedAt" };
  if (!isString(event.route, 1, 500)) return { ok: false, error: "Invalid route" };
  if (!event.client || !isString(event.client.id, 1, 120) || !isString(event.client.slug, 1, 160)) return { ok: false, error: "Invalid client" };
  if (!event.period || event.period.year === undefined || !isString(String(event.period.month), 1, 80)) return { ok: false, error: "Invalid period" };
  if (!event.quiz || !isString(event.quiz.id, 1, 120) || !isString(event.quiz.slug, 1, 160)) return { ok: false, error: "Invalid quiz" };
  if (!event.score || !Number.isInteger(event.score.correct) || !Number.isInteger(event.score.wrong) || !Number.isInteger(event.score.total) || !Number.isInteger(event.score.percent)) return { ok: false, error: "Invalid score" };
  if (event.score.total < 1 || event.score.correct < 0 || event.score.wrong < 0 || event.score.correct + event.score.wrong !== event.score.total || event.score.percent < 0 || event.score.percent > 100) return { ok: false, error: "Invalid score values" };
  if (!Array.isArray(event.answers) || event.answers.length !== event.score.total) return { ok: false, error: "Invalid answers" };
  return { ok: true };
}

function isString(value, min, max) {
  return typeof value === "string" && value.length >= min && value.length <= max;
}
