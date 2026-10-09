(function(){
  "use strict";
  const DEFAULT_SLUG="sabiduria";
  const $=id=>document.getElementById(id);
  let quiz=null,currentIdx=0,aciertos=0,errores=0,userAnswers=[],resultPngDataUrl="",attemptId="",attemptStartedAt=null,locale={};

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
  function formatText(value,vars={}){return String(value??"").replace(/\{(\w+)\}/g,(_,key)=>vars[key]===undefined?"":String(vars[key]));}
  function t(key,vars={}){return formatText(locale[key]||key,vars);}
  async function loadLocale(language){
    const lang=["es","en"].includes(language)?language:"es";
    try{const res=await fetch("/i18n/"+lang+".json",{cache:"no-store"});if(!res.ok)throw new Error("locale");locale=await res.json();}
    catch(e){if(lang!=="es"){const res=await fetch("/i18n/es.json",{cache:"no-store"});locale=await res.json();}else{locale={};}}
    document.documentElement.lang=lang;
  }
  function validate(data,route){
    if(!data||typeof data!=="object") throw new Error(t("errorInvalidJson"));
    if(!data.client||!data.client.id||!data.client.slug||!data.client.name) throw new Error(t("errorClient"));
    if(!data.period||data.period.year===undefined||!data.period.month) throw new Error(t("errorPeriod"));
    if(data.language!==undefined && !["es","en"].includes(data.language)) throw new Error("Invalid language. Use es or en.");
    if(!data.quiz||!data.quiz.id||!data.quiz.slug||!Array.isArray(data.questions)||!data.questions.length) throw new Error(t("errorQuiz"));
    if(data.status!==undefined && !["published","draft","archived"].includes(data.status)) throw new Error(t("errorStatus"));
    if(route.clientSlug!==data.client.slug||String(route.year)!==String(data.period.year)||route.month!==data.period.month||route.slug!==data.quiz.slug) throw new Error(t("errorRoute"));
    const ids=new Set();
    data.questions.forEach((q,i)=>{
      if(q.id===undefined||ids.has(String(q.id))) throw new Error(t("errorQuestionId",{number:i+1}));
      ids.add(String(q.id));
      if(!q.question||!Array.isArray(q.options)||q.options.length<2) throw new Error(t("errorQuestion",{number:i+1}));
      if(!Number.isInteger(q.correctIndex)||q.correctIndex<0||q.correctIndex>=q.options.length) throw new Error(t("errorCorrectIndex",{number:i+1}));
      if(!q.explanation) throw new Error(t("errorExplanation",{number:i+1}));
    });
  }
  async function load(){
    await loadLocale("es");
    const quizPath=getQuizPath(),route=getRouteMeta();
    const loading=$("loading-state");
    if(loading){loading.hidden=false;loading.textContent=t("loading");}
    try{
      const res=await fetch(getQuizUrl(),{cache:"no-store"}); if(!res.ok) throw new Error(t("errorQuizNotFound",{path:quizPath}));
      const data=await res.json(); await loadLocale(data.language||"es"); validate(data,route);
      if(data.status==="draft") throw new Error(t("errorDraft"));
      if(data.status==="archived") throw new Error(t("errorArchived"));
      const clientRes=await fetch(getClientUrl(data.client.slug),{cache:"no-store"});
      if(!clientRes.ok) throw new Error(t("errorClientConfig",{slug:data.client.slug}));
      const clientConfig=await clientRes.json();
      if(!clientConfig||clientConfig.id!==data.client.id||clientConfig.slug!==data.client.slug||!clientConfig.name) throw new Error(t("errorClientInvalid"));
      if(clientConfig.status&&clientConfig.status!=="active") throw new Error(t("errorClientInactive"));
      quiz={...data.quiz,language:data.language||"es",client:clientConfig,branding:clientConfig.branding||{},period:data.period,questions:data.questions,scoreMessages:(data.results&&data.results.scoreMessages)||[],shareLabel:(data.results&&data.results.shareLabel)||t("shareLabel")};
      document.title=quiz.title||"Quiz"; renderShell(); showStartScreen(); if($("loading-state"))$("loading-state").textContent=t("loading"); if(loading)loading.hidden=true; requestAnimationFrame(()=>$("start-btn")?.focus());
    }catch(err){ if(loading)loading.hidden=true; const main=document.querySelector("main"); main.replaceChildren(); const card=document.createElement("section"); card.className="summary-card"; const title=document.createElement("h1"); title.className="congrats-title"; title.textContent=t("unavailableTitle"); const message=document.createElement("p"); message.className="congrats-subtitle"; message.textContent=err.message; const actions=document.createElement("div"); actions.className="final-buttons-container"; const link=document.createElement("a"); link.className="review-btn-trigger"; link.href="/"; link.textContent=t("home"); actions.append(link); card.append(title,message,actions); main.append(card); console.error(err); }
  }
  function createAttemptId(){try{if(window.crypto&&typeof window.crypto.randomUUID==="function")return window.crypto.randomUUID();}catch(e){}return "attempt-"+Date.now()+"-"+Math.random().toString(36).slice(2,10);}
  function startAttempt(){attemptId=createAttemptId();attemptStartedAt=Date.now();}
  function showStartScreen(){
    $("start-screen").hidden=false;$("quiz-content").hidden=true;$("start-title").textContent=quiz.title||"Quiz";$("start-subtitle").textContent=quiz.subtitle||"";$("start-purpose").textContent=quiz.startPurpose||"";$("question-count").textContent=quiz.questions.length+" "+t("questionCount");
    const b=quiz.buttons||{};$("start-btn").textContent=b.start||t("start");$("start-btn").onclick=()=>{$("start-screen").hidden=true;$('quiz-content').hidden=false;renderQuestion();window.scrollTo({top:0,behavior:"smooth"});requestAnimationFrame(()=>$("question-text")?.focus());};
  }
  function applyClientBranding(){
    const b=quiz.branding||{},root=document.documentElement;
    const primary=b.primaryColor||"#2563eb",accent=b.accentColor||"#36c98f";
    root.style.setProperty("--brand-primary",primary);root.style.setProperty("--brand-accent",accent);
    if(b.lightBackground)root.style.setProperty("--brand-light-bg",b.lightBackground);
    if(b.darkBackground)root.style.setProperty("--brand-dark-bg",b.darkBackground);
    const displayName=b.displayName||quiz.client?.name||"",url=String(b.logoUrl||"").trim();
    [
      [$("start-client-brand"),$("start-client-logo"),$("start-client-name")],
      [$("client-brand"),$("client-logo"),$("client-name")],
      [$("final-client-brand"),$("final-client-logo"),$("final-client-name")],
      [$("review-client-brand"),$("review-client-logo"),$("review-client-name")]
    ].forEach(([brand,logo,name])=>{
      if(!brand||!name)return;
      name.textContent=displayName;
      if(url){logo.src=url;logo.alt=displayName;logo.hidden=false;}else{logo.hidden=true;}
      brand.hidden=false;
    });
  }
  function renderShell(){
    applyClientBranding();
    $("start-kicker").textContent=t("kicker");$("quiz-kicker").textContent=t("kicker");
    const metaTitle=quiz.shareLabel||t("shareLabel"),metaDescription=t("shareDescription");$("og-title")?.setAttribute("content",metaTitle);$("twitter-title")?.setAttribute("content",metaTitle);$("og-description")?.setAttribute("content",metaDescription);$("twitter-description")?.setAttribute("content",metaDescription);
    $("quiz-title").textContent=quiz.title||"Quiz";$("quiz-subtitle").textContent=quiz.subtitle||"";const b=quiz.buttons||{},r=quiz.results||{};
    $("hint-btn-step").textContent=b.hint||t("hint");$("next-btn").textContent=b.next||t("next");$("btn-review").textContent=b.review||t("review");$("btn-retry").textContent=b.retry||t("retry");$("btn-revive").textContent=b.revive||t("revive");$("btn-retry-review").textContent=b.retryReview||b.retry||t("retryReview");$("btn-revive-review").textContent=b.revive||t("revive");
    $("results-title").textContent=r.title||t("resultsTitle");$("results-subtitle").textContent=r.subtitle||"";$("correct-label").textContent=r.correctLabel||t("correct");$("wrong-label").textContent=r.wrongLabel||t("wrong");$("review-title").textContent=r.reviewTitle||t("reviewTitle");$("share-title").textContent=quiz.shareLabel;$("share-description").textContent=t("shareDescription");$("btn-share-image").textContent=t("shareButton");$("btn-download-image").textContent=t("downloadButton");
    $("btn-revive").href=escUrl(quiz.videoUrl||"#");$("btn-revive-review").href=escUrl(quiz.videoUrl||"#");
  }
  function renderQuestion(){
    const q=quiz.questions[currentIdx],total=quiz.questions.length;$("progress-fill").style.width=((currentIdx+1)/total*100)+"%";$("progress-label").textContent=t("progress",{current:currentIdx+1,total});$("question-text").textContent=(currentIdx+1)+". "+q.question;
    const group=$("options-group");group.replaceChildren();$("feedback-area").style.display="none";$("next-btn").style.display="none";$("hint-box-step").style.display="none";$("hint-btn-step").style.display="inline-block";$("hint-btn-step").textContent=(quiz.buttons?.hint)||t("hint");
    q.options.forEach((opt,idx)=>{const btn=document.createElement("button");btn.type="button";btn.className="option-btn";btn.textContent=opt;btn.addEventListener("click",()=>answer(idx,btn,q,group));group.appendChild(btn);});
    $("hint-btn-step").onclick=()=>{const box=$("hint-box-step"),visible=box.style.display==="block";box.textContent=visible?"":t("hintPrefix")+(q.hint||"");box.style.display=visible?"none":"block";$("hint-btn-step").textContent=visible?(quiz.buttons?.hint||t("hint")):(quiz.buttons?.hintHide||"Ocultar pista");};
  }
  function answer(idx,selected,q,group){
    const buttons=[...group.querySelectorAll(".option-btn")];if(buttons.some(b=>b.disabled))return;buttons.forEach(b=>b.disabled=true);$("hint-btn-step").style.display="none";const ok=idx===q.correctIndex;userAnswers.push({pregunta:q.question,seleccionada:q.options[idx],correcta:q.options[q.correctIndex],esCorrecta:ok,explicacion:q.explanation,cita:q.bible_ref||""});if(ok){selected.classList.add("correct-choice");aciertos++;}else{selected.classList.add("wrong-choice");buttons[q.correctIndex].classList.add("correct-choice");errores++;}const box=$("feedback-area");box.replaceChildren();const strong=document.createElement("div");strong.style.fontWeight="bold";strong.style.marginBottom="10px";strong.style.color=ok?"#137333":"#c5221f";strong.textContent=ok?t("correctFeedback"):t("wrongFeedback");box.append(strong);const expl=document.createElement("span");expl.textContent=q.explanation;box.append(expl);box.style.display="block";$("next-btn").style.display="block";setTimeout(()=>$("next-btn").scrollIntoView({behavior:"smooth",block:"center"}),120);
  }
  $("next-btn").onclick=()=>{currentIdx++;if(currentIdx<quiz.questions.length)renderQuestion();else finish();};
  function buildResult(){const total=quiz.questions.length,porcentaje=Math.round(aciertos/total*100),completedAt=new Date().toISOString(),durationSeconds=attemptStartedAt?Math.max(0,Math.round((Date.now()-attemptStartedAt)/1000)):null;return {event:"quiz_completed",schemaVersion:1,attemptId,completedAt,durationSeconds,route:getQuizPath(),client:{id:quiz.client?.id||"",slug:quiz.client?.slug||"",name:quiz.client?.name||""},period:{year:quiz.period?.year??"",month:quiz.period?.month||""},quiz:{id:quiz.id||"",slug:quiz.slug||"",title:quiz.title||""},score:{correct:aciertos,wrong:errores,total,percent:porcentaje},answers:userAnswers.map((answer,index)=>({questionId:quiz.questions[index]?.id??null,question:answer.pregunta,selected:answer.seleccionada,correct:answer.correcta,isCorrect:answer.esCorrecta}))};}
  function publishResult(){const result=buildResult();window.quizResult=result;window.dispatchEvent(new CustomEvent("quiz:completed",{detail:result}));saveStatistics(result);}
  async function saveStatistics(result){try{const response=await fetch("/api/quiz-completed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(result),keepalive:true});if(!response.ok)throw new Error("HTTP "+response.status);}catch(error){console.warn(t("statisticsUnavailable"),error);}}
  function getCurrentScoreMessage(){const porcentaje=Math.round(aciertos/quiz.questions.length*100);return (Array.isArray(quiz.scoreMessages)?quiz.scoreMessages:[]).filter(m=>m&&Number.isFinite(Number(m.minPercent))).sort((a,b)=>Number(b.minPercent)-Number(a.minPercent)).find(m=>porcentaje>=Number(m.minPercent))||null;}
  function getShareText(){const porcentaje=Math.round(aciertos/quiz.questions.length*100),nombre=quiz.title||"este contenido";const message=getCurrentScoreMessage(),custom=message&&typeof message.shareText==="string"?message.shareText:"";const base=custom.replace(/\{title\}/g,nombre).replace(/\{correct\}/g,String(aciertos)).replace(/\{total\}/g,String(quiz.questions.length)).replace(/\{percent\}/g,String(porcentaje)).replace(/\{url\}/g,location.href);return base||t("defaultShareText",{title:nombre,correct:aciertos,total:quiz.questions.length,percent:porcentaje,url:location.href});}
  function wrapCanvasText(ctx,text,maxWidth){const words=String(text||"").split(/\s+/);const lines=[];let line="";for(const word of words){const test=line?line+" "+word:word;if(ctx.measureText(test).width<=maxWidth)line=test;else{if(line)lines.push(line);line=word;}}if(line)lines.push(line);return lines;}
  function roundRect(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function loadShareLogo(){return new Promise(resolve=>{const url=String(quiz.branding?.logoUrl||"").trim();if(!url)return resolve(null);const img=new Image();img.crossOrigin="anonymous";img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=url;});}
  function drawCenteredWrappedText(ctx,text,maxWidth,startY,lineHeight,maxLines){const lines=wrapCanvasText(ctx,text,maxWidth).slice(0,maxLines);let y=startY;for(const line of lines){ctx.fillText(line,540,y);y+=lineHeight;}return lines.length;}
  async function drawShareCardCanvas(){
    const W=1080,H=1080,c=document.createElement("canvas");c.width=W;c.height=H;
    const ctx=c.getContext("2d");if(!ctx)throw new Error("Canvas no disponible");
    const logo=await loadShareLogo();
    const p=Math.round(aciertos/quiz.questions.length*100),m=getCurrentScoreMessage()||{};
    const client=quiz.branding?.displayName||quiz.client?.name||"";
    const title=quiz.title||"";
    const period=(quiz.period?.year||"")+" · "+(quiz.period?.month||"");
    const primary=quiz.branding?.primaryColor||"#4b9cff";
    const accent=quiz.branding?.accentColor||"#36c98f";

    // Fondo
    const bg=ctx.createLinearGradient(0,0,W,H);
    bg.addColorStop(0,quiz.branding?.darkBackground||"#0b1220");
    bg.addColorStop(.52,"#13243d");bg.addColorStop(1,"#08101d");
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    const glow=ctx.createRadialGradient(900,140,20,900,140,430);
    glow.addColorStop(0,"rgba(67,145,255,.25)");glow.addColorStop(1,"rgba(67,145,255,0)");
    ctx.fillStyle=glow;ctx.fillRect(520,0,560,560);
    const glow2=ctx.createRadialGradient(120,950,10,120,950,360);
    glow2.addColorStop(0,"rgba(40,197,135,.13)");glow2.addColorStop(1,"rgba(40,197,135,0)");
    ctx.fillStyle=glow2;ctx.fillRect(0,650,500,430);
    ctx.fillStyle=primary;ctx.fillRect(0,0,W,10);

    // Encabezado de marca
    let headerY=42;
    if(logo){
      try{
        const maxW=190,maxH=82;
        const nw=logo.naturalWidth||190,nh=logo.naturalHeight||82;
        const scale=Math.min(maxW/nw,maxH/nh,1),lw=nw*scale,lh=nh*scale;
        ctx.drawImage(logo,540-lw/2,headerY,lw,lh);
        headerY+=lh+22;
      }catch(e){}
    }
    ctx.textAlign="center";ctx.textBaseline="alphabetic";
    ctx.fillStyle="#f7f9fc";ctx.font="700 32px Arial, sans-serif";
    ctx.fillText(client,540,Math.max(126,headerY));
    ctx.fillStyle="#8fbfff";ctx.font="800 20px Arial, sans-serif";
    ctx.fillText((quiz.shareLabel||t("shareLabel")).toUpperCase(),540,Math.max(166,headerY+40));
    ctx.fillStyle="#91a1b7";ctx.font="700 19px Arial, sans-serif";
    ctx.fillText(period.toUpperCase(),540,Math.max(202,headerY+74));

    // Título dentro de una zona propia para evitar cortes y mejorar jerarquía
    const titleBoxY=236,titleBoxH=170;
    roundRect(ctx,70,titleBoxY,940,titleBoxH,30,"rgba(255,255,255,.055)","rgba(255,255,255,.10)");
    ctx.fillStyle="#ffffff";
    let titleFont=54;
    ctx.font="800 "+titleFont+"px Arial, sans-serif";
    let titleLines=wrapCanvasText(ctx,title,850);
    if(titleLines.length>3){titleFont=45;ctx.font="800 "+titleFont+"px Arial, sans-serif";titleLines=wrapCanvasText(ctx,title,850);}
    titleLines=titleLines.slice(0,3);
    const titleLineH=titleFont+8;
    const titleStart=titleBoxY+(titleBoxH-(titleLines.length*titleLineH))/2+titleFont-2;
    titleLines.forEach((line,i)=>ctx.fillText(line,540,titleStart+i*titleLineH));

    // Resultado
    const resultY=432;
    roundRect(ctx,76,resultY,928,330,38,"rgba(255,255,255,.075)","rgba(255,255,255,.13)");
    ctx.fillStyle="#8fbfff";ctx.font="800 20px Arial, sans-serif";ctx.fillText(t("canvasResult"),540,resultY+50);
    ctx.fillStyle="#ffffff";ctx.font="900 172px Arial, sans-serif";ctx.fillText(p+"%",540,resultY+202);
    ctx.fillStyle="#dce7f5";ctx.font="700 31px Arial, sans-serif";ctx.fillText(t("canvasResponses",{correct:aciertos,total:quiz.questions.length}),540,resultY+264);
    const barX=210,barY=resultY+286,barW=660,barH=12;
    roundRect(ctx,barX,barY,barW,barH,6,"rgba(255,255,255,.12)",null);
    const fillW=Math.max(12,barW*p/100);
    roundRect(ctx,barX,barY,fillW,barH,6,p>=80?accent:primary,null);

    // Mensaje personalizado
    const messageY=792,messageH=170;
    roundRect(ctx,76,messageY,928,messageH,30,"rgba(255,255,255,.095)","rgba(255,255,255,.12)");
    ctx.fillStyle="#ffffff";ctx.font="800 30px Arial, sans-serif";
    const msgTitle=String(m.title||t("canvasDefaultMessageTitle"));
    const msgTitleLines=wrapCanvasText(ctx,msgTitle,820).slice(0,1);
    ctx.fillText(msgTitleLines[0],540,messageY+48);
    ctx.fillStyle="#c7d2e2";ctx.font="500 24px Arial, sans-serif";
    const msgLines=wrapCanvasText(ctx,m.subtitle||t("canvasDefaultMessageSubtitle"),820).slice(0,2);
    let my=messageY+91;msgLines.forEach(line=>{ctx.fillText(line,540,my);my+=32;});

    ctx.fillStyle="#8fa0b5";ctx.font="700 18px Arial, sans-serif";
    ctx.fillText(t("canvasFooter"),540,1020);
    return c;
  }
  async function generateResultPng(){const canvas=await drawShareCardCanvas();return await new Promise((resolve,reject)=>canvas.toBlob(blob=>{if(!blob)return reject(new Error("No se pudo crear el PNG"));const reader=new FileReader();reader.onloadend=()=>{resultPngDataUrl=reader.result;resolve(resultPngDataUrl);};reader.onerror=()=>reject(new Error("No se pudo leer el PNG"));reader.readAsDataURL(blob);},"image/png"));}
  async function shareImage(){const btn=$("btn-share-image");if(btn.disabled)return;btn.disabled=true;btn.setAttribute("aria-busy","true");try{const dataUrl=resultPngDataUrl||await generateResultPng();const res=await fetch(dataUrl),blob=await res.blob(),file=new File([blob],"mi-resultado.png",{type:"image/png"});if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({title:quiz.title||"Mi resultado",text:getShareText(),files:[file]});$("share-status").textContent="";}else{$("share-status").textContent=t("shareFallback");}}catch(e){if(e&&e.name!=="AbortError"){$("share-status").textContent=t("shareError");console.error(e);}}finally{btn.disabled=false;btn.removeAttribute("aria-busy");}}
  async function downloadImage(){const btn=$("btn-download-image");if(btn.disabled)return;btn.disabled=true;btn.setAttribute("aria-busy","true");try{const dataUrl=resultPngDataUrl||await generateResultPng();const blob=await (await fetch(dataUrl)).blob();const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=(quiz.slug||"resultado")+"-resultado.png";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$("share-status").textContent=t("downloadSuccess");}catch(e){$("share-status").textContent=t("downloadError");console.error(e);}finally{btn.disabled=false;btn.removeAttribute("aria-busy");}}
  function setupSharing(){$("btn-share-image").onclick=shareImage;$("btn-download-image").onclick=downloadImage;}
  function finish(){$("quiz-app").hidden=true;$("prog-container").hidden=true;$("progress-label").hidden=true;$("quiz-header").hidden=true;$("final-summary").hidden=false;$("stat-correct").textContent=aciertos;$("stat-wrong").textContent=errores;$("stat-percent").textContent=Math.round(aciertos/quiz.questions.length*100)+"%";const porcentaje=Math.round(aciertos/quiz.questions.length*100),scoreMessage=getCurrentScoreMessage();if(scoreMessage){if(scoreMessage.title)$("results-title").textContent=scoreMessage.title;if(scoreMessage.subtitle)$("results-subtitle").textContent=scoreMessage.subtitle;}publishResult();setupSharing();requestAnimationFrame(()=>window.scrollTo({top:0,behavior:"smooth"}));if(porcentaje>=80&&window.confetti)window.confetti({particleCount:150,spread:70,origin:{y:.6}});requestAnimationFrame(()=>$("btn-review")?.focus());}
  function showReview(){$("final-summary").hidden=true;$("review-screen").hidden=false;const list=$("review-list");list.replaceChildren();const intro=document.createElement("p");intro.className="review-intro";intro.textContent=t("reviewIntro");list.append(intro);userAnswers.forEach((ans,i)=>{const item=document.createElement("article");item.className="review-item "+(ans.esCorrecta?"rev-correct":"rev-wrong");const badge=document.createElement("div");badge.className="review-status";badge.textContent=ans.esCorrecta?t("reviewCorrect"):t("reviewNeedsReview");item.append(badge);const q=document.createElement("div");q.className="review-question";q.textContent=(i+1)+". "+ans.pregunta;item.append(q);const sel=document.createElement("div");sel.className="review-answer";sel.textContent=t("selectedAnswer");const sv=document.createElement("span");sv.textContent=ans.seleccionada;sel.append(sv);item.append(sel);if(!ans.esCorrecta){const cor=document.createElement("div");cor.className="review-answer review-correct-answer";cor.textContent=t("correctAnswer");const cv=document.createElement("span");cv.textContent=ans.correcta;cor.append(cv);item.append(cor);}const eb=document.createElement("div");eb.className="rev-expl-box";const st=document.createElement("strong");st.textContent=t("explanation");eb.append(st);eb.append(document.createElement("br"));eb.append(document.createTextNode(ans.explicacion));if(ans.cita){const ref=document.createElement("span");ref.className="rev-bible";ref.textContent="📖 "+ans.cita;eb.append(ref);}item.append(eb);list.append(item);});window.scrollTo({top:0,behavior:"smooth"});requestAnimationFrame(()=>$("review-title")?.focus());}
  function retry(){location.reload();}
  $("btn-review").onclick=showReview;$("btn-retry").onclick=retry;$("btn-retry-review").onclick=retry;load();
})();
