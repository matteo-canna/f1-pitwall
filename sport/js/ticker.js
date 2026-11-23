/* Sport LIVE APP — striscia di notizie che scorre sotto il menu
   Home: tutti gli sport. Pagina di uno sport: solo quello.
   Contenuto: partite in diretta, risultati di oggi, prossimi eventi e "fatti" dello sport (capolista, ultimo vincitore…).
   Si nasconde con un pulsante; la scelta resta salvata. */
(function(){
"use strict";
const h=SL.h,TK=SL.ticker={};
const SPORTS=["calcio","basket","tennis","rugby","moto","golf"];
const NAMES={calcio:"Calcio",basket:"Basket",tennis:"Tennis",rugby:"Rugby",moto:"Motori",golf:"Golf"};

/* ---------- "fatti" di ogni sport (capolista, ultimo risultato, prossimo evento…) ---------- */
const fcache={};
TK.facts=async function(sport,st){
  const m=SL.sports[sport];if(!m||!m.facts)return[];
  const key=sport+":"+((st&&(st.c||st.s))||"");const c=fcache[key];
  if(c&&Date.now()-c.t<600000)return c.v;
  if(c&&c.p)return c.p;
  const p=(async()=>{let v=[];try{v=(await m.facts(st||{}))||[];}catch(e){console.warn("fatti",sport,e);}fcache[key]={t:Date.now(),v};return v;})();
  fcache[key]=Object.assign(c||{t:0,v:[]},{p});return p;
};
TK.cachedFacts=(sport,st)=>{const c=fcache[sport+":"+((st&&(st.c||st.s))||"")];return c?c.v:[];};

/* ---------- elementi della striscia ---------- */
function line(it){
  const L=it.lines||[];if(!L.length)return h(it.comp||"");
  if(it.sport==="moto"||it.sport==="golf")return L.map(l=>h((l.pos!=null?l.pos+(String(l.pos).match(/\d$/)?".":"")+" ":"")+l.n)+(l.v?" <b>"+h(l.v)+"</b>":"")).join(" · ");
  const a=L[0],b=L[1]||{};const num=x=>x!=null&&x!==""&&!isNaN(+x);
  if(num(a.v)&&num(b.v))return h(a.n)+" <b>"+h(a.v)+"-"+h(b.v)+"</b> "+h(b.n);
  if(a.v||b.v)return h(a.n)+" <b>"+h(a.v||"")+"</b> – "+h(b.n)+" <b>"+h(b.v||"")+"</b>";
  return h(a.n)+" – "+h(b.n);
}
function eventItems(sport,limit){
  const L=(SL.live.bySport[sport]||[]).slice(),now=Date.now(),out=[];
  L.filter(x=>x.live).sort((a,b)=>(b.important-a.important)).forEach(x=>out.push({s:sport,tag:x.status&&x.status!=="LIVE"?"LIVE "+x.status:"LIVE",cls:"live",txt:line(x),sub:x.comp,go:x.go,imp:x.important}));
  L.filter(x=>x.done&&now-new Date(x.date)<10*36e5).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,limit).forEach(x=>out.push({s:sport,tag:x.tk||"FINALE",cls:"fin",txt:line(x),sub:x.comp,go:x.go,imp:x.important}));
  L.filter(x=>x.state==="pre"&&new Date(x.date)-now<12*36e5).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,limit).forEach(x=>out.push({s:sport,tag:x.tk||"ORE "+SL.fmtTime(x.date),cls:"pre",txt:line(x),sub:x.comp,go:x.go,imp:x.important}));
  return out;
}
function factItems(sport,st){return TK.cachedFacts(sport,st).map(f=>({s:sport,tag:f.l,cls:"fact",txt:h(f.v),go:f.go}));}
function build(page){
  if(page==="home"){
    const ev=[];SPORTS.forEach(s=>eventItems(s,4).forEach(x=>ev.push(x)));
    const live=ev.filter(x=>x.cls==="live").sort((a,b)=>b.imp-a.imp),rest=ev.filter(x=>x.cls!=="live");
    const facts=[];SPORTS.forEach(s=>factItems(s,{}).slice(0,2).forEach(x=>facts.push(x)));
    /* mescola: prima i live, poi alterna risultati/prossimi e fatti */
    const mix=[];const n=Math.max(rest.length,facts.length);for(let i=0;i<n;i++){if(rest[i])mix.push(rest[i]);if(facts[i])mix.push(facts[i]);}
    return live.concat(mix);
  }
  return eventItems(page,12).concat(factItems(page,SL.state));
}
function render(items){
  if(!items.length)return'<span class="tk-it tk-empty">Nessuna notizia per ora: appena ci sono partite o risultati compaiono qui.</span>';
  return items.map(it=>'<button type="button" class="tk-it sp-'+it.s+'"'+(it.go?' data-go="'+h(JSON.stringify(it.go))+'"':"")+'>'+SL.ico(it.s)+'<span class="tk-tag '+it.cls+'">'+h(it.tag)+'</span><span class="tk-tx">'+it.txt+'</span>'+(it.sub&&it.cls!=="fact"?'<span class="tk-sub">'+h(it.sub)+'</span>':"")+'</button>').join('<span class="tk-sep" aria-hidden="true">◆</span>');
}

/* ---------- animazione: scorre a velocità costante; il contenuto nuovo entra a fine giro ---------- */
let pending=null,shown="",shownEmpty=true,page="home";
const $=id=>document.getElementById(id);
function apply(html){
  const tr=$("tkTrack");if(!tr)return;shown=html;shownEmpty=html.indexOf("tk-empty")>=0;pending=null;
  tr.innerHTML='<div class="tk-run">'+html+'</div><div class="tk-run" aria-hidden="true">'+html+'</div>';
  tr.querySelectorAll('.tk-run[aria-hidden] button').forEach(b=>b.tabIndex=-1);
  requestAnimationFrame(()=>{const w=tr.firstChild.getBoundingClientRect().width;tr.style.setProperty("--tkdur",Math.max(18,w/65).toFixed(1)+"s");tr.classList.remove("go");void tr.offsetWidth;tr.classList.add("go");});
}
TK.update=function(force){
  const box=$("ticker");if(!box||box.hidden)return;
  const html=render(build(page));if(html===shown&&!force)return;
  const tr=$("tkTrack");
  /* se sta mostrando "nessuna notizia" il contenuto nuovo entra subito, altrimenti a fine giro (niente salti) */
  if(force||!shown||shownEmpty||!tr.classList.contains("go")||matchMedia("(prefers-reduced-motion: reduce)").matches)apply(html);else pending=html;
};
TK.page=function(p){page=p;const lab=$("tkLabel");if(lab)lab.innerHTML=SL.ico(p)+(p==="home"?"ULTIME":h((NAMES[p]||"").toUpperCase()));
  TK.update(true);
  /* carica i fatti dello sport (o di tutti, in home) e aggiorna */
  const list=p==="home"?SPORTS:[p];
  const t0=Date.now();
  setTimeout(()=>{Promise.all(list.map(s=>TK.facts(s,p==="home"?{}:SL.state))).then(()=>{if(page===p)TK.update(Date.now()-t0<8000);});},p==="home"?2500:300);
};
TK.show=function(on){SL.settings.ticker=on;SL.saveSettings();const box=$("ticker");box.hidden=!on||window.isFollower();
  const b=$("btnTicker");if(b)b.setAttribute("aria-pressed",String(on));if(on)TK.update(true);};
TK.init=function(){
  const box=$("ticker");if(!box)return;
  if(SL.settings.ticker===undefined)SL.settings.ticker=true;
  box.hidden=!SL.settings.ticker||window.isFollower();
  const b=$("btnTicker");if(b)b.setAttribute("aria-pressed",String(!!SL.settings.ticker));
  $("tkHide").addEventListener("click",()=>{TK.show(false);SL.toast("Striscia nascosta. Per riaprirla usa il pulsante ≡ NOTIZIE in alto.");});
  if(b)b.addEventListener("click",()=>TK.show(!SL.settings.ticker));
  $("tkTrack").addEventListener("animationiteration",()=>{if(pending)apply(pending);});
  box.addEventListener("click",e=>{const it=e.target.closest(".tk-it[data-go]");if(!it)return;try{SL.go(JSON.parse(it.dataset.go));}catch(x){}});
  SL.on("live",()=>TK.update(false));
};
})();
