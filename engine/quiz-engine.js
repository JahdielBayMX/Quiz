(function(){
  "use strict";
  const DEFAULT_PATH="cliente-001/2026/10-octubre/sabiduria";
  const $=id=>document.getElementById(id);
  let quiz=null,currentIdx=0,aciertos=0,errores=0,userAnswers=[];

  function getQuizPath(){
    const parts=location.pathname.split("/").filter(Boolean);
    if(parts[0]!=="quiz") return DEFAULT_PATH;
    const routeParts=parts.slice(1).map(part=>decodeURIComponent(part));
    return routeParts.length?routeParts.join("/").replace(/\/+$/ ,""):DEFAULT_PATH;
  }
  function getQuizUrl(){
    return "/quizzes/"+getQuizPath().split("/").map(encodeURIComponent).join("/")+".json";
  }
  function getClientUrl(clientSlug){ return "/clients/"+encodeURIComponent(clientSlug)+".json"; }
  function getRouteMeta(){
    const parts=getQuizPath().split("/");
    return {clientSlug:parts[0]||"",year:parts[1]||"",month:parts[2]||"",slug:parts[3]||""};
  }
  function escUrl(s){try{return new URL(s,location.href).href}catch{return "#"}}
  function validate(data,route){
    if(!data||typeof data!=="object") throw new Error("El JSON no contiene un objeto válido.");
    if(!data.client||!data.client.id||!data.client.slug||!data.client.name) throw new Error("Falta la identificación del cliente.");
    if(!data.period||data.period.year===undefined||!data.period.month) throw new Error("Falta la identificación del período.");
    if(!data.quiz||!data.quiz.id||!data.quiz.slug||!Array.isArray(data.questions)||!data.questions.length) throw new Error("El quiz no tiene configuración o preguntas válidas.");
    if(route.clientSlug!==data.client.slug||String(route.year)!==String(data.period.year)||route.month!==data.period.month||route.slug!==data.quiz.slug){
      throw new Error("La ruta no coincide con la identificación del quiz.");
    }
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
    const quizPath=getQuizPath();
    const route=getRouteMeta();
    try{
      const res=await fetch(getQuizUrl(),{cache:"no-store"});
      if(!res.ok) throw new Error("No se encontró el quiz en: "+quizPath);
      const data=await res.json();validate(data,route);
      const clientRes=await fetch(getClientUrl(data.client.slug),{cache:"no-store"});
      if(!clientRes.ok) throw new Error("No se encontró la configuración del cliente: "+data.client.slug);
      const clientConfig=await clientRes.json();
      if(!clientConfig||clientConfig.id!==data.client.id||clientConfig.slug!==data.client.slug||!clientConfig.name) throw new Error("La configuración del cliente no es válida.");
      if(clientConfig.status&&clientConfig.status!=="active") throw new Error("Este cliente no está activo.");
      if(clientConfig.name!==data.client.name) throw new Error("La identificación del cliente no coincide con su configuración.");
      quiz={...data.quiz,client:clientConfig,period:data.period,questions:data.questions,scoreMessages:(data.results&&data.results.scoreMessages)||[],results:data.results||{}};
      document.title=quiz.title||"Repaso de la semana";
      renderShell();showStartScreen();
    }catch(err){
      document.querySelector("main").innerHTML='<div class="summary-card"><h1 class="congrats-title">Quiz no disponible</h1><p class="congrats-subtitle">'+err.message+'</p><div class="final-buttons-container"><a class="review-btn-trigger" href="/">Volver al inicio</a></div></div>';
      console.error(err);
    }
  }
  function showStartScreen(){
    $("start-screen").hidden=false;$("quiz-content").hidden=true;
    $("start-title").textContent=quiz.title||"Repaso de la semana";
    $("start-subtitle").textContent=quiz.subtitle||"";
    $("start-purpose").textContent=quiz.startPurpose||"";
    $("question-count").textContent=quiz.questions.length+" preguntas";
    const b=quiz.buttons||{};$("start-btn").textContent=b.start||"Comenzar";
    $("start-btn").onclick=()=>{$("start-screen").hidden=true;$("quiz-content").hidden=false;renderQuestion();window.scrollTo({top:0,behavior:"smooth"});};
  }
  function renderShell(){
    $("quiz-title").textContent=quiz.title||"Repaso de la semana";$("quiz-subtitle").textContent=quiz.subtitle||"";
    const b=quiz.buttons||{},r=quiz.results||{};
    $("hint-btn-step").textContent=b.hint||"💡 Ver pista";$("next-btn").textContent=b.next||"Siguiente pregunta →";
    $("btn-review").textContent=b.review||"Revisar respuestas";$("btn-retry").textContent=b.retry||"Volver a repasar";
    $("btn-revive").textContent=b.revive||"Volver al mensaje";$("btn-retry-review").textContent=b.retryReview||b.retry||"Volver a repasar";
    $("results-title").textContent=r.title||"Repaso completado";$("results-subtitle").textContent=r.subtitle||"";
    $("correct-label").textContent=r.correctLabel||"Respuestas correctas";$("wrong-label").textContent=r.wrongLabel||"Para repasar";$("review-title").textContent=r.reviewTitle||"Revisión detallada";
    $("btn-revive").href=escUrl(quiz.videoUrl||"#");
  }
  function renderQuestion(){
    const q=quiz.questions[currentIdx],total=quiz.questions.length;
    $("progress-fill").style.width=((currentIdx+1)/total*100)+"%";$("progress-label").textContent=(currentIdx+1)+" de "+total;
    $("question-text").textContent=(currentIdx+1)+". "+q.question;
    const group=$("options-group");group.replaceChildren();$("feedback-area").style.display="none";$("next-btn").style.display="none";
    $("hint-box-step").style.display="none";$("hint-btn-step").style.display="inline-block";$("hint-btn-step").textContent=(quiz.buttons?.hint)||"💡 Ver pista";
    q.options.forEach((opt,idx)=>{const btn=document.createElement("button");btn.type="button";btn.className="option-btn";btn.textContent=opt;btn.addEventListener("click",()=>answer(idx,btn,q,group));group.appendChild(btn);});
    $("hint-btn-step").onclick=()=>{const box=$("hint-box-step"),visible=box.style.display==="block";box.textContent=visible?"":"Pista: "+(q.hint||"");box.style.display=visible?"none":"block";$("hint-btn-step").textContent=visible?(quiz.buttons?.hint||"💡 Ver pista"):(quiz.buttons?.hintHide||"Ocultar pista");};
  }
  function answer(idx,selected,q,group){
    const buttons=[...group.querySelectorAll(".option-btn")];if(buttons.some(b=>b.disabled))return;buttons.forEach(b=>b.disabled=true);$("hint-btn-step").style.display="none";
    const ok=idx===q.correctIndex;userAnswers.push({pregunta:q.question,seleccionada:q.options[idx],correcta:q.options[q.correctIndex],esCorrecta:ok,explicacion:q.explanation,cita:q.bible_ref||""});
    if(ok){selected.classList.add("correct-choice");aciertos++;}else{selected.classList.add("wrong-choice");buttons[q.correctIndex].classList.add("correct-choice");errores++;}
    const box=$("feedback-area");box.replaceChildren();const strong=document.createElement("div");strong.style.fontWeight="bold";strong.style.marginBottom="10px";strong.style.color=ok?"#137333":"#c5221f";strong.textContent=ok?"✓ Respuesta correcta":"Para repasar";box.append(strong);const expl=document.createElement("span");expl.textContent=q.explanation;box.append(expl);box.style.display="block";$("next-btn").style.display="block";setTimeout(()=>$("next-btn").scrollIntoView({behavior:"smooth",block:"center"}),120);
  }
  $("next-btn").onclick=()=>{currentIdx++;if(currentIdx<quiz.questions.length)renderQuestion();else finish();};
  function buildResult(){
    const total=quiz.questions.length,porcentaje=Math.round(aciertos/total*100);
    return {client:{id:quiz.client?.id||"",slug:quiz.client?.slug||"",name:quiz.client?.name||""},period:{year:quiz.period?.year??"",month:quiz.period?.month||""},quiz:{id:quiz.id||"",slug:quiz.slug||"",title:quiz.title||""},score:{correct:aciertos,wrong:errores,total,percent:porcentaje},answers:userAnswers.map((answer,index)=>({questionId:quiz.questions[index]?.id??null,question:answer.pregunta,selected:answer.seleccionada,correct:answer.correcta,isCorrect:answer.esCorrecta}))};
  }
  function publishResult(){const result=buildResult();window.quizResult=result;window.dispatchEvent(new CustomEvent("quiz:completed",{detail:result}));}
  function getCurrentScoreMessage(){
    const porcentaje=Math.round(aciertos/quiz.questions.length*100),messages=Array.isArray(quiz.scoreMessages)?quiz.scoreMessages:[];
    return messages.filter(m=>m&&Number.isFinite(Number(m.minPercent))).sort((a,b)=>Number(b.minPercent)-Number(a.minPercent)).find(m=>porcentaje>=Number(m.minPercent))||null;
  }
  function getShareUrl(){
    const porcentaje=Math.round(aciertos/quiz.questions.length*100);
    const params=new URLSearchParams({score:String(aciertos),total:String(quiz.questions.length),percent:String(porcentaje)});
    return new URL("/share/"+encodeURIComponent(quiz.client.slug)+"/"+encodeURIComponent(quiz.period.year)+"/"+encodeURIComponent(quiz.period.month)+"/"+encodeURIComponent(quiz.slug)+"?"+params.toString(),location.origin).href;
  }
  function getShareText(){
    const porcentaje=Math.round(aciertos/quiz.questions.length*100),nombre=quiz.title||"este repaso",message=getCurrentScoreMessage(),custom=message&&typeof message.shareText==="string"?message.shareText:"";
    const base=custom.replace(/\{title\}/g,nombre).replace(/\{correct\}/g,String(aciertos)).replace(/\{total\}/g,String(quiz.questions.length)).replace(/\{percent\}/g,String(porcentaje)).replace(/\{url\}/g,getShareUrl());
    return base||("🧠 Acabo de repasar «"+nombre+"» para mantener presente el mensaje durante la semana.\n\nMi resultado: "+aciertos+" de "+quiz.questions.length+" ("+porcentaje+"%).\n\nPuedes hacer el repaso aquí:\n"+getShareUrl());
  }
  function shareTo(url){window.open(url,"_blank","noopener,noreferrer");}
  async function copyShareText(){
    const text=getShareText();try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);$("share-status").textContent="Resultado copiado. Ya puedes compartirlo.";}else{const field=document.createElement("textarea");field.value=text;field.setAttribute("readonly","");field.style.position="fixed";field.style.opacity="0";document.body.append(field);field.select();const ok=document.execCommand("copy");field.remove();$("share-status").textContent=ok?"Resultado copiado. Ya puedes compartirlo.":"No se pudo copiar automáticamente. Usa Compartir o WhatsApp.";}}catch(e){$("share-status").textContent="No se pudo copiar automáticamente. Intenta con Compartir o WhatsApp.";}
  }
  async function nativeShare(){const text=getShareText(),url=getShareUrl();if(navigator.share){try{await navigator.share({title:quiz.title||"Repaso de la semana",text,url});$("share-status").textContent="";}catch(e){if(e&&e.name!=="AbortError")$("share-status").textContent="No se pudo abrir el menú de compartir.";}}else{$("share-status").textContent="El menú nativo no está disponible. Elige WhatsApp o copia el resultado.";}}
  function setupSharing(){
    const url=getShareUrl();
    $("btn-share-native").onclick=nativeShare;
    $("btn-share-whatsapp").onclick=()=>shareTo("https://wa.me/?text="+encodeURIComponent(getShareText()));
    $("btn-share-facebook").onclick=()=>shareTo("https://www.facebook.com/sharer/sharer.php?u="+encodeURIComponent(url));
    $("btn-share-x").onclick=()=>shareTo("https://twitter.com/intent/tweet?text="+encodeURIComponent(getShareText().replace(url,"").trim())+"&url="+encodeURIComponent(url));
    $("btn-share-copy").onclick=copyShareText;
  }
  function finish(){
    $("quiz-app").hidden=true;$("prog-container").hidden=true;$("progress-label").hidden=true;$("quiz-header").hidden=true;$("final-summary").hidden=false;
    $("stat-correct").textContent=aciertos;$("stat-wrong").textContent=errores;$("stat-percent").textContent=Math.round(aciertos/quiz.questions.length*100)+"%";
    const scoreMessage=getCurrentScoreMessage();if(scoreMessage){if(scoreMessage.title)$("results-title").textContent=scoreMessage.title;if(scoreMessage.subtitle)$("results-subtitle").textContent=scoreMessage.subtitle;}
    publishResult();setupSharing();
    if(Math.round(aciertos/quiz.questions.length*100)>=80&&window.confetti)window.confetti({particleCount:150,spread:70,origin:{y:.6}});
  }
  function showReview(){
    $("final-summary").hidden=true;$("review-screen").hidden=false;const list=$("review-list");list.replaceChildren();
    const intro=document.createElement("p");intro.className="review-intro";intro.textContent="Revisa cada respuesta para reforzar lo aprendido y mantener presente el mensaje durante la semana.";list.append(intro);
    userAnswers.forEach((ans,i)=>{const item=document.createElement("article");item.className="review-item "+(ans.esCorrecta?"rev-correct":"rev-wrong");const badge=document.createElement("div");badge.className="review-status";badge.textContent=ans.esCorrecta?"✓ Correcta":"Para repasar";item.append(badge);const q=document.createElement("div");q.className="review-question";q.textContent=(i+1)+". "+ans.pregunta;item.append(q);const sel=document.createElement("div");sel.className="review-answer";sel.textContent="Tu elección: ";const sv=document.createElement("span");sv.textContent=ans.seleccionada;sel.append(sv);item.append(sel);if(!ans.esCorrecta){const cor=document.createElement("div");cor.className="review-answer review-correct-answer";cor.textContent="Respuesta para recordar: ";const cv=document.createElement("span");cv.textContent=ans.correcta;cor.append(cv);item.append(cor);}const eb=document.createElement("div");eb.className="rev-expl-box";const st=document.createElement("strong");st.textContent="Explicación";eb.append(st);eb.append(document.createElement("br"));eb.append(document.createTextNode(ans.explicacion));if(ans.cita){const ref=document.createElement("span");ref.className="rev-bible";ref.textContent="📖 "+ans.cita;eb.append(ref);}item.append(eb);list.append(item);});
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function retry(){location.reload();}
  $("btn-review").onclick=showReview;$("btn-retry").onclick=retry;$("btn-retry-review").onclick=retry;
  load();
})();
