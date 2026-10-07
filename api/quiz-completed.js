export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const event = body.detail && typeof body.detail === 'object' ? body.detail : body;

    const client = event.client || {};
    const period = event.period || {};
    const quiz = event.quiz || {};

    const clientSlug = String(event.clientSlug ?? client.slug ?? '').trim();
    const clientId = String(event.clientId ?? client.id ?? '').trim() || null;
    const year = Number(event.year ?? period.year);
    const month = String(event.month ?? period.month ?? '').trim();
    const quizSlug = String(event.quizSlug ?? quiz.slug ?? '').trim();
    const quizId = String(event.quizId ?? quiz.id ?? '').trim() || null;
    const quizTitle = String(event.quizTitle ?? quiz.title ?? event.title ?? '').trim() || null;

    const totalQuestions = Number(event.totalQuestions ?? event.total ?? 0);
    const correctAnswers = Number(event.correctAnswers ?? event.correct ?? 0);
    const wrongAnswers = Number(event.wrongAnswers ?? event.wrong ?? Math.max(0, totalQuestions - correctAnswers));
    const percentage = Number(event.percentage ?? event.percent ?? (totalQuestions ? Math.round((correctAnswers / totalQuestions) * 100) : 0));
    const durationSeconds = Number(event.durationSeconds ?? event.duration ?? 0) || null;

    const rawAnswers = Array.isArray(event.answers)
      ? event.answers
      : Array.isArray(event.results)
        ? event.results
        : [];

    if (!clientSlug || !quizSlug || !Number.isFinite(year) || !month || !Number.isFinite(totalQuestions) || totalQuestions < 1 || !Number.isFinite(correctAnswers)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid quiz completion payload',
        received: {
          hasClientSlug: !!clientSlug,
          hasQuizSlug: !!quizSlug,
          year,
          month,
          totalQuestions,
          correctAnswers,
          answers: rawAnswers.length
        }
      });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return res.status(500).json({ ok: false, error: 'Supabase environment variables are not configured' });
    }

    const attemptId = String(event.attemptId || crypto.randomUUID());
    const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
    const headers = {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    };

    const attempt = {
      attempt_id: attemptId,
      client_id: clientId,
      client_slug: clientSlug,
      year,
      month,
      quiz_id: quizId,
      quiz_slug: quizSlug,
      quiz_title: quizTitle,
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      wrong_answers: wrongAnswers,
      percentage: Math.max(0, Math.min(100, percentage)),
      duration_seconds: durationSeconds,
      completed_at: event.completedAt || new Date().toISOString()
    };

    const attemptResponse = await fetch(`${supabaseUrl}/rest/v1/quiz_attempts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(attempt)
    });

    if (!attemptResponse.ok) {
      const detail = await attemptResponse.text();
      console.error('Supabase quiz_attempts error:', attemptResponse.status, detail);
      return res.status(500).json({ ok: false, error: 'Could not store quiz attempt' });
    }

    const answers = rawAnswers.map((answer, index) => ({
      attempt_id: attemptId,
      question_id: String(answer.questionId ?? answer.id ?? index + 1),
      selected_answer: String(answer.selectedAnswer ?? answer.selected ?? answer.userAnswer ?? answer.choice ?? ''),
      correct_answer: String(answer.correctAnswer ?? answer.correct ?? ''),
      is_correct: Boolean(answer.isCorrect ?? answer.correct === true ?? false)
    }));

    if (answers.length) {
      const answersResponse = await fetch(`${supabaseUrl}/rest/v1/quiz_answers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(answers)
      });

      if (!answersResponse.ok) {
        const detail = await answersResponse.text();
        console.error('Supabase quiz_answers error:', answersResponse.status, detail);
        return res.status(500).json({ ok: false, error: 'Attempt stored, but answers could not be stored' });
      }
    }

    return res.status(200).json({ ok: true, attemptId });
  } catch (error) {
    console.error('quiz-completed unexpected error:', error);
    return res.status(500).json({ ok: false, error: 'Unexpected server error' });
  }
}
