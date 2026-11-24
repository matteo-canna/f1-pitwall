/* Sport LIVE APP — interfaccia comune: schede S/M/L, schermo intero, impostazioni, multi-schermo, Diretta TV */
(function(){
"use strict";
const $=SL.$,h=SL.h;
const SZN={1:"S",2:"M",3:"L"};
const UI=SL.ui={sport:null,defs:[],cards:{}};

UI.reset=function(sport){UI.sport=sport;UI.defs=[];UI.cards={};document.body.classList.remove("has-full");if(UI._ro){UI._ro.disconnect();UI._ro=null;}};
UI.sizes=()=>{const q=SL.qs.get("sz");if(q&&window.isFollower()){const o={};q.split(",").forEach(p=>{const [k,v]=p.split(":");o[k]=+v;});return o;}return SL.store.get("sz2."+UI.sport,{});};
UI.setSize=(k,v)=>{const s=SL.store.get("sz2."+UI.sport,{});s[k]=v;SL.store.set("sz2."+UI.sport,s);};
UI.hidden=()=>SL.store.get("hid."+UI.sport,[]);
UI.localSolo=()=>SL.store.sget("msolo."+UI.sport,null);

/* crea le schede di una pagina. defs: [{k,n,sz,couch,flush}] — ritorna {k:{el,body,sub(),tools}} */
UI.mount=function(main,defs){
  UI.defs=defs;const sz=UI.sizes(),hid=UI.hidden(),couch=SL.couch(),all=SL.store.get("couchAll",false);
  /* finestra secondaria, finestra principale con più schermi, schermo singolo: mostro solo le sezioni scelte (screens.js) */
  const solo=UI.soloList?UI.soloList():(SL.solo||UI.localSolo());
  const out={};let hiddenCouch=0;const hiddenUser=[];
  defs.forEach(d=>{
    let show=true;
    if(solo)show=solo.indexOf(d.k)>=0;
    else if(d.fixed)show=true; /* la Diretta TV si vede sempre */
    else if(hid.indexOf(d.k)>=0){show=false;hiddenUser.push(d);}
    else if(couch&&d.couch===false&&!all){show=false;hiddenCouch++;}
    const el=document.createElement("article");el.className="card";el.dataset.k=d.k;el.dataset.sz=String(d.fixed?d.sz:(sz[d.k]||d.sz||2));if(d.fixed)el.classList.add("fixed");if(d.hero)el.classList.add("hero");
    el.innerHTML='<header><h2>'+h(d.n)+'</h2><span class="sub"></span><div class="tools"></div><button type="button" class="mbtn" aria-label="Opzioni sezione '+h(d.n)+'" title="Misura e schermo intero">⋯</button></header><div class="body'+(d.flush?" flush":"")+'"><div class="loading">Carico</div></div>';
    if(!show)el.hidden=true;
    main.appendChild(el);
    const c={el,def:d,body:el.querySelector(".body"),tools:el.querySelector(".tools"),shown:show,
      sub(t){el.querySelector(".sub").textContent=t||"";},
      title(t){el.querySelector("h2").textContent=t;}};
    el.querySelector(".mbtn").addEventListener("click",ev=>{ev.stopPropagation();UI.menu(c);});
    out[d.k]=c;UI.cards[d.k]=c;
  });
  /* telefono: prima la partita e i dati, la Diretta TV subito dopo le prime due sezioni */
  if(!solo&&out.tv&&window.matchMedia&&matchMedia("(max-width:760px)").matches){
    const vis=[...main.children].filter(e=>e.classList.contains("card")&&!e.hidden&&e.dataset.k!=="tv");const ref=vis[1]||vis[0];if(ref)ref.after(out.tv.el);}
  /* in fondo: sezioni nascoste */
  const extra=document.createElement("div");extra.style.gridColumn="1/-1";extra.className="row";
  if(!solo){
    let s="";
    if(hiddenCouch)s+='<button type="button" class="btn" id="couchAll">＋ ALTRE SEZIONI ('+hiddenCouch+')</button>';
    else if(couch&&all)s+='<button type="button" class="btn" id="couchLess">－ SOLO LE PRINCIPALI</button>';
    extra.innerHTML=s;}
  if(extra.innerHTML)main.appendChild(extra);
  extra.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
    if(b.id==="couchAll"){SL.store.set("couchAll",true);SL.route();}
    if(b.id==="couchLess"){SL.store.set("couchAll",false);SL.route();}
    if(b.id==="unsolo"){SL.store.sset("msolo."+UI.sport,null);SL.route();}
    if(b.dataset.unhide){SL.store.set("hid."+UI.sport,UI.hidden().filter(k=>k!==b.dataset.unhide));SL.route();}});
  UI.pack(main);
  UI.watchEmpty(out,!!solo);
  /* pagine che montano le sezioni dopo (Live ora): applico di nuovo la disposizione degli schermi */
  if(SL.screens)SL.screens.refreshSoon();
  return out;
};

/* ---------- sezioni senza dati: si nascondono da sole e finiscono, raggruppate, in una fila di pulsanti
   nella barra dei filtri. Ogni pulsante riaccende la sua sezione (scelta ricordata su questo dispositivo).
   Appena una sezione nascosta riceve dati, ricompare da sola. ---------- */
const KEEP=["need","nolive"]; /* messaggi che spiegano cosa fare: restano sempre */
UI.forced=()=>SL.store.get("showEmpty."+UI.sport,[]);
UI.setForced=l=>SL.store.set("showEmpty."+UI.sport,l);
const bodyEmpty=b=>{if(b.querySelector(".loading"))return false;const k=[...b.children];if(!k.length)return!b.textContent.trim();return k.every(x=>x.classList.contains("empty"));};
UI.watchEmpty=function(cards,solo){
  const sport=UI.sport,mid=UI.mountId=(UI.mountId||0)+1,list=Object.values(cards).filter(c=>c.shown&&!c.def.fixed&&KEEP.indexOf(c.def.k)<0);
  let t=0;const sched=()=>{clearTimeout(t);t=setTimeout(apply,150);};
  function apply(){if(UI.sport!==sport||UI.mountId!==mid)return;const forced=UI.forced();let changed=false;
    list.forEach(c=>{const empty=bodyEmpty(c.body),on=forced.indexOf(c.def.k)>=0;c.isEmpty=empty;
      const hide=!solo&&empty&&!on&&!c.el.classList.contains("full");
      if(hide!==!!c.autoHidden){c.autoHidden=hide;c.el.hidden=hide;changed=true;}
      /* sezione riaccesa ma ancora vuota: pulsante per rimetterla nella fila */
      let x=c.tools.querySelector(".unforce");
      if(!solo&&empty&&on){if(!x){x=document.createElement("button");x.type="button";x.className="unforce";x.title="Nascondi finché non ci sono dati";x.textContent="NASCONDI SE VUOTA";
        x.addEventListener("click",e=>{e.stopPropagation();UI.setForced(UI.forced().filter(k=>k!==c.def.k));apply();});c.tools.appendChild(x);}}
      else if(x)x.remove();
      c.el.classList.toggle("is-empty",empty);});
    if(!solo)UI.drawTray();
    if(changed)SL.emit("resize");}
  list.forEach(c=>{const mo=new MutationObserver(sched);mo.observe(c.body,{childList:true,subtree:true,characterData:true});SL.onCleanup(()=>mo.disconnect());});
  SL.onCleanup(()=>clearTimeout(t));
  sched();
};
UI.drawTray=function(){
  const sub=document.getElementById("subbar");if(!sub)return;
  const all=Object.values(UI.cards),empty=all.filter(c=>c.autoHidden),hid=UI.defs.filter(d=>UI.hidden().indexOf(d.k)>=0);
  let tr=sub.querySelector(".etray");
  if(!empty.length&&!hid.length){if(tr)tr.remove();return;}
  if(!tr){tr=document.createElement("div");tr.className="etray";sub.appendChild(tr);
    tr.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
      if(b.dataset.show){const f=UI.forced();if(f.indexOf(b.dataset.show)<0)f.push(b.dataset.show);UI.setForced(f);const c=UI.cards[b.dataset.show];
        if(c){c.autoHidden=false;c.el.hidden=false;UI.drawTray();SL.emit("resize");setTimeout(()=>{c.el.scrollIntoView({block:"nearest",behavior:"smooth"});c.el.classList.add("flash");setTimeout(()=>c.el.classList.remove("flash"),2400);},60);}}
      if(b.dataset.unhide){SL.store.set("hid."+UI.sport,UI.hidden().filter(k=>k!==b.dataset.unhide));SL.route();}});}
  const order=k=>UI.defs.findIndex(d=>d.k===k);
  tr.innerHTML=(empty.length?'<span class="et-l" title="Sezioni nascoste perché adesso non hanno dati: tornano da sole quando arrivano">Senza dati ora <b>'+empty.length+'</b></span>'+
      empty.sort((a,b)=>order(a.def.k)-order(b.def.k)).map(c=>'<button type="button" class="chip et-c" data-show="'+h(c.def.k)+'" title="Mostra comunque questa sezione">＋ '+h(c.def.n)+'</button>').join(""):"")+
    (hid.length?'<span class="et-l">Nascoste da te</span>'+hid.map(d=>'<button type="button" class="chip et-c" data-unhide="'+h(d.k)+'" title="Rimetti questa sezione">＋ '+h(d.n)+'</button>').join(""):"");
};
/* disposizione "a muro": la griglia ha righe da 4px e ogni riquadro ne occupa quante ne servono alla sua altezza.
   Così ogni sezione si appoggia subito sotto quella di sopra, senza i buchi delle righe rigide. Si ricalcola da solo quando un riquadro cambia altezza. */
UI.pack=function(main){
  if(UI._ro)UI._ro.disconnect();
  if(!window.ResizeObserver)return;
  main.classList.add("masonry");
  const ROW=4,gy=()=>parseFloat(getComputedStyle(main).getPropertyValue("--gapy"))||12;
  const fit=el=>{if(el.hidden||el.classList.contains("full"))return;const h=el.offsetHeight;if(!h)return;const n=Math.max(1,Math.ceil((h+gy())/ROW));
    const one=getComputedStyle(main).gridTemplateColumns.split(" ").length<2;
    /* Diretta TV e barra dei filtri stanno sempre in cima (riga 1), una accanto all'altra */
    if(!one&&((el.dataset.k==="tv"&&el.classList.contains("fixed"))||el.classList.contains("ingrid")))el.style.gridRow="1 / span "+n;
    else{el.style.gridRow="";el.style.gridRowEnd="span "+n;}};
  const ro=new ResizeObserver(es=>es.forEach(e=>fit(e.target)));
  [...main.children].forEach(el=>{ro.observe(el);fit(el);});
  UI._ro=ro;
};
UI.menu=function(c){
  document.querySelectorAll(".menu").forEach(m=>m.remove());
  /* schermo singolo: S/M/L è lo spazio nella zona (per la TV la sua grandezza); finestre con più schermi: misura nella finestra */
  const SCR=SL.screens,sgl=!!(SCR&&SCR.sglOn()),solo=!!(SCR&&document.body.classList.contains("solo"));
  const cur=sgl?SCR.sglCardCur(c.def.k):solo?SCR.soloCur(c.def.k):+c.el.dataset.sz,m=document.createElement("div");m.className="menu";m.setAttribute("role","menu");
  m.innerHTML=c.def.fixed&&!sgl&&!solo?'<button type="button" data-a="full">⛶ SCHERMO INTERO</button>':[1,2,3].map(v=>'<button type="button" data-sz="'+v+'" aria-pressed="'+(cur===v)+'">'+SZN[v]+'</button>').join("")+
    '<button type="button" data-a="full">⛶ INTERO</button>'+(SL.solo||sgl||solo?"":'<button type="button" data-a="hide">NASCONDI</button>');
  c.el.appendChild(m);m.querySelector("button").focus();
  m.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;e.stopPropagation();
    if(b.dataset.sz&&sgl){SCR.sglCardSet(c.def.k,+b.dataset.sz);m.remove();return;}
    if(b.dataset.sz&&solo){SCR.soloSet(c.def.k,+b.dataset.sz);m.remove();return;}
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
UI.dock=(sub,main)=>{if(!SL.solo&&main.querySelector('.card[data-k="tv"]:not([hidden])')){sub.classList.add("ingrid");main.prepend(sub);if(main.classList.contains("masonry"))UI.pack(main);}};
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
  segInit("setIntro",S.intro===false?"off":"on",v=>{S.intro=v==="on";SL.saveSettings();SL.toast(S.intro?"La sigla comparirà alla prossima apertura.":"Sigla d'apertura spenta.");});
  segInit("setTilt",S.tilt===false?"off":"on",v=>{S.tilt=v==="on";SL.saveSettings();if(!S.tilt)document.querySelectorAll(".card.tilting").forEach(c=>{c.classList.remove("tilting");c.style.cssText="";});});
  /* versione della pagina (sul telefono non c'è nella barra in alto) */
  {const v=$("appVer"),t=v?v.textContent.trim():"",dt=v?((v.title||"").match(/del (\S+)/)||[])[1]:"";$("setVer").textContent=t;$("setVerFull").textContent="Sport LIVE APP "+t+(dt?" del "+dt:"");}
  $("setSound").checked=!!S.sound;$("setSound").onchange=e=>{S.sound=e.target.checked;SL.saveSettings();};
  couchNow();favRender();
  const ext=SL.ext(),dat=SL.extData();
  $("extState").innerHTML=ext?(dat?'<span class="tag ok">ESTENSIONE ATTIVA '+h(ext)+'</span> Diretta TV nel riquadro e dati moto disponibili.':'<span class="tag big">ESTENSIONE VECCHIA '+h(ext)+'</span> Funziona la Diretta TV, ma per i dati moto aggiornala con lo zip qui sotto.'):'<span class="tag">ESTENSIONE NON INSTALLATA</span>';
  $("dlgSettings").showModal();
};
function couchNow(){$("couchNow").textContent=SL.couch()?"Ora è attiva.":"Ora non è attiva.";}
function bcLook(){try{SL.chan&&SL.chan.postMessage({type:"look",settings:{style:SL.settings.style,couch:SL.settings.couch,tilt:SL.settings.tilt}});}catch(e){}}
function favRender(){const L=SL.fav.list;$("favCount").textContent=L.length?"("+L.length+")":"";if(!$("favList"))return;
  $("favList").innerHTML=L.length?L.map((x,i)=>'<li class="sp-'+h(x.s)+'">'+(x.s?SL.ico(x.s):"")+" "+h(x.n)+'<button type="button" data-i="'+i+'" aria-label="Togli '+h(x.n)+'">✕</button></li>').join(""):'<li class="muted">Nessun preferito.</li>';}
$("favList")&&$("favList").addEventListener("click",e=>{const b=e.target.closest("button[data-i]");if(!b)return;const it=SL.fav.list[+b.dataset.i];if(it)SL.fav.toggle(it);favRender();});
SL.on("fav",()=>{if($("dlgSettings").open)favRender();});

/* Più schermi e schermo singolo: vedi screens.js (stesse funzioni del pulsante SCHERMI dell'app F1) */

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
  elt:{n:"EuroLeague TV",u:"https://euroleague.tv/",frame:true},
  supertennis:{n:"SuperTennis",u:"https://www.supertennis.tv/",frame:true},
  hbomax:{n:"HBO Max (Eurosport)",u:"https://play.hbomax.com/",frame:true},
  custom:{n:"Altro sito…",u:"",frame:false}
};
const SVC_BY={calcio:["dazn","skygo","now","prime","infinity","raiplay","tv8"],basket:["nba","skygo","now","elt"],"basket-eu":["elt","skygo","now","dazn"],tennis:["skygo","now","supertennis","hbomax","raiplay"],rugby:["skygo","now","tv8","raiplay"],moto:["skygo","now","tv8"],golf:["skygo","now"],home:["skygo","now","dazn","prime","raiplay","tv8"]};
const TV=SL.TV={win:null,at:null,card:null};
UI.tv=function(c,sport,variant){
  /* variant: stessa pagina ma servizi diversi (es. basket europeo: prima EuroLeague TV), scelta ricordata a parte */
  const list=(SVC_BY[variant?sport+"-"+variant:sport]||SVC_BY[sport]||SVC_BY.home).concat("custom"),skey="tv."+sport+(variant?"-"+variant:"");
  let cfg=SL.store.get(skey,{svc:list[0],url:"",embed:false});if(list.indexOf(cfg.svc)<0)cfg.svc=list[0];
  const save=()=>SL.store.set(skey,cfg);
  const svc=()=>SVC[cfg.svc]||SVC[list[0]];
  const url=()=>{const u=cfg.svc==="custom"?cfg.url:svc().u;return/^https:\/\//i.test(u||"")?u:"";};
  const inline=()=>!!url()&&!SL.inFrame&&((svc().frame&&!!SL.ext())||(cfg.svc==="custom"&&cfg.embed));
  const phone=SL.isPhone(),tvLike=SL.isTVLike()||phone;
  /* due stati: spenta = riquadro compatto e utile (servizi + partite in diretta); accesa = schermo 16:9 */
  c.body.innerHTML='<div class="tvbar"><div class="tvsvc" role="group" aria-label="Servizio">'+list.map(k=>'<button type="button" class="chip" data-svc="'+k+'" aria-pressed="'+(k===cfg.svc)+'">'+h(SVC[k].n)+'</button>').join("")+'</div>'+
    '<div class="tvcustom"><input type="url" placeholder="https://…" aria-label="Indirizzo del sito" value="'+h(cfg.url)+'"><label class="chk emb"><input type="checkbox"'+(cfg.embed?" checked":"")+'> nel riquadro</label></div>'+
    '<div class="tvacts"><button type="button" class="btn pri go"></button><button type="button" class="btn stop">■ STOP</button><button type="button" class="btn fs" aria-label="Schermo intero">⛶</button></div></div>'+
    '<div class="tvstage"><iframe title="Diretta TV" hidden allow="autoplay; encrypted-media; fullscreen; picture-in-picture; storage-access" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-storage-access-by-user-activation"></iframe>'+
    '<div class="tvidle"><div class="tvtxt"></div><div class="tvlive"></div></div></div><div class="note msg" hidden></div>';
  const q=s=>c.body.querySelector(s),fr=q("iframe"),inp=q(".tvcustom input[type=url]"),emb=q(".emb input");
  let loaded=false;
  const on=()=>(inline()&&loaded)||!!(TV.win&&!TV.win.closed&&TV.card===c.el);
  const render=()=>{const s=svc(),alive=!!(TV.win&&!TV.win.closed&&TV.card===c.el),show=inline()&&loaded,nm=cfg.svc==="custom"?"SITO":s.n.toUpperCase();
    c.el.classList.toggle("tv-on",show||alive);
    q(".tvcustom").hidden=cfg.svc!=="custom";
    c.body.querySelectorAll("[data-svc]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.svc===cfg.svc)));
    q(".go").textContent=show?"↻ RICARICA":alive?"↻ RIPOSIZIONA":(tvLike?"▶ APRI ":"▶ COLLEGA ")+nm;
    q(".stop").hidden=!(alive||show);q(".fs").hidden=!show;fr.hidden=!show;q(".tvidle").hidden=show;
    c.sub(show?s.n+" nel riquadro":alive?s.n+" in finestra agganciata":"spenta");
    q(".tvtxt").textContent=tvLike?(phone?"Sul telefono":"Su Smart TV e tablet")+" il video si apre nell'app o nel sito di "+s.n+": torna qui con il tasto indietro.":
      alive?"La diretta è nella finestra di "+s.n+" sopra questo riquadro. Se hai spostato la pagina, premi RIPOSIZIONA.":
      inline()?"Scegli il servizio e premi COLLEGA: "+s.n+" si carica qui dentro, con il tuo abbonamento.":
      s.frame?"Premi COLLEGA: "+s.n+" si apre in una finestra appoggiata qui sopra. Con l'estensione per PC (⚙) si vede dentro il riquadro.":
      "Premi COLLEGA: il sito si apre in una finestra appoggiata qui sopra.";
    liveList();};
  /* finché è spenta: le partite in diretta di questo sport, toccabili */
  const liveList=()=>{const box=q(".tvlive");if(!box)return;if(on()){box.innerHTML="";return;}
    const L=(SL.live.bySport[sport]||[]);const live=L.filter(x=>x.live).sort((a,b)=>b.important-a.important).slice(0,4);
    const fmt=x=>{const l=x.lines||[];if(x.sport==="moto")return l.slice(0,2).map(y=>y.n).join(" · ");const a=l[0]||{},b=l[1]||{};const num=v=>v!==""&&v!=null&&!isNaN(+v);
      return h(a.n||"")+(num(a.v)&&num(b.v)?" <b>"+h(a.v)+"-"+h(b.v)+"</b> ":" – ")+h(b.n||"");};
    if(live.length){box.innerHTML='<h4><span class="tag live">LIVE</span> In diretta ora · tocca per aprire</h4>'+live.map(x=>'<button type="button" class="tvl" data-go="'+h(JSON.stringify(x.go||{sport}))+'">'+SL.ico(x.sport)+'<span class="tvl-t">'+fmt(x)+'</span><span class="tvl-s">'+h(x.status||"")+'</span></button>').join("");return;}
    const nx=L.filter(x=>x.state==="pre").sort((a,b)=>new Date(a.date)-new Date(b.date))[0];
    box.innerHTML=nx?'<h4>Nessuna partita in diretta · la prossima</h4><button type="button" class="tvl" data-go="'+h(JSON.stringify(nx.go||{sport}))+'">'+SL.ico(nx.sport)+'<span class="tvl-t">'+fmt(nx)+'</span><span class="tvl-s">'+h(SL.when(nx.date))+'</span></button>':'<h4>Nessuna partita in diretta in questo momento</h4>';};
  c.body.addEventListener("click",e=>{const g=e.target.closest(".tvl[data-go]");if(g){try{SL.go(JSON.parse(g.dataset.go));}catch(x){}return;}
    const b=e.target.closest("[data-svc]");if(b&&b.dataset.svc!==cfg.svc){stop();cfg.svc=b.dataset.svc;save();render();if(cfg.svc==="custom")inp.focus();}});
  SL.onPage("live",liveList);
  const msg=(t)=>{const m=q(".msg");m.hidden=!t;m.textContent=t||"";};
  const rect=()=>{const r=q(".tvstage").getBoundingClientRect();if(!r.width)return null;const bx=Math.max(0,(window.outerWidth-window.innerWidth)/2),by=Math.max(0,window.outerHeight-window.innerHeight-bx);
    return{x:Math.round(window.screenX+bx+r.left),y:Math.round(window.screenY+by+r.top),w:Math.round(r.width),h:Math.round(r.height)};};
  const openWin=()=>{const u=url();if(!u){msg("Scrivi l'indirizzo del sito (deve iniziare con https://).");return;}
    if(tvLike){window.open(u,"_blank");return;}
    if(SL.inFrame){msg("Dentro un riquadro non si possono aprire finestre: apri il sito direttamente.");return;}
    c.el.classList.add("tv-on"); /* prima allarga lo schermo, poi ci appoggia sopra la finestra */
    const R=rect()||{x:screenX+40,y:screenY+40,w:960,h:540};try{TV.win&&!TV.win.closed&&TV.win.close();}catch(e){}
    let w=null;try{w=window.open("about:blank","sl_tv","popup=yes,left="+R.x+",top="+R.y+",width="+R.w+",height="+R.h);}catch(e){}
    if(!w){c.el.classList.remove("tv-on");msg("Il browser ha bloccato la finestra: consenti i popup per questo sito e riprova.");return;}
    try{w.moveTo(R.x,R.y);w.resizeTo(R.w,R.h);w.location.href=u;}catch(e){}
    TV.win=w;TV.at=R;TV.card=c.el;msg("");render();};
  /* più schermi: la finestra del servizio si apre sullo schermo scelto e resta lì (non segue il riquadro) */
  UI.tvOpenAt=R=>{const u=url();if(!u)return false;let w=null;
    try{w=window.open("about:blank","sl_tv","popup=yes"+(R?",left="+R.x+",top="+R.y+",width="+R.w+",height="+R.h:",width=1280,height=720"));}catch(e){}
    if(!w)return false;try{if(R){w.moveTo(R.x,R.y);w.resizeTo(R.w,R.h);}w.location.href=u;}catch(e){}TV.win=w;TV.card=null;return true;};
  const connect=()=>{if(inline()){loaded=true;fr.src=url();msg("");render();
      let got=false;fr.onload=()=>{got=true;};setTimeout(()=>{if(loaded&&!got)msg("Il sito non risponde nel riquadro. Se resta nero, premi ■ STOP e poi apri in finestra togliendo l'estensione.");},12000);return;}
    openWin();};
  const stop=()=>{try{TV.win&&TV.card===c.el&&TV.win.close();}catch(e){}if(TV.card===c.el)TV.win=null;loaded=false;fr.removeAttribute("src");render();};
  inp.onchange=()=>{cfg.url=inp.value.trim();save();render();};
  emb.onchange=()=>{cfg.embed=emb.checked;save();render();};
  q(".go").onclick=connect;q(".stop").onclick=stop;
  q(".fs").onclick=()=>{try{const p=q(".tvstage").requestFullscreen();p&&p.catch&&p.catch(()=>{});}catch(e){}};
  /* la finestra agganciata segue il riquadro; se l'hai chiusa a mano il riquadro torna compatto */
  const follow=setInterval(()=>{if(TV.card===c.el&&TV.win&&TV.win.closed){TV.win=null;render();return;}
    if(!TV.win||TV.win.closed||TV.card!==c.el)return;const r=rect();if(!r)return;const a=TV.at||{};
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
  $("setResetCards").addEventListener("click",()=>{SL.order.forEach(s=>{SL.store.set("sz."+s,{});SL.store.set("sz2."+s,{});SL.store.set("showEmpty."+s,[]);SL.store.set("hid."+s,[]);SL.store.sset("msolo."+s,null);});SL.store.set("couchAll",false);$("dlgSettings").close();SL.route();SL.toast("Sezioni e misure ripristinate.");});
  window.addEventListener("beforeunload",()=>{try{TV.win&&!TV.win.closed&&TV.win.close();}catch(e){}});
  let rt=null;window.addEventListener("resize",()=>{clearTimeout(rt);rt=setTimeout(()=>SL.emit("resize"),200);});
};
})();
