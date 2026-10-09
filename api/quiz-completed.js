module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
  if (!supabaseUrl || !serviceKey) {
    console.error("Statistics storage is not configured.");
    return res.status(503).json({ ok: false, error: "Statistics storage is not configured" });
  }

  try {
    const incoming = await getBody(req);
    const payload = normalizeEvent(incoming);
    const validation = validateEvent(payload);

    if (!validation.ok) {
      console.error("Statistics payload rejected:", validation.error, {
        bodyType: typeof incoming,
        keys: incoming && typeof incoming === "object" ? Object.keys(incoming) : [],
        normalizedKeys: payload && typeof payload === "object" ? Object.keys(payload) : []
      });
      return res.status(400).json({ ok: false, error: validation.error });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/record_quiz_attempt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`
      },
      body: JSON.stringify({ p_event: payload })
    });

    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

    if (!response.ok) {
      console.error("Supabase statistics error:", response.status, data);
      return res.status(502).json({ ok: false, error: "Statistics storage rejected the event" });
    }

    return res.status(200).json({ ok: true, stored: true, attemptId: payload.attemptId, result: data });
  } catch (error) {
    console.error("Statistics request failed:", error);
    return res.status(500).json({ ok: false, error: "Unexpected statistics error" });
  }
};

async function getBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") {
      try { return JSON.parse(req.body); } catch { throw new Error("Invalid JSON"); }
    }
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { throw new Error("Invalid JSON"); }
}

function normalizeEvent(input) {
  if (!input || typeof input !== "object") return input;

  let event = input.detail && typeof input.detail === "object" ? input.detail : input;

  // Accept both the structured V1 event and the browser CustomEvent name.
  if (event.event === "quiz:completed") event = { ...event, event: "quiz_completed" };

  // If a wrapper was sent, unwrap it.
  if (event.data && typeof event.data === "object" && !event.client && !event.quiz) {
    event = event.data;
    if (event.event === "quiz:completed") event = { ...event, event: "quiz_completed" };
  }

  // Normalize alternate/natural field names into the V1 contract.
  const client = event.client || {};
  const period = event.period || {};
  const quiz = event.quiz || {};
  const score = event.score || {};

  const answers = Array.isArray(event.answers)
    ? event.answers
    : Array.isArray(event.results)
      ? event.results
      : [];

  return {
    event: event.event || "quiz_completed",
    schemaVersion: Number(event.schemaVersion || 1),
    attemptId: event.attemptId || event.id || `attempt-${Date.now()}-${Math.random().toString(36).slice(2,10)}`,
    completedAt: event.completedAt || event.timestamp || new Date().toISOString(),
    durationSeconds: event.durationSeconds ?? event.duration ?? null,
    route: event.route || event.url || "unknown",
    client: {
      id: client.id || event.clientId || "unknown",
      slug: client.slug || event.clientSlug || "unknown",
      name: client.name || event.clientName || ""
    },
    period: {
      year: period.year ?? event.year ?? new Date().getFullYear(),
      month: period.month || event.month || "unknown"
    },
    quiz: {
      id: quiz.id || event.quizId || "unknown",
      slug: quiz.slug || event.quizSlug || "unknown",
      title: quiz.title || event.quizTitle || event.title || ""
    },
    score: {
      correct: Number(score.correct ?? event.correctAnswers ?? event.correct ?? 0),
      wrong: Number(score.wrong ?? event.wrongAnswers ?? event.wrong ?? 0),
      total: Number(score.total ?? event.totalQuestions ?? event.total ?? answers.length),
      percent: Number(score.percent ?? event.percentage ?? event.percent ?? 0)
    },
    answers: answers.map((a, index) => ({
      questionId: a.questionId ?? a.id ?? index + 1,
      question: a.question ?? a.pregunta ?? "",
      selected: a.selected ?? a.selectedAnswer ?? a.seleccionada ?? a.userAnswer ?? "",
      correct: a.correct ?? a.correctAnswer ?? a.correcta ?? "",
      isCorrect: Boolean(a.isCorrect ?? a.esCorrecta ?? false)
    }))
  };
}

function validateEvent(event) {
  if (!event || typeof event !== "object") return { ok: false, error: "Invalid event body" };
  if (event.event !== "quiz_completed") return { ok: false, error: "Invalid event type" };
  if (!isString(String(event.attemptId), 1, 120)) return { ok: false, error: "Invalid attemptId" };
  if (!isString(String(event.completedAt), 10, 80)) return { ok: false, error: "Invalid completedAt" };
  if (!isString(String(event.route), 1, 500)) return { ok: false, error: "Invalid route" };
  if (!event.client || !isString(String(event.client.id), 1, 120) || !isString(String(event.client.slug), 1, 160)) return { ok: false, error: "Invalid client" };
  if (!event.period || !Number.isFinite(Number(event.period.year)) || !isString(String(event.period.month), 1, 80)) return { ok: false, error: "Invalid period" };
  if (!event.quiz || !isString(String(event.quiz.id), 1, 120) || !isString(String(event.quiz.slug), 1, 160)) return { ok: false, error: "Invalid quiz" };
  if (!event.score || !Number.isInteger(event.score.correct) || !Number.isInteger(event.score.wrong) || !Number.isInteger(event.score.total) || !Number.isInteger(event.score.percent)) return { ok: false, error: "Invalid score" };
  if (event.score.total < 1 || event.score.correct < 0 || event.score.wrong < 0 || event.score.correct + event.score.wrong !== event.score.total || event.score.percent < 0 || event.score.percent > 100) return { ok: false, error: "Invalid score values" };
  if (!Array.isArray(event.answers) || event.answers.length !== event.score.total) return { ok: false, error: "Invalid answers" };
  return { ok: true };
}

function isString(value, min, max) {
  return typeof value === "string" && value.length >= min && value.length <= max;
}
