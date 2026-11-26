/* Sport LIVE APP — telecomando dal telefono.
   Lo schermo grande (TV, monitor) mostra un QR; il telefono lo inquadra e apre #/remote?k=canale.
   I comandi viaggiano su ntfy.sh (servizio pubblico gratuito, niente account): il telefono pubblica sul canale,
   lo schermo ascolta e risponde con la pagina che sta mostrando. Il canale ha un nome casuale e non conserva i messaggi. */
(function(){
"use strict";
const h=SL.h,$=id=>document.getElementById(id);
const RM=SL.remote={};
const BASE=()=>SL.store.get("remoteBase","https://ntfy.sh");
const SPORTS=["home","calcio","basket","tennis","rugby","moto","golf"];
const newKey=()=>{const A="abcdefghijkmnpqrstuvwxyz23456789";let s="slr-";const r=new Uint8Array(18);crypto.getRandomValues(r);r.forEach(x=>s+=A[x%A.length]);return s;};
const link=k=>location.origin+location.pathname+"#/remote?k="+k;
/* invio: testo semplice (niente richiesta preliminare del browser), messaggi non conservati */
RM.send=(topic,obj)=>fetch(BASE()+"/"+encodeURIComponent(topic)+"?cache=no",{method:"POST",body:JSON.stringify(obj),credentials:"omit"}).catch(()=>{});
/* ascolto: EventSource si ricollega da solo; ogni messaggio ha un id per non eseguirlo due volte */
function listen(topic,onMsg){const done=new Set(),t0=Date.now()/1000-5;let es=null,closed=false;
  const open=()=>{if(closed)return;try{es=new EventSource(BASE()+"/"+encodeURIComponent(topic)+"/sse");}catch(e){return;}
    es.onmessage=ev=>{let m;try{m=JSON.parse(ev.data);}catch(e){return;}if(m.event&&m.event!=="message")return;if(done.has(m.id)||(m.time&&m.time<t0))return;done.add(m.id);
      let c;try{c=JSON.parse(m.message);}catch(e){return;}onMsg(c);};
    es.onerror=()=>{if(es&&es.readyState===2){es=null;setTimeout(open,4000);}};};
  open();return{close(){closed=true;if(es)es.close();}};}

/* =====================================================================
   SCHERMO GRANDE: ascolta i comandi, mostra il QR nell'angolo
   ===================================================================== */
let rx=null,stT=0;
const key=()=>SL.store.get("remote.k","");
RM.on=()=>!!SL.store.get("remote.on",false)&&!!key();
function state(){const st=SL.state||{},m=SL.sports[st.sport]||{};
  return{c:"state",hash:location.hash,title:st.sport==="home"?"Home · Live ora":(m.name||""),sport:st.sport,sync:Math.round(SL.syncMs()/1000),style:SL.settings.style,ticker:!$("ticker").hidden};}
function sendState(){clearTimeout(stT);stT=setTimeout(()=>{if(RM.on())RM.send(key()+"-tv",state());},600);}
function exec(c){if(!c||!c.c)return;
  if(c.c==="go"&&c.go&&SPORTS.concat(["agenda","multi"]).indexOf(c.go.sport)>=0){SL.go(c.go);SL.toast("📱 Telecomando: "+((SL.sports[c.go.sport]||{}).name||""));}
  else if(c.c==="back")history.back();
  else if(c.c==="scroll")window.scrollBy({top:(c.d||1)*Math.round(innerHeight*.7),behavior:"smooth"});
  else if(c.c==="top")window.scrollTo({top:0,behavior:"smooth"});
  else if(c.c==="ticker"){const b=$("btnTicker");if(b)b.click();}
  else if(c.c==="style"&&(c.v==="regia"||c.v==="pitwall")){SL.settings.style=c.v;SL.saveSettings();SL.applyLook();SL.emit("resize");}
  else if(c.c==="sync"&&SL.extra){SL.extra.setSync(c.v);}
  sendState();}
function corner(){const b=$("rmCorner");if(!b)return;b.hidden=!RM.on();if(b.hidden)return;
  if(!b.dataset.k||b.dataset.k!==key()){b.dataset.k=key();b.innerHTML='<span class="rmlab">'+SL.ico("remote")+'TELECOMANDO</span><span class="rmq"></span>';
    SL.extra.qr(link(key()),110).then(svg=>{const q=b.querySelector(".rmq");if(q)q.innerHTML=svg;}).catch(()=>{});}}
RM.start=function(){if(!key())SL.store.set("remote.k",newKey());SL.store.set("remote.on",true);
  if(rx)rx.close();rx=listen(key(),exec);corner();sendState();};
RM.stop=function(){SL.store.set("remote.on",false);if(rx){rx.close();rx=null;}corner();SL.toast("Telecomando spento.");};
RM.openQr=async function(){if(!RM.on())RM.start();const d=$("dlgRemote");$("rmLink").textContent=link(key());$("rmQrBig").innerHTML='<div class="loading">Creo il QR</div>';if(!d.open)d.showModal();
  try{$("rmQrBig").innerHTML=await SL.extra.qr(link(key()),300)+'<small>Inquadralo con la fotocamera del telefono</small>';}catch(e){$("rmQrBig").innerHTML='<p class="hint">QR non disponibile: apri il link qui sotto sul telefono.</p>';}};

/* =====================================================================
   TELEFONO: pagina #/remote?k=canale
   ===================================================================== */
const SPN={home:"Live ora",calcio:"Calcio",basket:"Basket",tennis:"Tennis",rugby:"Rugby",moto:"Motori",golf:"Golf"};
SL.sports.remote={name:"Telecomando",page:true,noHead:true,tickerAs:"home",mount(ctx){
  const main=ctx.main,k=String(ctx.st.k||"").replace(/[^\w-]/g,""),$=id=>main.querySelector("#"+id);
  if(!/^slr-\w{10,}$/.test(k)){main.innerHTML='<div class="vpage"><div class="empty">Questo telecomando non ha un canale valido. Inquadra di nuovo il QR mostrato sullo schermo grande (⚙ Impostazioni → Telecomando dal telefono).</div></div>';return;}
  const send=obj=>{RM.send(k,obj);if(navigator.vibrate)try{navigator.vibrate(15);}catch(e){}};
  main.innerHTML='<div class="vpage rmpage">'+
    '<div class="rmstat" id="rmStat"><i class="led"></i><span id="rmTv">Cerco lo schermo… (deve avere il telecomando attivo)</span></div>'+
    '<h2 class="rmh">Sport</h2><div class="rmsp">'+SPORTS.map(s=>'<button type="button" class="rmb sp-'+s+'" data-sp="'+s+'">'+SL.ico(s)+'<span>'+h(SPN[s])+'</span></button>').join("")+
      '<button type="button" class="rmb" data-sp="agenda">'+SL.ico("cal")+'<span>Settimana</span></button><button type="button" class="rmb" data-sp="multi">'+SL.ico("grid")+'<span>Vista 2×2</span></button></div>'+
    '<h2 class="rmh">Comandi</h2><div class="rmctl">'+
      '<button type="button" class="rmb" data-c="back">‹<span>Indietro</span></button><button type="button" class="rmb" data-c="top">⤒<span>In cima</span></button>'+
      '<button type="button" class="rmb" data-c="scroll" data-d="-1">▲<span>Su</span></button><button type="button" class="rmb" data-c="scroll" data-d="1">▼<span>Giù</span></button>'+
      '<button type="button" class="rmb" data-c="ticker">≡<span>Notizie</span></button><button type="button" class="rmb" data-c="style">◐<span id="rmStyle">Stile</span></button>'+
      '<button type="button" class="rmb" data-c="sync" data-d="-5">−5 s<span>TV SYNC</span></button><button type="button" class="rmb" data-c="sync" data-d="5">+5 s<span id="rmSync">TV SYNC</span></button></div>'+
    '<h2 class="rmh">In diretta adesso</h2><div class="rmlive" id="rmLive"><div class="loading">Carico</div></div></div>';
  let tv=null;
  const drawTv=()=>{$("rmTv").innerHTML=tv?'Sullo schermo: <b>'+h(tv.title)+'</b>':"Cerco lo schermo… (deve avere il telecomando attivo)";$("rmStat").classList.toggle("ok",!!tv);
    $("rmStyle").textContent=tv&&tv.style==="regia"?"Pit Wall":"Regia TV";$("rmSync").textContent=tv?"ora "+(tv.sync||0)+" s":"TV SYNC";
    main.querySelectorAll("[data-sp]").forEach(b=>b.setAttribute("aria-pressed",String(!!tv&&b.dataset.sp===tv.sport)));};
  const sub=listen(k+"-tv",c=>{if(c.c==="state"){tv=c;drawTv();}});SL.onCleanup(()=>sub.close());
  send({c:"ping"});SL.every(()=>{if(!tv)send({c:"ping"});},8000,{delay:8000});
  const drawLive=()=>{const L=[].concat(...["calcio","basket","tennis","rugby","moto","golf"].map(s=>SL.live.bySport[s]||[])).filter(x=>x.live).sort((a,b)=>b.important-a.important).slice(0,10);
    $("rmLive").innerHTML=L.length?L.map(it=>{const l=it.lines||[];const t=l.length>=2&&l.every(x=>x.pos==null)?l.slice(0,2).map(x=>x.n+(x.v!=null&&x.v!==""?" "+x.v:"")).join(" – "):(it.comp||"");
      return'<button type="button" class="rmev sp-'+it.sport+'" data-go="'+h(JSON.stringify(it.go||{sport:it.sport}))+'">'+SL.ico(it.sport)+'<span><b>'+h(t)+'</b><small>'+h(it.comp||"")+' · '+h(it.status||"LIVE")+(it.sport==="calcio"&&it.ev&&SL.espn.lastGoal(it.ev)?' · ⚽ '+h(SL.espn.lastGoal(it.ev)):"")+'</small></span></button>';}).join(""):
      '<p class="muted">'+(["calcio","basket","tennis"].some(s=>SL.live.loaded[s])?"Nessun evento in diretta adesso.":"Carico…")+'</p>';};
  drawLive();SL.onPage("live",drawLive);
  main.addEventListener("click",e=>{
    const sp=e.target.closest("[data-sp]");if(sp){send({c:"go",go:{sport:sp.dataset.sp}});return;}
    const c=e.target.closest("[data-c]");if(c){const cmd=c.dataset.c;
      if(cmd==="scroll")send({c:"scroll",d:+c.dataset.d});
      else if(cmd==="style")send({c:"style",v:tv&&tv.style==="regia"?"pitwall":"regia"});
      else if(cmd==="sync")send({c:"sync",v:Math.max(0,Math.min(90,(tv&&tv.sync||0)+(+c.dataset.d)))});
      else send({c:cmd});return;}
    const g=e.target.closest("[data-go]");if(g){try{send({c:"go",go:JSON.parse(g.dataset.go)});}catch(x){}}});
}};

/* ---------- avvio ---------- */
function init(){
  const sb=$("setRemote");if(sb)sb.addEventListener("click",()=>{SL.ui&&$("dlgSettings").close();RM.openQr();});
  const off=$("rmOff");if(off)off.addEventListener("click",()=>{$("dlgRemote").close();RM.stop();});
  const cb=$("rmCorner");if(cb)cb.addEventListener("click",RM.openQr);
  /* lo schermo grande risponde anche al "ping" del telefono: è un comando come gli altri */
  if(RM.on()&&!window.isFollower())setTimeout(RM.start,1500);
  window.addEventListener("hashchange",()=>{if(RM.on())sendState();});
  window.addEventListener("popstate",()=>{if(RM.on())sendState();});
  const og=SL.go;SL.go=function(){const r=og.apply(this,arguments);if(RM.on())sendState();return r;};
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
