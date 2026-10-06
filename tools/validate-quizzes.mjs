import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const clientsDir = path.join(root, 'clients');
const quizzesDir = path.join(root, 'quizzes');
const errors = [];
const warnings = [];

const readJson = (file) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { errors.push(`${path.relative(root,file)}: JSON inválido (${e.message})`); return null; }
};
const walk = (dir) => {
  if (!fs.existsSync(dir)) return [];
  const out=[];
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...walk(p));
    else if(entry.isFile() && entry.name.toLowerCase().endsWith('.json')) out.push(p);
  }
  return out;
};

if(!fs.existsSync(clientsDir)) errors.push('Falta la carpeta clients/.');
if(!fs.existsSync(quizzesDir)) errors.push('Falta la carpeta quizzes/.');

const clientFiles=walk(clientsDir);
const quizFiles=walk(quizzesDir);
const clients=new Map();

for(const file of clientFiles){
  const c=readJson(file); if(!c) continue;
  const rel=path.relative(root,file);
  if(!c.id||!c.slug||!c.name) errors.push(`${rel}: el cliente requiere id, slug y name.`);
  if(c.status && c.status!=='active') warnings.push(`${rel}: cliente con status "${c.status}".`);
  if(c.slug && clients.has(c.slug)) errors.push(`${rel}: slug de cliente duplicado "${c.slug}".`);
  if(c.slug) clients.set(c.slug,{...c,file});
}

const quizSlugs=new Set();
for(const file of quizFiles){
  const q=readJson(file); if(!q) continue;
  const rel=path.relative(root,file);
  if(!q.client?.id||!q.client?.slug||!q.client?.name) errors.push(`${rel}: falta client.id, client.slug o client.name.`);
  if(q.period?.year===undefined || !q.period?.month) errors.push(`${rel}: falta period.year o period.month.`);
  if(!q.quiz?.id||!q.quiz?.slug||!q.quiz?.title) errors.push(`${rel}: falta quiz.id, quiz.slug o quiz.title.`);
  if(!Array.isArray(q.questions)||q.questions.length===0) errors.push(`${rel}: no contiene preguntas.`);
  if(q.status && !['published','draft','archived'].includes(q.status)) errors.push(`${rel}: status inválido.`);
  if(q.client?.slug){
    const expected=path.join('quizzes',q.client.slug,String(q.period?.year??''),String(q.period?.month??''),(q.quiz?.slug||'')+'.json').replaceAll(path.sep,'/');
    if(expected!==rel.replaceAll(path.sep,'/')) errors.push(`${rel}: la ruta no coincide con client.slug/year/month/quiz.slug (esperada ${expected}).`);
    const client=clients.get(q.client.slug);
    if(!client) errors.push(`${rel}: no existe clients/${q.client.slug}.json.`);
    else if(client.id!==q.client.id) errors.push(`${rel}: client.id no coincide con la configuración del cliente.`);
  }
  const seenQuestionIds=new Set();
  for(const [i,question] of (q.questions||[]).entries()){
    const label=`${rel}: pregunta ${i+1}`;
    if(question.id===undefined) errors.push(`${label}: falta id.`);
    else if(seenQuestionIds.has(String(question.id))) errors.push(`${label}: id duplicado "${question.id}".`);
    else seenQuestionIds.add(String(question.id));
    if(!question.question) errors.push(`${label}: falta question.`);
    if(!Array.isArray(question.options)||question.options.length<2) errors.push(`${label}: requiere al menos 2 opciones.`);
    if(!Number.isInteger(question.correctIndex)||question.correctIndex<0||question.correctIndex>=(question.options?.length||0)) errors.push(`${label}: correctIndex inválido.`);
    if(!question.explanation) warnings.push(`${label}: falta explanation.`);
  }
  if(q.quiz?.slug){ const key=`${q.client?.slug||''}/${q.quiz.slug}`; if(quizSlugs.has(key)) errors.push(`${rel}: combinación cliente/slug duplicada "${key}".`); quizSlugs.add(key); }
}

console.log(`Clientes revisados: ${clientFiles.length}`);
console.log(`Quizzes revisados: ${quizFiles.length}`);
console.log(`Errores: ${errors.length}`);
console.log(`Avisos: ${warnings.length}`);
for(const w of warnings) console.log(`⚠ ${w}`);
for(const e of errors) console.log(`✕ ${e}`);
if(errors.length){ process.exitCode=1; console.log('\nVALIDACIÓN FALLIDA'); }
else console.log('\nVALIDACIÓN OK');
