/* Sport LIVE APP — nucleo: dati, orari, preferiti, avvisi, navigazione */
(function(){
"use strict";
const SL=window.SL={sports:{},order:["home","calcio","basket","tennis","rugby","moto","golf"],timers:[],state:{}};
const $=id=>document.getElementById(id);
SL.$=$;
SL.h=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
SL.qs=new URLSearchParams(location.search);

/* ---------- memoria locale (può mancare: navigazione privata, TV) ---------- */
SL.store={
  get(k,d){try{const v=localStorage.getItem("sl."+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},
  set(k,v){try{localStorage.setItem("sl."+k,JSON.stringify(v));}catch(e){}},
  sget(k,d){try{const v=sessionStorage.getItem("sl."+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},
  sset(k,v){try{sessionStorage.setItem("sl."+k,JSON.stringify(v));}catch(e){}}
};

/* ---------- orari: sempre ora italiana ---------- */
const TZ="Europe/Rome";
const fT=new Intl.DateTimeFormat("it-IT",{timeZone:TZ,hour:"2-digit",minute:"2-digit"});
const fD=new Intl.DateTimeFormat("it-IT",{timeZone:TZ,weekday:"short",day:"numeric",month:"short"});
const fDL=new Intl.DateTimeFormat("it-IT",{timeZone:TZ,weekday:"long",day:"numeric",month:"long"});
SL.fmtTime=d=>{try{return fT.format(new Date(d));}catch(e){return"";}};
SL.fmtDay=d=>{try{return fD.format(new Date(d));}catch(e){return"";}};
SL.fmtDayLong=d=>{try{return fDL.format(new Date(d));}catch(e){return"";}};
SL.dayKey=(d,tz)=>{const p=new Intl.DateTimeFormat("en-CA",{timeZone:tz||TZ,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(d));const g=t=>p.find(x=>x.type===t).value;return g("year")+g("month")+g("day");};
SL.addDays=(d,n)=>new Date(new Date(d).getTime()+n*864e5);
SL.relDay=d=>{const k=SL.dayKey(d),t=SL.dayKey(Date.now());if(k===t)return"Oggi";if(k===SL.dayKey(SL.addDays(Date.now(),1)))return"Domani";if(k===SL.dayKey(SL.addDays(Date.now(),-1)))return"Ieri";return SL.fmtDay(d);};
SL.when=d=>SL.relDay(d)+" "+SL.fmtTime(d);
SL.countdown=ms=>{if(ms<=0)return"ora";const s=Math.floor(ms/1000),dd=Math.floor(s/86400),hh=Math.floor(s%86400/3600),mm=Math.floor(s%3600/60);return dd?dd+"g "+hh+"h":hh?hh+"h "+String(mm).padStart(2,"0")+"m":mm+"m "+String(s%60).padStart(2,"0")+"s";};

/* ---------- rete: cache breve, richieste uniche, nessun crash se una fonte cade ---------- */
const cache=new Map(),inflight=new Map();
SL.get=async function(url,opt){
  opt=opt||{};const ttl=opt.ttl==null?8000:opt.ttl,now=Date.now(),c=cache.get(url);
  if(c&&now-c.t<ttl)return c.v;
  if(inflight.has(url))return inflight.get(url);
  const p=(async()=>{
    const ctl=typeof AbortController!=="undefined"?new AbortController():null;const to=setTimeout(()=>ctl&&ctl.abort(),opt.timeout||15000);
    try{
      const r=await fetch(url,{signal:ctl?ctl.signal:undefined,cache:"no-store",credentials:"omit"});
      if(!r.ok)throw new Error("HTTP "+r.status);
      const v=await r.json();cache.set(url,{t:Date.now(),v});SL.netOk(url);return v;
    }catch(e){SL.netErr(url,e);if(c)return c.v;throw e;}
    finally{clearTimeout(to);inflight.delete(url);}
  })();
  inflight.set(url,p);return p;
};
SL.tryGet=async(url,opt)=>{try{return await SL.get(url,opt);}catch(e){return null;}};
const net={err:0,last:0};
SL.netOk=()=>{net.err=0;};
SL.netErr=(u,e)=>{net.err++;net.last=Date.now();if(net.err===3)SL.toast("Una fonte dati non risponde. Riprovo da solo tra poco.");console.warn("[dati]",u,e&&e.message);};
SL.ESPN="https://site.api.espn.com/apis/site/v2/sports/";
SL.ESPN2="https://site.api.espn.com/apis/v2/sports/";

/* ---------- aggiornamenti periodici: si fermano a pagina nascosta ---------- */
SL.every=function(fn,ms,opt){
  opt=opt||{};let t=null,stopped=false;
  const run=async()=>{if(stopped)return;if(document.hidden){t=setTimeout(run,1500);return;}
    try{await fn();}catch(e){console.warn(e);}if(!stopped)t=setTimeout(run,Math.max(1000,typeof ms==="function"?ms():ms));};
  if(opt.delay)t=setTimeout(run,opt.delay);else run();
  const h={stop(){stopped=true;clearTimeout(t);},now(){clearTimeout(t);run();}};
  (opt.global?SL.gtimers:SL.timers).push(h);return h;
};
SL.gtimers=[];
SL.clearTimers=()=>{SL.timers.forEach(t=>t.stop());SL.timers=[];(SL.cleanups||[]).forEach(f=>{try{f();}catch(e){}});SL.cleanups=[];};
SL.cleanups=[];SL.onCleanup=f=>SL.cleanups.push(f);

/* ---------- percorso (#/sport?c=..&e=..&d=..) ---------- */
SL.parseHash=()=>{const h=location.hash.replace(/^#\/?/,"");const [p,q]=h.split("?");const sp=new URLSearchParams(q||"");const st={sport:SL.order.indexOf(p)>=0?p:"home"};sp.forEach((v,k)=>st[k]=v);return st;};
SL.hashOf=st=>{const q=new URLSearchParams();Object.keys(st).forEach(k=>{if(k!=="sport"&&st[k]!=null&&st[k]!=="")q.set(k,st[k]);});const s=q.toString();return"#/"+st.sport+(s?"?"+s:"");};
SL.go=function(patch,replace){
  const st=Object.assign({},patch.sport&&patch.sport!==SL.state.sport?{}:SL.state,patch);
  const h=SL.hashOf(st);if(h===location.hash)return;
  if(replace)history.replaceState(null,"",h);else history.pushState(null,"",h);
  SL.route();
};
/* aggiorna l'indirizzo senza ridisegnare (es. partita selezionata) */
SL.setQuiet=function(patch){Object.assign(SL.state,patch);history.replaceState(null,"",SL.hashOf(SL.state));SL.syncOut();};

/* ---------- preferiti ---------- */
SL.fav={
  list:SL.store.get("fav",[]),
  key:(sport,kind,id)=>sport+":"+kind+":"+id,
  has(k){return this.list.some(x=>x.k===k);},
  hasName(sport,name){if(!name)return false;const n=SL.norm(name);return this.list.some(x=>x.s===sport&&SL.norm(x.n)===n);},
  toggle(it){const i=this.list.findIndex(x=>x.k===it.k);if(i>=0)this.list.splice(i,1);else this.list.push(it);SL.store.set("fav",this.list);
    document.querySelectorAll('[data-fav="'+CSS.escape(it.k)+'"]').forEach(b=>b.setAttribute("aria-pressed",String(i<0)));
    SL.toast(i<0?"★ "+it.n+" aggiunto ai preferiti":it.n+" tolto dai preferiti");SL.emit("fav");}
};
SL.norm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
SL.star=(sport,kind,id,name)=>{const k=SL.fav.key(sport,kind,id);return'<button class="star" type="button" data-fav="'+SL.h(k)+'" data-fn="'+SL.h(name)+'" data-fs="'+sport+'" aria-pressed="'+SL.fav.has(k)+'" aria-label="Preferito: '+SL.h(name)+'" title="Preferito">★</button>';};
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-fav]");if(!b)return;e.preventDefault();e.stopPropagation();SL.fav.toggle({k:b.dataset.fav,n:b.dataset.fn,s:b.dataset.fs});},true);

/* ---------- piccoli eventi interni ---------- */
const bus={};
SL.on=(n,f)=>{(bus[n]=bus[n]||[]).push(f);};
SL.emit=(n,d)=>{(bus[n]||[]).forEach(f=>{try{f(d);}catch(e){console.warn(e);}});};
SL.off=(n,f)=>{bus[n]=(bus[n]||[]).filter(x=>x!==f);};
SL.onPage=(n,f)=>{SL.on(n,f);SL.onCleanup(()=>SL.off(n,f));};

/* ---------- avvisi a schermo (gol, mete, set, sorpassi) ---------- */
SL.settings=Object.assign({style:"pitwall",couch:"auto",alerts:"fav",sound:false},SL.store.get("settings",{}));
SL.saveSettings=()=>SL.store.set("settings",SL.settings);
let audio=null;
function beep(){try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.type="triangle";o.frequency.value=880;g.gain.setValueAtTime(.0001,audio.currentTime);g.gain.exponentialRampToValueAtTime(.25,audio.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.5);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.55);}catch(e){}}
const recent=new Map();
SL.alert=function(a){
  /* a: {id, big, title, text, color, important} — important = preferito o Italia */
  if(SL.settings.alerts==="off")return;
  if(SL.settings.alerts==="fav"&&!a.important)return;
  if(window.isFollower&&window.isFollower())return; /* le finestre secondarie non ripetono gli avvisi */
  if(a.id){if(recent.has(a.id)&&Date.now()-recent.get(a.id)<90000)return;recent.set(a.id,Date.now());}
  const el=document.createElement("div");el.className="al sp-"+(a.sport||SL.state.sport||"home");el.style.setProperty("--ac",a.color||"var(--green)");
  el.innerHTML='<span class="big">'+SL.h(a.big||"LIVE")+'</span><span class="tt">'+(a.icon||a.sport?SL.ico(a.icon||a.sport):"")+SL.h(a.title||"")+'</span><span class="tx">'+SL.h(a.text||"")+'</span>';
  if(a.go){el.style.cursor="pointer";el.addEventListener("click",()=>SL.go(a.go));}
  const box=$("alerts");box.prepend(el);while(box.children.length>4)box.lastChild.remove();
  setTimeout(()=>{el.classList.add("out");setTimeout(()=>el.remove(),450);},a.ms||9000);
  if(SL.settings.sound)beep();
};
/* confronto con il valore precedente: avvisa solo sui cambiamenti, mai al primo caricamento */
const seen=new Map();
SL.track=function(key,val,onChange){const prev=seen.get(key);seen.set(key,val);if(prev!==undefined&&prev!==val)onChange(prev,val);};

/* ---------- messaggio breve ---------- */
let toastT=null;
SL.toast=t=>{const el=$("toast");if(!el)return;el.textContent=t;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,3200);};

/* ---------- stile e modalità divano ---------- */
/* telefono: schermo piccolo e dito (il video si apre nell'app o in una nuova scheda, niente finestre appoggiate) */
SL.isPhone=()=>{try{return matchMedia("(pointer:coarse)").matches&&Math.min(screen.width,screen.height)<700;}catch(e){return false;}};
SL.isTVLike=()=>{const ua=navigator.userAgent||"";
  if(/SMART-TV|SmartTV|Tizen|Web0S|webOS|NetCast|HbbTV|BRAVIA|AFT[A-Z]|CrKey|GoogleTV|Android TV|AppleTV|Viera|Philips|Hisense|VIDAA/i.test(ua))return true;
  const coarse=window.matchMedia&&matchMedia("(pointer:coarse)").matches,big=Math.min(screen.width,screen.height)>=700;
  if(coarse&&big)return true; /* tablet */
  if(/iPad/.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1))return true;
  return false;};
SL.couch=()=>SL.settings.couch==="on"||(SL.settings.couch==="auto"&&SL.isTVLike());
SL.applyLook=()=>{const r=document.documentElement;r.dataset.style=SL.settings.style;r.dataset.couch=SL.couch()?"1":"0";
  r.dataset.frame="stadio3d"; /* riquadri: cornice da tabellone + spessore e inclinazione 3D */
  const mt=document.querySelector('meta[name="theme-color"]');if(mt)mt.content=SL.settings.style==="regia"?"#04060c":"#090d16";};

/* ---------- estensione per PC ---------- */
SL.ext=()=>document.documentElement.getAttribute("data-f1pw-tv");
SL.extData=()=>document.documentElement.getAttribute("data-pw-dati");
SL.inFrame=(()=>{try{return window.self!==window.top;}catch(e){return true;}})();

/* ---------- navigazione col telecomando (frecce) ---------- */
const FOCUSABLE='button:not([disabled]),a[href],select,input,[tabindex]:not([tabindex="-1"])';
function visible(el){if(!el.offsetParent&&getComputedStyle(el).position!=="fixed")return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0;}
function scope(){const d=document.querySelector("dialog[open]");if(d)return d;const f=document.querySelector(".card.full");if(f)return f;return document.body;}
function moveFocus(dir){
  const cur=document.activeElement&&document.activeElement!==document.body?document.activeElement:null;
  const all=[...scope().querySelectorAll(FOCUSABLE)].filter(visible);
  if(!all.length)return false;
  if(!cur||!scope().contains(cur)){all[0].focus();return true;}
  const a=cur.getBoundingClientRect(),ax=a.left+a.width/2,ay=a.top+a.height/2;
  let best=null,bs=Infinity;
  for(const el of all){if(el===cur)continue;const b=el.getBoundingClientRect(),bx=b.left+b.width/2,by=b.top+b.height/2;
    let dx=bx-ax,dy=by-ay,main,cross;
    if(dir==="right"){if(b.left<a.right-4&&bx<=ax+2)continue;main=dx;cross=Math.abs(dy);}
    else if(dir==="left"){if(b.right>a.left+4&&bx>=ax-2)continue;main=-dx;cross=Math.abs(dy);}
    else if(dir==="down"){if(b.top<a.bottom-4&&by<=ay+2)continue;main=dy;cross=Math.abs(dx);}
    else{if(b.bottom>a.top+4&&by>=ay-2)continue;main=-dy;cross=Math.abs(dx);}
    if(main<=0)continue;
    const overlap=(dir==="left"||dir==="right")?Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)):Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left));
    const sc=main+cross*(overlap>0?0.3:2.2);
    if(sc<bs){bs=sc;best=el;}}
  if(best){best.focus({preventScroll:false});best.scrollIntoView({block:"nearest",inline:"nearest",behavior:"smooth"});return true;}
  return false;
}
document.addEventListener("keydown",e=>{
  const t=e.target,tag=(t&&t.tagName)||"";
  const typing=tag==="INPUT"&&!/checkbox|radio|button/.test(t.type)||tag==="TEXTAREA";
  const k=e.key,code=e.keyCode;
  const back=k==="Escape"||k==="GoBack"||k==="BrowserBack"||code===10009||code===461||(k==="Backspace"&&!typing);
  if(back){
    const full=document.querySelector(".card.full");if(full){e.preventDefault();SL.ui&&SL.ui.exitFull(full);return;}
    const m=document.querySelector(".menu");if(m){e.preventDefault();m.remove();return;}
    if(document.querySelector("dialog[open]"))return; /* lo chiude il browser */
    if(SL.state.sport!=="home"&&k!=="Escape"){e.preventDefault();SL.go({sport:"home"});}
    return;}
  if(typing||tag==="SELECT")return;
  if((k==="Enter"||k===" ")&&t.getAttribute&&t.getAttribute("role")==="button"&&tag!=="BUTTON"){e.preventDefault();t.click();return;}
  const dir={ArrowRight:"right",ArrowLeft:"left",ArrowDown:"down",ArrowUp:"up"}[k];
  if(dir&&!e.altKey&&!e.ctrlKey&&!e.metaKey){if(moveFocus(dir))e.preventDefault();}
});

/* ---------- sincronizzazione tra finestre (multi-schermo) ---------- */
SL.chan=null;try{SL.chan=new BroadcastChannel("sl-sync");}catch(e){}
window.isFollower=()=>SL.qs.get("follow")==="1";
SL.solo=SL.qs.get("solo")?SL.qs.get("solo").split(",").filter(Boolean):null;
SL.syncOut=()=>{if(!window.isFollower()&&SL.chan)try{SL.chan.postMessage({type:"nav",hash:location.hash});}catch(e){}};
if(SL.chan)SL.chan.onmessage=ev=>{const m=ev.data||{};
  if(m.type==="nav"&&window.isFollower()&&m.hash&&m.hash!==location.hash){history.replaceState(null,"",m.hash);SL.route();}
  if(m.type==="look"){Object.assign(SL.settings,m.settings);SL.applyLook();}
  if(m.type==="ping"&&!window.isFollower())SL.syncOut();
  if(m.type==="closeall"&&window.isFollower())window.close();
  if(m.type==="tvrect"&&window.tvOnRect)window.tvOnRect(m.r);
};

/* ---------- disegno della pagina ---------- */
SL.routeId=0;
SL.route=function(){
  const st=SL.parseHash();SL.state=st;SL.routeId++;
  SL.clearTimers();
  document.body.dataset.sport=st.sport;
  SL.renderTabs();
  /* contenitori nuovi a ogni pagina: niente ascoltatori rimasti dalla pagina precedente */
  const oldSub=$("subbar"),oldMain=$("main"),sub=oldSub.cloneNode(false),main=oldMain.cloneNode(false);
  sub.classList.remove("ingrid");oldMain.replaceWith(main);if(oldSub.isConnected)oldSub.remove();main.before(sub);
  SL.ui.reset(st.sport);
  const mod=SL.sports[st.sport];
  const head=SL.icons.head(st.sport);if(head)sub.appendChild(head);
  SL.icons.credit(st.sport);
  try{mod.mount({st,sub,main});}catch(e){console.error(e);main.innerHTML='<div class="empty" style="grid-column:1/-1">Qualcosa è andato storto in questa sezione. <b>Ricarica la pagina.</b></div>';}
  /* Diretta TV in alto a sinistra: la barra di competizioni e partite le si affianca a destra */
  SL.ui.dock(sub,main);
  if(SL.ui.hscrollIn)SL.ui.hscrollIn(sub);
  if(SL.screens)SL.screens.refresh(); /* schermo singolo, finestra principale o secondaria con più schermi */
  SL.syncOut();
  if(SL.ticker)SL.ticker.page(st.sport);
  document.title=(st.sport==="home"?"Live ora":mod.name)+" · Sport LIVE APP";
};
SL.liveCount={};
SL.setLive=(sport,n)=>{SL.liveCount[sport]=n;document.querySelectorAll('#tabs [data-s="'+sport+'"] .ln,#bnav [data-s="'+sport+'"] .ln').forEach(b=>{b.textContent=n?String(n):"";});};
const TABSHORT={home:"Live",moto:"Motori"};
SL.renderTabs=function(){
  const t=$("tabs");
  if(!t.children.length){
    t.innerHTML=SL.order.map(k=>{const m=SL.sports[k];return'<button type="button" class="sp-'+k+'" data-s="'+k+'" style="--tabc:'+m.color+'" aria-pressed="false">'+SL.ico(k)+SL.h(m.tab||m.name)+'<span class="ln"></span></button>';}).join("");
    t.addEventListener("click",e=>{const b=e.target.closest("button");if(b)SL.go({sport:b.dataset.s});});
  }
  /* telefono: la stessa scelta in una barra in basso (icona grande e nome corto) */
  const bn=$("bnav");
  if(bn&&!bn.children.length){
    bn.innerHTML=SL.order.map(k=>{const m=SL.sports[k];return'<button type="button" class="sp-'+k+'" data-s="'+k+'" style="--tabc:'+m.color+'" aria-pressed="false" aria-label="'+SL.h(m.name)+'">'+SL.ico(k)+'<span class="bl">'+SL.h(TABSHORT[k]||m.tab||m.name)+'</span><span class="ln"></span></button>';}).join("");
    bn.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.s===SL.state.sport){scrollTo({top:0,behavior:"smooth"});return;}SL.go({sport:b.dataset.s});});
  }
  t.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.s===SL.state.sport)));
  if(bn)bn.querySelectorAll("button").forEach(b=>{const on=b.dataset.s===SL.state.sport;b.setAttribute("aria-pressed",String(on));if(on)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
  Object.keys(SL.liveCount).forEach(k=>SL.setLive(k,SL.liveCount[k]));
};

SL.start=function(){
  SL.icons.init();
  SL.applyLook();
  window.addEventListener("resize",()=>{if(SL.settings.couch==="auto")SL.applyLook();});
  window.addEventListener("popstate",SL.route);
  window.addEventListener("hashchange",()=>{if(SL.hashOf(SL.parseHash())!==SL.hashOf(SL.state))SL.route();});
  const tick=()=>{const c=$("clock");if(c)c.textContent=SL.fmtDay(Date.now())+" · "+fT.format(new Date());};tick();setInterval(tick,15000);
  SL.ui.init();
  SL.ticker.init();
  if(SL.screens)SL.screens.boot();
  if(window.isFollower()){$("top").hidden=true;try{SL.chan&&SL.chan.postMessage({type:"ping"});}catch(e){}}
  SL.route();
  SL.sports.home.background&&SL.sports.home.background();
  if(window.SLintro)window.SLintro.ready(); /* pagina pronta: la sigla d'apertura può chiudersi */
};
})();
