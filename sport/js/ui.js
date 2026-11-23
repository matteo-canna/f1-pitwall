/* Sport LIVE APP — interfaccia comune: schede S/M/L, schermo intero, impostazioni, multi-schermo, Diretta TV */
(function(){
"use strict";
const $=SL.$,h=SL.h;
const SZN={1:"S",2:"M",3:"L"};
const UI=SL.ui={sport:null,defs:[],cards:{}};

UI.reset=function(sport){UI.sport=sport;UI.defs=[];UI.cards={};document.body.classList.remove("has-full");};
UI.sizes=()=>{const q=SL.qs.get("sz");if(q&&window.isFollower()){const o={};q.split(",").forEach(p=>{const [k,v]=p.split(":");o[k]=+v;});return o;}return SL.store.get("sz."+UI.sport,{});};
UI.setSize=(k,v)=>{const s=SL.store.get("sz."+UI.sport,{});s[k]=v;SL.store.set("sz."+UI.sport,s);};
UI.hidden=()=>SL.store.get("hid."+UI.sport,[]);
UI.localSolo=()=>SL.store.sget("msolo."+UI.sport,null);

/* crea le schede di una pagina. defs: [{k,n,sz,couch,flush}] — ritorna {k:{el,body,sub(),tools}} */
UI.mount=function(main,defs){
  UI.defs=defs;const sz=UI.sizes(),hid=UI.hidden(),couch=SL.couch(),all=SL.store.get("couchAll",false);
  const solo=SL.solo||UI.localSolo();
  const out={};let hiddenCouch=0;const hiddenUser=[];
  defs.forEach(d=>{
    let show=true;
    if(solo)show=solo.indexOf(d.k)>=0;
    else if(d.fixed)show=true; /* la Diretta TV si vede sempre */
    else if(hid.indexOf(d.k)>=0){show=false;hiddenUser.push(d);}
    else if(couch&&d.couch===false&&!all){show=false;hiddenCouch++;}
    const el=document.createElement("article");el.className="card";el.dataset.k=d.k;el.dataset.sz=String(d.fixed?d.sz:(sz[d.k]||d.sz||2));if(d.fixed)el.classList.add("fixed");
    el.innerHTML='<header><h2>'+h(d.n)+'</h2><span class="sub"></span><div class="tools"></div><button type="button" class="mbtn" aria-label="Opzioni sezione '+h(d.n)+'" title="Misura e schermo intero">⋯</button></header><div class="body'+(d.flush?" flush":"")+'"><div class="loading">Carico</div></div>';
    if(!show)el.hidden=true;
    main.appendChild(el);
    const c={el,def:d,body:el.querySelector(".body"),tools:el.querySelector(".tools"),shown:show,
      sub(t){el.querySelector(".sub").textContent=t||"";},
      title(t){el.querySelector("h2").textContent=t;}};
    el.querySelector(".mbtn").addEventListener("click",ev=>{ev.stopPropagation();UI.menu(c);});
    out[d.k]=c;UI.cards[d.k]=c;
  });
  /* in fondo: sezioni nascoste */
  const extra=document.createElement("div");extra.style.gridColumn="1/-1";extra.className="row";
  if(solo&&!SL.solo){extra.innerHTML='<span class="tag">MULTI-SCHERMO ATTIVO</span><span class="muted">Qui vedi solo le sezioni assegnate a questo schermo.</span><button type="button" class="btn" id="unsolo">MOSTRA TUTTO</button>';}
  else if(!solo){
    let s="";
    if(hiddenCouch)s+='<button type="button" class="btn" id="couchAll">＋ ALTRE SEZIONI ('+hiddenCouch+')</button>';
    else if(couch&&all)s+='<button type="button" class="btn" id="couchLess">－ SOLO LE PRINCIPALI</button>';
    if(hiddenUser.length)s+='<span class="muted">Nascoste:</span>'+hiddenUser.map(d=>'<button type="button" class="chip" data-unhide="'+d.k+'">＋ '+h(d.n)+'</button>').join("");
    extra.innerHTML=s;}
  if(extra.innerHTML)main.appendChild(extra);
  extra.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
    if(b.id==="couchAll"){SL.store.set("couchAll",true);SL.route();}
    if(b.id==="couchLess"){SL.store.set("couchAll",false);SL.route();}
    if(b.id==="unsolo"){SL.store.sset("msolo."+UI.sport,null);SL.route();}
    if(b.dataset.unhide){SL.store.set("hid."+UI.sport,UI.hidden().filter(k=>k!==b.dataset.unhide));SL.route();}});
  return out;
};
UI.menu=function(c){
  document.querySelectorAll(".menu").forEach(m=>m.remove());
  const cur=+c.el.dataset.sz,m=document.createElement("div");m.className="menu";m.setAttribute("role","menu");
  m.innerHTML=c.def.fixed?'<button type="button" data-a="full">⛶ SCHERMO INTERO</button>':[1,2,3].map(v=>'<button type="button" data-sz="'+v+'" aria-pressed="'+(cur===v)+'">'+SZN[v]+'</button>').join("")+
    '<button type="button" data-a="full">⛶ INTERO</button>'+(SL.solo?"":'<button type="button" data-a="hide">NASCONDI</button>');
  c.el.appendChild(m);m.querySelector("button").focus();
  m.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;e.stopPropagation();
    if(b.dataset.sz){c.el.dataset.sz=b.dataset.sz;if(!SL.solo)UI.setSize(c.def.k,+b.dataset.sz);SL.emit("resize");}
    if(b.dataset.a==="full")UI.enterFull(c);
    if(b.dataset.a==="hide"){const hd=UI.hidden();hd.push(c.def.k);SL.store.set("hid."+UI.sport,hd);SL.route();return;}
    m.remove();});
  setTimeout(()=>document.addEventListener("click",function f(){m.remove();document.removeEventListener("click",f);}),0);
};
UI.enterFull=function(c){c.el.classList.add("full");document.body.classList.add("has-full");
  let x=c.el.querySelector(".xfull");if(!x){x=document.createElement("button");x.type="button";x.className="btn xfull";x.textContent="✕ ESCI";x.addEventListener("click",()=>UI.exitFull(c.el));c.tools.appendChild(x);}
  x.hidden=false;x.focus();SL.emit("resize");};
UI.exitFull=function(el){el.classList.remove("full");document.body.classList.remove("has-full");const x=el.querySelector(".xfull");if(x)x.hidden=true;SL.emit("resize");el.querySelector(".mbtn").focus();};
/* bottoni a segmenti dentro l'intestazione della scheda */
UI.seg=function(c,opts,val,on){const w=document.createElement("div");w.className="seg2";w.setAttribute("role","group");
  w.innerHTML=opts.map(o=>'<button type="button" data-v="'+h(o[0])+'" aria-pressed="'+(o[0]===val)+'">'+h(o[1])+'</button>').join("");
  w.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;w.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));on(b.dataset.v);});
  c.tools.prepend(w);return w;};
UI.empty=(t)=>'<div class="empty">'+t+'</div>';

/* ---------- sottobarra: competizioni e giorno ---------- */
UI.chips=function(items,cur,on,extraCls){const w=document.createElement("div");w.className="chips "+(extraCls||"");
  w.innerHTML=items.map(it=>'<button type="button" class="chip'+(it.hot?" hot"+(it.c?"":" zero"):"")+'"'+(it.hot?' data-sp="'+h(it.hot)+'"':"")+' data-v="'+h(it.k)+'" aria-pressed="'+(it.k===cur)+'">'+(it.live||it.hot?'<i class="lv" title="in diretta"></i>':"")+(it.ic?SL.ico(it.ic):"")+h(it.n)+(it.c!=null?' <span class="n">'+it.c+'</span>':"")+'</button>').join("");
  w.addEventListener("click",e=>{const b=e.target.closest("button");if(b)on(b.dataset.v);});return w;};
/* filtro "Live ora": eventi in corso adesso in tutte le competizioni dello sport; il numero si aggiorna da solo */
UI.liveCount=sport=>(SL.live.bySport[sport]||[]).filter(x=>x.live).length;
UI.liveChip=sport=>({k:"live",n:"Live ora",hot:sport,c:UI.liveCount(sport)});
UI.refreshLiveChips=()=>document.querySelectorAll(".chip.hot[data-sp]").forEach(b=>{const n=UI.liveCount(b.dataset.sp);const el=b.querySelector(".n");if(el)el.textContent=n;b.classList.toggle("zero",!n);});
UI.liveNote=t=>{const s=document.createElement("span");s.className="muted";s.innerHTML='<span class="tag live">LIVE</span> '+h(t);return s;};
/* con la Diretta TV in pagina, la barra di competizioni e partite le si affianca a destra */
UI.dock=(sub,main)=>{if(!SL.solo&&main.querySelector('.card[data-k="tv"]:not([hidden])')){sub.classList.add("ingrid");main.prepend(sub);}};
UI.daynav=function(off,on){const w=document.createElement("div");w.className="daynav";const d=SL.addDays(Date.now(),off);
  w.innerHTML='<button type="button" data-d="-1" aria-label="Giorno precedente">‹</button><button type="button" class="cur" data-d="0">'+h(off===0?"Oggi · "+SL.fmtDay(d):SL.relDay(d)===SL.fmtDay(d)?SL.fmtDay(d):SL.relDay(d)+" · "+SL.fmtDay(d))+'</button><button type="button" data-d="1" aria-label="Giorno successivo">›</button>';
  w.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const v=+b.dataset.d;on(v===0?0:off+v);});return w;};

/* =====================================================================
   Impostazioni
   ===================================================================== */
function segInit(id,val,on){const w=$(id);w.querySelectorAll("button").forEach(b=>{b.setAttribute("aria-pressed",String(b.dataset.v===val));b.onclick=()=>{w.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));on(b.dataset.v);};});}
UI.openSettings=function(){
  const S=SL.settings;
  segInit("setStyle",S.style,v=>{S.style=v;SL.saveSettings();SL.applyLook();bcLook();SL.emit("resize");});
  segInit("setCouch",S.couch,v=>{S.couch=v;SL.saveSettings();SL.applyLook();bcLook();couchNow();SL.route();});
  segInit("setAlerts",S.alerts,v=>{S.alerts=v;SL.saveSettings();});
  segInit("setTilt",S.tilt===false?"off":"on",v=>{S.tilt=v==="on";SL.saveSettings();if(!S.tilt)document.querySelectorAll(".card.tilting").forEach(c=>{c.classList.remove("tilting");c.style.cssText="";});});
  $("setSound").checked=!!S.sound;$("setSound").onchange=e=>{S.sound=e.target.checked;SL.saveSettings();};
  couchNow();favRender();
  const ext=SL.ext(),dat=SL.extData();
  $("extState").innerHTML=ext?(dat?'<span class="tag ok">ESTENSIONE ATTIVA '+h(ext)+'</span> Diretta TV nel riquadro e dati moto disponibili.':'<span class="tag big">ESTENSIONE VECCHIA '+h(ext)+'</span> Funziona la Diretta TV, ma per i dati moto aggiornala con lo zip qui sotto.'):'<span class="tag">ESTENSIONE NON INSTALLATA</span>';
  $("dlgSettings").showModal();
};
function couchNow(){$("couchNow").textContent=SL.couch()?"Ora è attiva.":"Ora non è attiva.";}
function bcLook(){try{SL.chan&&SL.chan.postMessage({type:"look",settings:{style:SL.settings.style,couch:SL.settings.couch,tilt:SL.settings.tilt}});}catch(e){}}
function favRender(){const L=SL.fav.list;$("favCount").textContent=L.length?"("+L.length+")":"";
  $("favList").innerHTML=L.length?L.map((x,i)=>'<li class="sp-'+h(x.s)+'">'+(x.s?SL.ico(x.s):"")+" "+h(x.n)+'<button type="button" data-i="'+i+'" aria-label="Togli '+h(x.n)+'">✕</button></li>').join(""):'<li class="muted">Nessun preferito.</li>';}
$("favList")&&$("favList").addEventListener("click",e=>{const b=e.target.closest("button[data-i]");if(!b)return;const it=SL.fav.list[+b.dataset.i];if(it)SL.fav.toggle(it);favRender();});
SL.on("fav",()=>{if($("dlgSettings").open)favRender();});

/* =====================================================================
   Più schermi: ogni scheda può andare su un'altra finestra/monitor
   ===================================================================== */
const MS={screens:null,n:SL.store.get("msN",2),plan:{},wins:[]};
function screensList(){if(MS.screens&&MS.screens.length)return MS.screens.slice(0,Math.max(MS.n,MS.screens.length));
  return Array.from({length:MS.n},(_,i)=>({i,label:i===0?"Questo schermo":"Schermo "+(i+1),virtual:true}));}
UI.openScreens=function(){
  if(SL.solo){SL.toast("Questa è una finestra secondaria: gestisci gli schermi dalla finestra principale.");return;}
  const defs=UI.defs.filter(d=>true);
  if(!defs.length){SL.toast("In questa pagina non ci sono sezioni da distribuire.");return;}
  $("scrIntro").textContent=SL.couch()&&SL.isTVLike()?"Su TV e tablet di solito c'è un solo schermo: questa funzione è pensata per il PC con più monitor. Puoi comunque aprire più finestre.":"Scegli su quale schermo va ogni sezione di "+SL.sports[UI.sport].name+". Le finestre seguono la partita scelta qui. Con Chrome/Edge premi RILEVA SCHERMI per posizionarle da sole sui monitor.";
  $("scrN").innerHTML=[1,2,3,4,5,6].map(n=>'<option'+(n===MS.n?" selected":"")+'>'+n+'</option>').join("");
  $("scrN").onchange=e=>{MS.n=+e.target.value;SL.store.set("msN",MS.n);renderMap();};
  const saved=SL.store.get("msPlan."+UI.sport,null);
  MS.plan=saved||autoPlan();
  renderMap();$("dlgScreens").showModal();
};
function autoPlan(){const n=Math.max(1,MS.n),plan={},load=Array(n).fill(0);
  const order=UI.defs.map(d=>d.k);
  order.forEach((k,i)=>{const d=UI.defs.find(x=>x.k===k),w=(d.sz||2)+(k==="tv"?3:0);let best=0;
    if(i===0)best=0;else{let bs=Infinity;for(let s=0;s<n;s++){const sc=load[s]+(s===0?1.5:0);if(sc<bs){bs=sc;best=s;}}}
    plan[k]=best;load[best]+=w;});
  return plan;}
function renderMap(){
  const scr=screensList(),n=Math.max(MS.n,1);
  $("scrMap").innerHTML=Array.from({length:n},(_,i)=>{const s=scr[i]||{label:"Schermo "+(i+1)};
    const units=UI.defs.filter(d=>(MS.plan[d.k]||0)===i);
    return'<div class="scr" data-s="'+i+'"><h4><span>'+(i+1)+". "+h(s.label||("Schermo "+(i+1)))+'</span><span>'+(s.w?s.w+"×"+s.h:"")+'</span></h4>'+
      (units.length?units.map(d=>'<div class="unit" draggable="true" data-k="'+d.k+'">'+h(d.n)+'<select aria-label="Schermo per '+h(d.n)+'">'+Array.from({length:n},(_,j)=>'<option value="'+j+'"'+(j===i?" selected":"")+'>'+(j+1)+'</option>').join("")+'<option value="-1">—</option></select></div>').join(""):'<div class="muted">Trascina qui le sezioni</div>')+'</div>';}).join("")+
    (UI.defs.some(d=>MS.plan[d.k]===-1)?'<div class="scr" data-s="-1"><h4>Non mostrate</h4>'+UI.defs.filter(d=>MS.plan[d.k]===-1).map(d=>'<div class="unit" draggable="true" data-k="'+d.k+'">'+h(d.n)+'<select>'+Array.from({length:n},(_,j)=>'<option value="'+j+'">'+(j+1)+'</option>').join("")+'<option value="-1" selected>—</option></select></div>').join("")+'</div>':"");
  $("scrMap").querySelectorAll(".unit select").forEach(s=>s.onchange=e=>{MS.plan[e.target.closest(".unit").dataset.k]=+e.target.value;SL.store.set("msPlan."+UI.sport,MS.plan);renderMap();});
  $("scrMap").querySelectorAll(".unit").forEach(u=>u.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/plain",u.dataset.k);}));
  $("scrMap").querySelectorAll(".scr").forEach(s=>{s.addEventListener("dragover",e=>{e.preventDefault();s.classList.add("drop");});s.addEventListener("dragleave",()=>s.classList.remove("drop"));
    s.addEventListener("drop",e=>{e.preventDefault();const k=e.dataTransfer.getData("text/plain");if(k){MS.plan[k]=+s.dataset.s;SL.store.set("msPlan."+UI.sport,MS.plan);renderMap();}});});
}
async function detect(){
  if(!("getScreenDetails" in window)){SL.toast("Il browser non permette di rilevare i monitor: le finestre si apriranno e potrai trascinarle.");return;}
  try{const d=await window.getScreenDetails();const cur=d.currentScreen;
    MS.screens=[cur,...d.screens.filter(s=>s!==cur)].map((s,i)=>({i,label:(s.label||("Monitor "+(i+1)))+(s===cur?" (questo)":""),x:s.availLeft,y:s.availTop,w:s.availWidth,h:s.availHeight}));
    MS.n=MS.screens.length;SL.store.set("msN",MS.n);$("scrN").value=String(MS.n);MS.plan=autoPlan();renderMap();SL.toast("Trovati "+MS.screens.length+" schermi.");
  }catch(e){SL.toast("Permesso negato: le finestre si apriranno e potrai trascinarle sui monitor.");}
}
function launch(){
  if(SL.inFrame){SL.toast("Dentro un riquadro non si possono aprire altre finestre: apri il sito direttamente.");return;}
  MS.wins.forEach(w=>{try{w&&!w.closed&&w.close();}catch(e){}});MS.wins=[];
  const n=MS.n,scr=screensList(),sz=UI.sizes();let opened=0,blocked=0;
  for(let i=1;i<n;i++){const units=UI.defs.filter(d=>MS.plan[d.k]===i).map(d=>d.k);if(!units.length)continue;
    const url=location.pathname+"?follow=1&solo="+units.join(",")+"&sz="+units.map(k=>k+":"+(sz[k]||UI.defs.find(d=>d.k===k).sz||2)).join(",")+location.hash;
    const s=scr[i]||{};const feat=s.w?"popup=yes,left="+s.x+",top="+s.y+",width="+s.w+",height="+s.h:"popup=yes,width=1280,height=800";
    let w=null;try{w=window.open(url,"sl_screen_"+i,feat);}catch(e){}
    if(!w){blocked++;continue;}opened++;try{if(s.w){w.moveTo(s.x,s.y);w.resizeTo(s.w,s.h);}}catch(e){}MS.wins.push(w);}
  const mine=UI.defs.filter(d=>(MS.plan[d.k]||0)===0).map(d=>d.k);
  SL.store.sset("msolo."+UI.sport,opened&&mine.length?mine:null);
  $("dlgScreens").close();SL.route();
  if(blocked)SL.toast("Il browser ha bloccato "+blocked+" finestre: consenti i popup per questo sito e riprova.");
  else if(opened)SL.toast("Aperte "+opened+" finestre. Seguiranno questa schermata.");
  else SL.toast("Nessuna sezione assegnata agli altri schermi.");
}
function closeAll(){MS.wins.forEach(w=>{try{w&&!w.closed&&w.close();}catch(e){}});MS.wins=[];try{SL.chan&&SL.chan.postMessage({type:"closeall"});}catch(e){}SL.store.sset("msolo."+UI.sport,null);$("dlgScreens").close();SL.route();}

/* =====================================================================
   Diretta TV
   - con l'estensione per PC il servizio si carica nel riquadro (login compreso)
   - senza estensione si apre in una finestra agganciata sopra il riquadro
   - su Smart TV e tablet si apre il sito/app del servizio
   ===================================================================== */
const SVC={
  dazn:{n:"DAZN",u:"https://www.dazn.com/it-IT/home",frame:true},
  skygo:{n:"Sky Go",u:"https://skygo.sky.it/",frame:true},
  now:{n:"NOW",u:"https://www.nowtv.it/",frame:true},
  prime:{n:"Prime Video",u:"https://www.primevideo.com/",frame:true},
  infinity:{n:"Mediaset Infinity",u:"https://mediasetinfinity.mediaset.it/",frame:true},
  raiplay:{n:"RaiPlay",u:"https://www.raiplay.it/dirette",frame:true},
  tv8:{n:"TV8",u:"https://www.tv8.it/streaming",frame:true},
  nba:{n:"NBA League Pass",u:"https://www.nba.com/watch/league-pass-stream",frame:true},
  supertennis:{n:"SuperTennis",u:"https://www.supertennis.tv/",frame:true},
  hbomax:{n:"HBO Max (Eurosport)",u:"https://play.hbomax.com/",frame:true},
  custom:{n:"Altro sito…",u:"",frame:false}
};
const SVC_BY={calcio:["dazn","skygo","now","prime","infinity","raiplay","tv8"],basket:["nba","skygo","now"],tennis:["skygo","now","supertennis","hbomax","raiplay"],rugby:["skygo","now","tv8","raiplay"],moto:["skygo","now","tv8"],home:["skygo","now","dazn","prime","raiplay","tv8"]};
const TV=SL.TV={win:null,at:null,card:null};
UI.tv=function(c,sport){
  const list=(SVC_BY[sport]||SVC_BY.home).concat("custom");
  let cfg=SL.store.get("tv."+sport,{svc:list[0],url:"",embed:false});if(list.indexOf(cfg.svc)<0)cfg.svc=list[0];
  const save=()=>SL.store.set("tv."+sport,cfg);
  const svc=()=>SVC[cfg.svc]||SVC[list[0]];
  const url=()=>{const u=cfg.svc==="custom"?cfg.url:svc().u;return/^https:\/\//i.test(u||"")?u:"";};
  const inline=()=>!!url()&&!SL.inFrame&&((svc().frame&&!!SL.ext())||(cfg.svc==="custom"&&cfg.embed));
  const tvLike=SL.isTVLike();
  c.body.innerHTML='<div class="tvbar"><select aria-label="Servizio">'+list.map(k=>'<option value="'+k+'"'+(k===cfg.svc?" selected":"")+'>'+h(SVC[k].n)+'</option>').join("")+'</select>'+
    '<input type="url" placeholder="https://…" aria-label="Indirizzo del sito" value="'+h(cfg.url)+'">'+
    '<label class="chk emb"><input type="checkbox"'+(cfg.embed?" checked":"")+'> nel riquadro</label>'+
    '<button type="button" class="btn pri go"></button><button type="button" class="btn stop">■ STOP</button><button type="button" class="btn fs">⛶</button></div>'+
    '<div class="tvstage"><iframe title="Diretta TV" hidden allow="autoplay; encrypted-media; fullscreen; picture-in-picture; storage-access" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-storage-access-by-user-activation"></iframe><div class="tvidle"><div class="big">Diretta TV</div><div class="tx"></div></div></div><div class="note msg" hidden></div>';
  const q=s=>c.body.querySelector(s),fr=q("iframe"),sel=q("select"),inp=q("input[type=url]"),emb=q(".emb input");
  let loaded=false;
  const render=()=>{const s=svc(),alive=!!(TV.win&&!TV.win.closed&&TV.card===c.el),show=inline()&&loaded;
    inp.hidden=cfg.svc!=="custom";q(".emb").hidden=cfg.svc!=="custom";
    q(".go").textContent=show?"↻ RICARICA":alive?"↻ RIPOSIZIONA":tvLike?"▶ APRI "+(cfg.svc==="custom"?"SITO":s.n.toUpperCase()):"▶ COLLEGA "+(cfg.svc==="custom"?"SITO":s.n.toUpperCase());
    q(".stop").hidden=!(alive||show);q(".fs").hidden=!show;fr.hidden=!show;q(".tvidle").hidden=show;
    c.sub(show?s.n+" nel riquadro":alive?s.n+" in finestra agganciata":"");
    q(".tvidle .tx").textContent=tvLike?"Su Smart TV e tablet il video non può stare dentro l'app: APRI avvia "+s.n+" (o la sua app). Torna qui con il tasto indietro.":
      alive?"La diretta è nella finestra di "+s.n+" sopra questo riquadro. Se hai spostato o ridimensionato, premi RIPOSIZIONA.":
      inline()?"Premi COLLEGA: "+s.n+" si carica qui dentro. Accedi con il tuo abbonamento come sul sito.":
      s.frame?"Con l'estensione per PC (Impostazioni ⚙) "+s.n+" si vede qui dentro. Senza, COLLEGA lo apre in una finestra appoggiata sopra il riquadro.":
      "Premi COLLEGA: il sito si apre in una finestra appoggiata sopra il riquadro.";};
  const msg=(t)=>{const m=q(".msg");m.hidden=!t;m.textContent=t||"";};
  const rect=()=>{const r=q(".tvstage").getBoundingClientRect();if(!r.width)return null;const bx=Math.max(0,(window.outerWidth-window.innerWidth)/2),by=Math.max(0,window.outerHeight-window.innerHeight-bx);
    return{x:Math.round(window.screenX+bx+r.left),y:Math.round(window.screenY+by+r.top),w:Math.round(r.width),h:Math.round(r.height)};};
  const openWin=()=>{const u=url();if(!u){msg("Scrivi l'indirizzo del sito (deve iniziare con https://).");return;}
    if(tvLike){window.open(u,"_blank");return;}
    if(SL.inFrame){msg("Dentro un riquadro non si possono aprire finestre: apri il sito direttamente.");return;}
    const R=rect()||{x:screenX+40,y:screenY+40,w:960,h:540};try{TV.win&&!TV.win.closed&&TV.win.close();}catch(e){}
    let w=null;try{w=window.open("about:blank","sl_tv","popup=yes,left="+R.x+",top="+R.y+",width="+R.w+",height="+R.h);}catch(e){}
    if(!w){msg("Il browser ha bloccato la finestra: consenti i popup per questo sito e riprova.");return;}
    try{w.moveTo(R.x,R.y);w.resizeTo(R.w,R.h);w.location.href=u;}catch(e){}
    TV.win=w;TV.at=R;TV.card=c.el;msg("");render();};
  const connect=()=>{if(inline()){loaded=true;fr.src=url();msg("");render();
      let got=false;fr.onload=()=>{got=true;};setTimeout(()=>{if(loaded&&!got)msg("Il sito non risponde nel riquadro. Se resta nero, premi ■ STOP e poi apri in finestra togliendo l'estensione.");},12000);return;}
    openWin();};
  const stop=()=>{try{TV.win&&TV.card===c.el&&TV.win.close();}catch(e){}if(TV.card===c.el)TV.win=null;loaded=false;fr.removeAttribute("src");render();};
  sel.onchange=()=>{cfg.svc=sel.value;save();stop();render();};
  inp.onchange=()=>{cfg.url=inp.value.trim();save();render();};
  emb.onchange=()=>{cfg.embed=emb.checked;save();render();};
  q(".go").onclick=connect;q(".stop").onclick=stop;
  q(".fs").onclick=()=>{try{const p=q(".tvstage").requestFullscreen();p&&p.catch&&p.catch(()=>{});}catch(e){}};
  /* la finestra agganciata segue il riquadro */
  const follow=setInterval(()=>{if(!TV.win||TV.win.closed||TV.card!==c.el)return;const r=rect();if(!r)return;const a=TV.at||{};
    if(Math.abs(a.x-r.x)>2||Math.abs(a.y-r.y)>2||Math.abs(a.w-r.w)>2||Math.abs(a.h-r.h)>2){try{TV.win.moveTo(r.x,r.y);TV.win.resizeTo(r.w,r.h);TV.at=r;}catch(e){}}},1200);
  SL.onCleanup(()=>clearInterval(follow));
  render();
};

/* ---------- riquadri 3D: inclinazione e riflesso seguono il mouse (solo con mouse, non su TV/touch) ---------- */
UI.tilt=function(){
  let cur=null,raf=0,ev=null;
  const reset=c=>{if(!c)return;c.classList.remove("tilting");c.style.removeProperty("--rx");c.style.removeProperty("--ry");c.style.removeProperty("--gx");c.style.removeProperty("--gy");};
  document.addEventListener("pointermove",e=>{
    if(SL.settings.tilt===false||e.pointerType!=="mouse"||SL.couch()||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const c=e.target.closest&&e.target.closest(".card:not(.full)");
    if(c!==cur){reset(cur);cur=c;}
    if(!c)return;ev=e;if(raf)return;
    raf=requestAnimationFrame(()=>{raf=0;const r=c.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width,y=(ev.clientY-r.top)/r.height;
      const max=r.width>900?1.2:r.width>600?2.2:3.5; /* le schede grandi si inclinano meno, per leggere comodi */
      c.classList.add("tilting");c.style.setProperty("--ry",((x-.5)*2*max).toFixed(2)+"deg");c.style.setProperty("--rx",((.5-y)*2*max).toFixed(2)+"deg");
      c.style.setProperty("--gx",(x*100).toFixed(1)+"%");c.style.setProperty("--gy",(y*100).toFixed(1)+"%");});
  },{passive:true});
  document.addEventListener("pointerleave",()=>{reset(cur);cur=null;});
};

/* ---------- avvio ---------- */
UI.init=function(){
  UI.tilt();
  $("btnSettings").addEventListener("click",UI.openSettings);
  $("btnScreens").addEventListener("click",UI.openScreens);
  $("scrDetect").addEventListener("click",detect);
  $("scrAuto").addEventListener("click",()=>{MS.plan=autoPlan();SL.store.set("msPlan."+UI.sport,MS.plan);renderMap();});
  $("scrGo").addEventListener("click",launch);
  $("scrCloseAll").addEventListener("click",closeAll);
  $("setResetCards").addEventListener("click",()=>{SL.order.forEach(s=>{SL.store.set("sz."+s,{});SL.store.set("hid."+s,[]);SL.store.sset("msolo."+s,null);});SL.store.set("couchAll",false);$("dlgSettings").close();SL.route();SL.toast("Sezioni e misure ripristinate.");});
  window.addEventListener("beforeunload",()=>{try{TV.win&&!TV.win.closed&&TV.win.close();}catch(e){}});
  let rt=null;window.addEventListener("resize",()=>{clearTimeout(rt);rt=setTimeout(()=>SL.emit("resize"),200);});
};
})();
