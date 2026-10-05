(function(){
  "use strict";
  const DEFAULT_SLUG="sabiduria";
  const $=id=>document.getElementById(id);
  let quiz=null,currentIdx=0,aciertos=0,errores=0,userAnswers=[],resultPngDataUrl="";

  function getQuizPath(){
    const parts=location.pathname.split("/").filter(Boolean);
    if(parts[0]!=="quiz") return DEFAULT_SLUG;
    const routeParts=parts.slice(1).map(part=>decodeURIComponent(part));
    if(!routeParts.length) return DEFAULT_SLUG;
    return routeParts.join("/").replace(/\/+$/ ,"");
  }
  function getQuizUrl(){
    const quizPath=getQuizPath();
    return "/quizzes/"+quizPath.split("/").map(encodeURIComponent).join("/")+".json";
  }
  function getClientUrl(clientSlug){ return "/clients/"+encodeURIComponent(clientSlug)+".json"; }
  function getRouteMeta(){ const parts=getQuizPath().split("/"); return {clientSlug:parts[0]||"",year:parts[1]||"",month:parts[2]||"",slug:parts[3]||""}; }
  function escUrl(s){try{return new URL(s,location.href).href}catch{return "#"}}
  function validate(data,route){
    if(!data||typeof data!=="object") throw new Error("El JSON no contiene un objeto válido.");
    if(!data.client||!data.client.id||!data.client.slug||!data.client.name) throw new Error("Falta la identificación del cliente.");
    if(!data.period||data.period.year===undefined||!data.period.month) throw new Error("Falta la identificación del período.");
    if(!data.quiz||!data.quiz.id||!data.quiz.slug||!Array.isArray(data.questions)||!data.questions.length) throw new Error("El quiz no tiene configuración o preguntas válidas.");
    if(route.clientSlug!==data.client.slug||String(route.year)!==String(data.period.year)||route.month!==data.period.month||route.slug!==data.quiz.slug) throw new Error("La ruta no coincide con la identificación del quiz.");
    const ids=new Set();
    data.questions.forEach((q,i)=>{
      if(q.id===undefined||ids.has(String(q.id))) throw new Error("ID de pregunta inválido o repetido en la pregunta "+(i+1)+".");
      ids.add(String(q.id));
      if(!q.question||!Array.isArray(q.options)||q.options.length<2) throw new Error("Pregunta "+(i+1)+" incompleta.");
      if(!Number.isInteger(q.correctIndex)||q.correctIndex<0||q.correctIndex>=q.options.length) throw new Error("correctIndex inválido en la pregunta "+(i+1)+".");
      if(!q.explanation) throw new Error("Falta explanation en la pregunta "+(i+1)+".");
    });
  }
  async function load(){
    const quizPath=getQuizPath(),route=getRouteMeta();
    try{
      const res=await fetch(getQuizUrl(),{cache:"no-store"}); if(!res.ok) throw new Error("No se encontró el quiz en: "+quizPath);
      const data=await res.json(); validate(data,route);
      const clientRes=await fetch(getClientUrl(data.client.slug),{cache:"no-store"});
      if(!clientRes.ok) throw new Error("No se encontró la configuración del cliente: "+data.client.slug);
      const clientConfig=await clientRes.json();
      if(!clientConfig||clientConfig.id!==data.client.id||clientConfig.slug!==data.client.slug||!clientConfig.name) throw new Error("La configuración del cliente no es válida.");
      if(clientConfig.status&&clientConfig.status!=="active") throw new Error("Este cliente no está activo.");
      quiz={...data.quiz,client:clientConfig,period:data.period,questions:data.questions,scoreMessages:(data.results&&data.results.scoreMessages)||[],shareLabel:(data.results&&data.results.shareLabel)||"Conecta con el mensaje"};
      document.title=quiz.title||"Quiz"; renderShell(); showStartScreen();
    }catch(err){ document.querySelector("main").innerHTML='<div class="summary-card"><h1 class="congrats-title">Quiz no disponible</h1><p class="congrats-subtitle">'+err.message+'</p><div class="final-buttons-container"><a class="review-btn-trigger" href="/">Volver al inicio</a></div></div>'; console.error(err); }
  }
  function showStartScreen(){
    $("start-screen").hidden=false;$("quiz-content").hidden=true;$("start-title").textContent=quiz.title||"Quiz";$("start-subtitle").textContent=quiz.subtitle||"";$("start-purpose").textContent=quiz.startPurpose||"";$("question-count").textContent=quiz.questions.length+" preguntas";
    const b=quiz.buttons||{};$("start-btn").textContent=b.start||"Comenzar";$("start-btn").onclick=()=>{$("start-screen").hidden=true;$('quiz-content').hidden=false;renderQuestion();window.scrollTo({top:0,behavior:"smooth"});};
  }
  function renderShell(){
    $("quiz-title").textContent=quiz.title||"Quiz";$("quiz-subtitle").textContent=quiz.subtitle||"";const b=quiz.buttons||{},r=quiz.results||{};
    $("hint-btn-step").textContent=b.hint||"💡 Ver pista";$("next-btn").textContent=b.next||"Siguiente Pregunta →";$("btn-review").textContent=b.review||"Revisar respuestas";$("btn-retry").textContent=b.retry||"Intentar de nuevo";$("btn-revive").textContent=b.revive||"Revive el mensaje";$("btn-retry-review").textContent=b.retryReview||b.retry||"Volver a intentar";
    $("results-title").textContent=r.title||"¡Lo lograste!";$("results-subtitle").textContent=r.subtitle||"";$("correct-label").textContent=r.correctLabel||"Aciertos";$("wrong-label").textContent=r.wrongLabel||"Errores";$("review-title").textContent=r.reviewTitle||"Revisión Detallada";$("share-title").textContent=quiz.shareLabel;$("btn-share-image").textContent="Compartir mi resultado";$("btn-download-image").textContent="Descargar imagen";$("btn-share-whatsapp").textContent="WhatsApp";$("btn-share-facebook").textContent="Facebook";$("btn-share-x").textContent="X";$("btn-share-copy").textContent="Copiar mensaje";
    $("btn-revive").href=escUrl(quiz.videoUrl||"#");
  }
  function renderQuestion(){
    const q=quiz.questions[currentIdx],total=quiz.questions.length;$("progress-fill").style.width=((currentIdx+1)/total*100)+"%";$("progress-label").textContent=(currentIdx+1)+" de "+total;$("question-text").textContent=(currentIdx+1)+". "+q.question;
    const group=$("options-group");group.replaceChildren();$("feedback-area").style.display="none";$("next-btn").style.display="none";$("hint-box-step").style.display="none";$("hint-btn-step").style.display="inline-block";$("hint-btn-step").textContent=(quiz.buttons?.hint)||"💡 Ver pista";
    q.options.forEach((opt,idx)=>{const btn=document.createElement("button");btn.type="button";btn.className="option-btn";btn.textContent=opt;btn.addEventListener("click",()=>answer(idx,btn,q,group));group.appendChild(btn);});
    $("hint-btn-step").onclick=()=>{const box=$("hint-box-step"),visible=box.style.display==="block";box.textContent=visible?"":"Pista: "+(q.hint||"");box.style.display=visible?"none":"block";$("hint-btn-step").textContent=visible?(quiz.buttons?.hint||"💡 Ver pista"):(quiz.buttons?.hintHide||"Ocultar pista");};
  }
  function answer(idx,selected,q,group){
    const buttons=[...group.querySelectorAll(".option-btn")];if(buttons.some(b=>b.disabled))return;buttons.forEach(b=>b.disabled=true);$("hint-btn-step").style.display="none";const ok=idx===q.correctIndex;userAnswers.push({pregunta:q.question,seleccionada:q.options[idx],correcta:q.options[q.correctIndex],esCorrecta:ok,explicacion:q.explanation,cita:q.bible_ref||""});if(ok){selected.classList.add("correct-choice");aciertos++;}else{selected.classList.add("wrong-choice");buttons[q.correctIndex].classList.add("correct-choice");errores++;}const box=$("feedback-area");box.replaceChildren();const strong=document.createElement("div");strong.style.fontWeight="bold";strong.style.marginBottom="10px";strong.style.color=ok?"#137333":"#c5221f";strong.textContent=ok?"✅ ¡Correcto!":"❌ Respuesta incorrecta";box.append(strong);const expl=document.createElement("span");expl.textContent=q.explanation;box.append(expl);box.style.display="block";$("next-btn").style.display="block";setTimeout(()=>$("next-btn").scrollIntoView({behavior:"smooth",block:"center"}),120);
  }
  $("next-btn").onclick=()=>{currentIdx++;if(currentIdx<quiz.questions.length)renderQuestion();else finish();};
  function buildResult(){const total=quiz.questions.length,porcentaje=Math.round(aciertos/total*100);return {client:{id:quiz.client?.id||"",slug:quiz.client?.slug||"",name:quiz.client?.name||""},period:{year:quiz.period?.year??"",month:quiz.period?.month||""},quiz:{id:quiz.id||"",slug:quiz.slug||"",title:quiz.title||""},score:{correct:aciertos,wrong:errores,total,percent:porcentaje},answers:userAnswers.map((answer,index)=>({questionId:quiz.questions[index]?.id??null,question:answer.pregunta,selected:answer.seleccionada,correct:answer.correcta,isCorrect:answer.esCorrecta}))};}
  function publishResult(){const result=buildResult();window.quizResult=result;window.dispatchEvent(new CustomEvent("quiz:completed",{detail:result}));}
  function getCurrentScoreMessage(){const porcentaje=Math.round(aciertos/quiz.questions.length*100);return (Array.isArray(quiz.scoreMessages)?quiz.scoreMessages:[]).filter(m=>m&&Number.isFinite(Number(m.minPercent))).sort((a,b)=>Number(b.minPercent)-Number(a.minPercent)).find(m=>porcentaje>=Number(m.minPercent))||null;}
  function getShareText(){const porcentaje=Math.round(aciertos/quiz.questions.length*100),nombre=quiz.title||"este contenido";const message=getCurrentScoreMessage(),custom=message&&typeof message.shareText==="string"?message.shareText:"";const base=custom.replace(/\{title\}/g,nombre).replace(/\{correct\}/g,String(aciertos)).replace(/\{total\}/g,String(quiz.questions.length)).replace(/\{percent\}/g,String(porcentaje)).replace(/\{url\}/g,location.href);return base||("✨ Conecté con el mensaje «"+nombre+"» y obtuve "+aciertos+" de "+quiz.questions.length+" ("+porcentaje+"%).\n\n¿Te gustaría hacerlo?\n"+location.href);}
  function shareTo(url){window.open(url,"_blank","noopener,noreferrer");}
  async function copyShareText(){const text=getShareText();try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);$("share-status").textContent="Mensaje copiado.";}else{const field=document.createElement("textarea");field.value=text;field.setAttribute("readonly","");field.style.position="fixed";field.style.opacity="0";document.body.append(field);field.select();const ok=document.execCommand("copy");field.remove();$("share-status").textContent=ok?"Mensaje copiado.":"No se pudo copiar automáticamente.";}}catch(e){$("share-status").textContent="No se pudo copiar automáticamente.";}}
  function wrapCanvasText(ctx,text,maxWidth){const words=String(text||"").split(/\s+/);const lines=[];let line="";for(const word of words){const test=line?line+" "+word:word;if(ctx.measureText(test).width<=maxWidth)line=test;else{if(line)lines.push(line);line=word;}}if(line)lines.push(line);return lines;}
  function roundRect(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function drawShareCardCanvas(){const W=1080,H=1080,c=document.createElement("canvas");c.width=W;c.height=H;const ctx=c.getContext("2d");if(!ctx)throw new Error("Canvas no disponible");const p=Math.round(aciertos/quiz.questions.length*100),m=getCurrentScoreMessage()||{};const client=quiz.client?.name||"",title=quiz.title||"",period=(quiz.period?.year||"")+" · "+(quiz.period?.month||"");
    const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,"#0b1220");bg.addColorStop(.52,"#13243d");bg.addColorStop(1,"#08101d");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    const glow=ctx.createRadialGradient(880,170,20,880,170,430);glow.addColorStop(0,"rgba(67,145,255,.28)");glow.addColorStop(1,"rgba(67,145,255,0)");ctx.fillStyle=glow;ctx.fillRect(520,0,560,560);
    const glow2=ctx.createRadialGradient(130,940,10,130,940,360);glow2.addColorStop(0,"rgba(40,197,135,.16)");glow2.addColorStop(1,"rgba(40,197,135,0)");ctx.fillStyle=glow2;ctx.fillRect(0,650,500,430);
    ctx.fillStyle="#4b9cff";ctx.fillRect(0,0,W,10);
    ctx.textAlign="left";ctx.fillStyle="#f7f9fc";ctx.font="700 32px Arial, sans-serif";ctx.fillText(client,76,82);
    ctx.fillStyle="#8fbfff";ctx.font="800 22px Arial, sans-serif";ctx.letterSpacing="2px";ctx.fillText((quiz.shareLabel||"Conecta con el mensaje").toUpperCase(),76,124);
    ctx.fillStyle="#91a1b7";ctx.font="700 21px Arial, sans-serif";ctx.fillText(period.toUpperCase(),76,165);
    ctx.fillStyle="#ffffff";ctx.font="800 62px Arial, sans-serif";ctx.letterSpacing="0px";const titleLines=wrapCanvasText(ctx,title,850);let y=245;for(const line of titleLines.slice(0,3)){ctx.fillText(line,76,y);y+=70;}
    roundRect(ctx,76,385,928,370,38,"rgba(255,255,255,.075)","rgba(255,255,255,.13)");
    ctx.textAlign="center";ctx.fillStyle="#8fbfff";ctx.font="800 21px Arial, sans-serif";ctx.fillText("TU RESULTADO",540,432);
    ctx.fillStyle="#ffffff";ctx.font="900 190px Arial, sans-serif";ctx.fillText(p+"%",540,610);
    ctx.fillStyle="#dce7f5";ctx.font="700 34px Arial, sans-serif";ctx.fillText(aciertos+" de "+quiz.questions.length+" respuestas",540,680);
    const barX=210,barY=710,barW=660,barH=12;roundRect(ctx,barX,barY,barW,barH,6,"rgba(255,255,255,.12)",null);const fillW=Math.max(12,barW*p/100);roundRect(ctx,barX,barY,fillW,barH,6,p>=80?"#36c98f":"#4b9cff",null);
    roundRect(ctx,76,792,928,178,30,"rgba(255,255,255,.095)","rgba(255,255,255,.12)");
    ctx.textAlign="left";ctx.fillStyle="#ffffff";ctx.font="800 34px Arial, sans-serif";ctx.fillText(m.title||"Mantén presente el mensaje",112,845);
    ctx.fillStyle="#c7d2e2";ctx.font="500 25px Arial, sans-serif";const msgLines=wrapCanvasText(ctx,m.subtitle||"Sigue conectando con lo aprendido durante la semana.",820);let my=888;for(const line of msgLines.slice(0,2)){ctx.fillText(line,112,my);my+=34;}
    ctx.textAlign="left";ctx.fillStyle="#8fa0b5";ctx.font="700 19px Arial, sans-serif";ctx.fillText("CONECTA · RECUERDA · VIVE",76,1020);ctx.textAlign="right";ctx.font="500 18px Arial, sans-serif";ctx.fillText("Comparte tu resultado",1004,1020);return c;}
  async function generateResultPng(){const canvas=drawShareCardCanvas();return await new Promise((resolve,reject)=>canvas.toBlob(blob=>{if(!blob)return reject(new Error("No se pudo crear el PNG"));const reader=new FileReader();reader.onloadend=()=>{resultPngDataUrl=reader.result;resolve(resultPngDataUrl);};reader.onerror=()=>reject(new Error("No se pudo leer el PNG"));reader.readAsDataURL(blob);},"image/png"));}
  async function shareImage(){try{const dataUrl=resultPngDataUrl||await generateResultPng();const res=await fetch(dataUrl),blob=await res.blob(),file=new File([blob],"mi-resultado.png",{type:"image/png"});if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({title:quiz.title||"Mi resultado",text:getShareText(),files:[file]});$("share-status").textContent="";}else{$("share-status").textContent="Tu dispositivo no permite compartir imágenes directamente. Puedes descargarla y adjuntarla en WhatsApp o redes sociales.";}}catch(e){if(e&&e.name!=="AbortError"){$("share-status").textContent="No se pudo preparar la imagen. Intenta descargarla.";console.error(e);}}}
  async function downloadImage(){try{const dataUrl=resultPngDataUrl||await generateResultPng();const blob=await (await fetch(dataUrl)).blob();const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=(quiz.slug||"resultado")+"-resultado.png";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$("share-status").textContent="Imagen descargada.";}catch(e){$("share-status").textContent="No se pudo generar la imagen. Intenta de nuevo.";console.error(e);}}
  async function shareNativeText(){if(navigator.share){try{await navigator.share({title:quiz.title||"Mi resultado",text:getShareText()});return;}catch(e){if(e&&e.name==="AbortError")return;}}copyShareText();}
  async function shareWhatsApp(){if(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)&&navigator.share&&navigator.canShare){try{const dataUrl=resultPngDataUrl||await generateResultPng(),blob=await (await fetch(dataUrl)).blob(),file=new File([blob],"mi-resultado.png",{type:"image/png"});if(navigator.canShare({files:[file]})){await navigator.share({title:quiz.title||"Mi resultado",text:getShareText(),files:[file]});return;}}catch(e){if(e&&e.name==="AbortError")return;}}shareTo("https://wa.me/?text="+encodeURIComponent(getShareText()));}
  function setupSharing(){$("btn-share-image").onclick=shareImage;$("btn-download-image").onclick=downloadImage;$("btn-share-native").onclick=shareNativeText;$("btn-share-whatsapp").onclick=shareWhatsApp;$("btn-share-facebook").onclick=()=>shareTo("https://www.facebook.com/sharer/sharer.php?u="+encodeURIComponent(location.href));$("btn-share-x").onclick=()=>shareTo("https://twitter.com/intent/tweet?text="+encodeURIComponent(getShareText().replace(location.href,"").trim())+"&url="+encodeURIComponent(location.href));$("btn-share-copy").onclick=copyShareText;}
  function finish(){$("quiz-app").hidden=true;$("prog-container").hidden=true;$("progress-label").hidden=true;$("quiz-header").hidden=true;$("final-summary").hidden=false;$("stat-correct").textContent=aciertos;$("stat-wrong").textContent=errores;$("stat-percent").textContent=Math.round(aciertos/quiz.questions.length*100)+"%";const porcentaje=Math.round(aciertos/quiz.questions.length*100),scoreMessage=getCurrentScoreMessage();if(scoreMessage){if(scoreMessage.title)$("results-title").textContent=scoreMessage.title;if(scoreMessage.subtitle)$("results-subtitle").textContent=scoreMessage.subtitle;}publishResult();setupSharing();requestAnimationFrame(()=>window.scrollTo({top:0,behavior:"smooth"}));if(porcentaje>=80&&window.confetti)window.confetti({particleCount:150,spread:70,origin:{y:.6}});}
  function showReview(){$("final-summary").hidden=true;$("review-screen").hidden=false;const list=$("review-list");list.replaceChildren();const intro=document.createElement("p");intro.className="review-intro";intro.textContent="Vuelve a cada respuesta para reforzar lo aprendido y mantener presente el mensaje.";list.append(intro);userAnswers.forEach((ans,i)=>{const item=document.createElement("article");item.className="review-item "+(ans.esCorrecta?"rev-correct":"rev-wrong");const badge=document.createElement("div");badge.className="review-status";badge.textContent=ans.esCorrecta?"✓ Correcta":"✕ Para repasar";item.append(badge);const q=document.createElement("div");q.className="review-question";q.textContent=(i+1)+". "+ans.pregunta;item.append(q);const sel=document.createElement("div");sel.className="review-answer";sel.textContent="Tu elección: ";const sv=document.createElement("span");sv.textContent=ans.seleccionada;sel.append(sv);item.append(sel);if(!ans.esCorrecta){const cor=document.createElement("div");cor.className="review-answer review-correct-answer";cor.textContent="Respuesta correcta: ";const cv=document.createElement("span");cv.textContent=ans.correcta;cor.append(cv);item.append(cor);}const eb=document.createElement("div");eb.className="rev-expl-box";const st=document.createElement("strong");st.textContent="Explicación";eb.append(st);eb.append(document.createElement("br"));eb.append(document.createTextNode(ans.explicacion));if(ans.cita){const ref=document.createElement("span");ref.className="rev-bible";ref.textContent="📖 "+ans.cita;eb.append(ref);}item.append(eb);list.append(item);});window.scrollTo({top:0,behavior:"smooth"});}
  function retry(){location.reload();}
  $("btn-review").onclick=showReview;$("btn-retry").onclick=retry;$("btn-retry-review").onclick=retry;load();
})();
