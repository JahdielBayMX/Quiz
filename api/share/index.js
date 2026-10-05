const fs = require('fs');
const path = require('path');

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function getMessage(data, percent) {
  const messages = Array.isArray(data.results?.scoreMessages) ? data.results.scoreMessages : [];
  return messages.filter(m => m && Number.isFinite(Number(m.minPercent)))
    .sort((a,b) => Number(b.minPercent) - Number(a.minPercent))
    .find(m => percent >= Number(m.minPercent)) || null;
}

module.exports = async (req, res) => {
  try {
    const q = req.query || {};
    const client = String(q.client || '').trim();
    const year = String(q.year || '').trim();
    const month = String(q.month || '').trim();
    const slug = String(q.slug || '').trim();
    const score = Math.max(0, Number.parseInt(q.score, 10) || 0);
    const total = Math.max(1, Number.parseInt(q.total, 10) || 1);
    const percent = Math.max(0, Math.min(100, Number.parseInt(q.percent, 10) || Math.round(score / total * 100)));
    if (!client || !year || !month || !slug) return res.status(400).send('Share URL incompleta.');

    const filePath = path.join(process.cwd(), 'quizzes', client, year, month, `${slug}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).send('No se encontró este repaso.');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (data.client?.slug !== client || String(data.period?.year) !== year || data.period?.month !== month || data.quiz?.slug !== slug) return res.status(404).send('Este repaso no coincide con la ruta solicitada.');

    const clientName = data.client.name || 'Iglesia';
    const title = data.quiz?.title || 'Repaso de la semana';
    const message = getMessage(data, percent) || {};
    const resultTitle = message.title || 'Repaso completado';
    const resultSubtitle = message.subtitle || 'Mantén presente el mensaje durante la semana.';
    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const quizUrl = `${origin}/quiz/${encodeURIComponent(client)}/${encodeURIComponent(year)}/${encodeURIComponent(month)}/${encodeURIComponent(slug)}`;
    const shareUrl = `${origin}/share/${encodeURIComponent(client)}/${encodeURIComponent(year)}/${encodeURIComponent(month)}/${encodeURIComponent(slug)}?score=${score}&total=${total}&percent=${percent}`;
    const ogImage = `${origin}/share-preview.png`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    return res.status(200).send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · ${esc(clientName)}</title><meta name="description" content="Repasa el mensaje de la semana y mantén presente lo aprendido durante la semana."><meta property="og:type" content="website"><meta property="og:title" content="${esc(resultTitle)} · ${esc(title)}"><meta property="og:description" content="${esc(resultSubtitle)} Resultado: ${percent}%."><meta property="og:url" content="${esc(shareUrl)}"><meta property="og:image" content="${esc(ogImage)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(resultTitle)} · ${esc(title)}"><meta name="twitter:description" content="${esc(resultSubtitle)} Resultado: ${percent}%."><meta name="twitter:image" content="${esc(ogImage)}"><style>
:root{--bg:#f6f7f9;--surface:#fff;--text:#17181a;--secondary:#5f6368;--border:#e2e5e9;--primary:#1a73e8;--primary-dark:#1558b0}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}.wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}.card{width:min(620px,100%);background:var(--surface);border:1px solid var(--border);border-radius:24px;padding:42px 28px;text-align:center;box-shadow:0 12px 36px rgba(20,30,40,.08)}.kicker{font-size:.75rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--secondary)}h1{font-size:clamp(1.8rem,7vw,2.7rem);line-height:1.15;margin:12px 0 8px;letter-spacing:-.03em}.church{color:var(--secondary);line-height:1.5;margin:0 auto 24px}.result{border:1px solid var(--border);background:#f1f3f5;border-radius:18px;padding:24px 18px;margin:0 auto 24px}.result h2{margin:0 0 8px;font-size:1.3rem}.result p{margin:0;color:var(--secondary);line-height:1.55}.percent{font-size:clamp(3.2rem,15vw,5rem);font-weight:800;line-height:1;margin:10px 0;color:var(--primary)}.score{font-weight:700;color:var(--text)}.note{color:var(--secondary);line-height:1.6;margin:0 auto 26px;max-width:480px}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:14px 28px;border-radius:12px;background:var(--primary);color:#fff;text-decoration:none;font-weight:800}.btn:hover{background:var(--primary-dark)}@media(max-width:480px){.card{padding:34px 18px;border-radius:20px}.wrap{padding:14px}}
</style></head><body><main class="wrap"><section class="card"><div class="kicker">Repaso de la semana</div><h1>${esc(title)}</h1><p class="church">${esc(clientName)}</p><div class="result"><h2>${esc(resultTitle)}</h2><p>${esc(resultSubtitle)}</p><div class="percent">${percent}%</div><div class="score">${score} de ${total} respuestas recordadas</div></div><p class="note">Este repaso no es una competencia. Es una herramienta para volver al mensaje, reforzar lo aprendido y mantenerlo vivo durante la semana.</p><a class="btn" href="${esc(quizUrl)}">Hacer este repaso</a></section></main></body></html>`);
  } catch (error) {
    console.error(error);
    return res.status(500).send('No se pudo generar la pantalla para compartir.');
  }
};
