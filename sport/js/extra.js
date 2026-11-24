/* Sport LIVE APP — funzioni in più:
   avviso di nuova versione, Condividi (anche "watch party"), TV SYNC anti-spoiler, preferiti su altri dispositivi
   (link, QR, codice) e ricerca estesa, stato delle fonti dati, proxy dati, pulsante Schermi fuori dalle pagine sport. */
(function(){
"use strict";
const h=SL.h,$=id=>document.getElementById(id);
const X=SL.extra={};

/* ---------- utilità ---------- */
const loaded={};
X.script=src=>loaded[src]||(loaded[src]=new Promise((ok,no)=>{const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=()=>{delete loaded[src];no(new Error("script"));};document.head.appendChild(s);}));
/* QR in SVG (libreria qrcode-generator, MIT, caricata solo quando serve) */
X.qr=async function(text,px){await X.script("js/vendor/qrcode.js?v=1");
  const q=window.qrcode(0,"M");q.addData(text);q.make();const n=q.getModuleCount(),cell=Math.max(2,Math.floor((px||240)/(n+8)));
  return q.createSvgTag({cellSize:cell,margin:cell*4,scalable:true,alt:"Codice QR"});};
X.copy=async function(t){try{await navigator.clipboard.writeText(t);return true;}catch(e){
  const ta=document.createElement("textarea");ta.value=t;ta.setAttribute("readonly","");ta.style.cssText="position:fixed;left:-9999px;top:0";document.body.appendChild(ta);ta.select();
  let ok=false;try{ok=document.execCommand("copy");}catch(x){}ta.remove();return ok;}};
/* base64 sicuro negli indirizzi, con testo UTF-8 (nomi con accenti) */
X.enc=obj=>{const b=new TextEncoder().encode(JSON.stringify(obj));let s="";b.forEach(c=>s+=String.fromCharCode(c));return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");};
X.dec=str=>{const s=atob(String(str).replace(/-/g,"+").replace(/_/g,"/"));const b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return JSON.parse(new TextDecoder().decode(b));};
X.base=()=>location.origin+location.pathname;
X.ver=()=>{const v=$("appVer");return v?v.textContent.trim().replace(/^v/,""):"";};
const cmpVer=(a,b)=>{const A=String(a).split(".").map(Number),B=String(b).split(".").map(Number);for(let i=0;i<Math.max(A.length,B.length);i++){const d=(A[i]||0)-(B[i]||0);if(d)return d;}return 0;};
const follower=()=>window.isFollower&&window.isFollower();

/* =====================================================================
   1. NUOVA VERSIONE: ogni 10 minuti (e quando torni sulla pagina) controllo la versione pubblicata
   ===================================================================== */
let updShown="",updT=0;
X.checkUpdate=async function(manual){
  if(location.protocol==="file:")return null;
  try{const r=await fetch(X.base()+"?vc="+Date.now(),{cache:"no-store",credentials:"omit"});if(!r.ok)throw new Error("HTTP "+r.status);
    const t=await r.text(),m=t.match(/id="appVer"[^>]*>v([\d.]+)</);if(!m)return null;
    const pub=m[1],cur=X.ver();
    if(cmpVer(pub,cur)>0){showUpd(pub);return pub;}
    if(manual)return cur;return null;
  }catch(e){if(manual)throw e;return null;}};
function showUpd(v){if(follower()||SL.inFrame)return;if(updShown===v&&!$("updBar").hidden)return;updShown=v;
  $("updTxt").innerHTML='È disponibile la versione <b>v'+h(v)+'</b> (hai la v'+h(X.ver())+')';$("updBar").hidden=false;}
X.reload=async function(){
  /* chiedo la pagina nuova al server, poi ricarico: i file con ?v= nuovi arrivano da soli */
  try{await fetch(X.base(),{cache:"reload",credentials:"omit"});}catch(e){}
  location.reload();};

/* =====================================================================
   2. CONDIVIDI: link della pagina (sport, competizione, giorno, partita), con stile e TV SYNC a scelta
   ===================================================================== */
function shareUrl(){const st=Object.assign({},SL.state);delete st.fav;delete st.k;
  if($("shLook").checked)st.look=SL.settings.style;else delete st.look;
  if($("shSync").checked&&SL.syncMs())st.sync=Math.round(SL.syncMs()/1000);else delete st.sync;
  return X.base()+SL.hashOf(st);}
function shareWhat(){const st=SL.state,m=SL.sports[st.sport]||{};let t=st.sport==="home"?"La home con gli eventi di oggi":"La pagina "+(m.name||"");
  if(st.e)t+=", con la partita aperta";else if(st.c)t+=", con la competizione scelta";if(st.d)t+=" e lo stesso giorno";return t+".";}
function refreshShare(){$("shUrl").value=shareUrl();if(!$("shQr").hidden)drawShareQr();}
async function drawShareQr(){const box=$("shQr");box.hidden=false;box.innerHTML='<div class="loading">Creo il QR</div>';
  try{box.innerHTML=await X.qr($("shUrl").value,260)+'<small>Inquadralo col telefono per aprire la stessa pagina.</small>';}catch(e){box.innerHTML='<p class="hint">QR non disponibile: copia il link.</p>';}}
X.openShare=function(){const d=$("dlgShare");
  $("shWhat").textContent=shareWhat();$("shLookN").textContent=SL.settings.style==="regia"?"Regia TV":"Pit Wall";
  const s=Math.round(SL.syncMs()/1000);$("shSyncN").textContent=s?s+" s":"spento";$("shSync").disabled=!s;$("shSync").checked=!!s;$("shLook").checked=false;
  $("shNative").hidden=!navigator.share;$("shQr").hidden=true;refreshShare();if(!d.open)d.showModal();};

/* link aperto da un "watch party": applico stile e ritardo, poi li tolgo dall'indirizzo */
function applyLinkLook(){const st=SL.parseHash();const msg=[];
  if(st.look==="regia"||st.look==="pitwall"){if(SL.settings.style!==st.look){SL.settings.style=st.look;msg.push("stile "+(st.look==="regia"?"Regia TV":"Pit Wall"));}}
  if(st.sync!=null&&st.sync!==""){const v=Math.max(0,Math.min(90,Math.round(+st.sync)||0));if(v!==Math.round(SL.syncMs()/1000)){SL.settings.sync=v;msg.push("TV SYNC "+v+" s");}}
  if(st.look!=null||st.sync!=null){delete st.look;delete st.sync;history.replaceState(null,"",SL.hashOf(st));SL.saveSettings();}
  return msg;}

/* =====================================================================
   3. TV SYNC: ritardo dei dati (la logica è in SL.get, core.js)
   ===================================================================== */
const syncTxt=v=>v?v+" s":"spento";
function syncUI(){const v=Math.round(SL.syncMs()/1000);
  const b=$("syncV");if(b){b.textContent=v?"+"+v+"s":"";b.hidden=!v;}
  const bt=$("btnSync");if(bt){bt.classList.toggle("on",!!v);bt.setAttribute("aria-label","TV SYNC: "+(v?"ritardo "+v+" secondi":"spento"));}
  [["sySl","syOut","syP"],["setSync","setSyncOut","setSyncP"]].forEach(([sl,out,seg])=>{const S=$(sl);if(!S)return;if(document.activeElement!==S)S.value=v;$(out).textContent=syncTxt(v);
    $(seg).querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(+x.dataset.v===v)));});
  document.documentElement.classList.toggle("synced",!!v);}
let syncT=0;
X.setSync=function(v,quiet){v=Math.max(0,Math.min(90,Math.round(+v)||0));const old=Math.round(SL.syncMs()/1000);SL.settings.sync=v;SL.saveSettings();syncUI();
  try{SL.chan&&SL.chan.postMessage({type:"look",settings:SL.settings});}catch(e){}
  if(v!==old&&!quiet){clearTimeout(syncT);syncT=setTimeout(()=>{if(!v)SL.syncReset();SL.toast(v?"TV SYNC: i dati ora arrivano con "+v+" s di ritardo. Il primo allineamento richiede "+v+" s.":"TV SYNC spento: dati in tempo reale.");},250);}};
function wireSync(sl,seg){$(sl).addEventListener("input",e=>X.setSync(e.target.value,true));$(sl).addEventListener("change",e=>X.setSync(e.target.value));
  $(seg).addEventListener("click",e=>{const b=e.target.closest("button[data-v]");if(b)X.setSync(b.dataset.v);});}

/* =====================================================================
   4. PREFERITI su un altro dispositivo: link #/home?fav=codice, QR, incolla un codice
   ===================================================================== */
const favCode=()=>X.enc(SL.fav.list.map(f=>[f.k,f.n,f.s]));
const favUrl=()=>X.base()+"#/home?fav="+favCode();
function parseFav(txt){txt=String(txt||"").trim();const m=txt.match(/[?&#]fav=([A-Za-z0-9_-]+)/);const code=m?m[1]:txt;
  const a=X.dec(code);if(!Array.isArray(a))throw new Error("codice");
  return a.filter(x=>Array.isArray(x)&&x[0]&&x[1]&&x[2]).map(x=>({k:String(x[0]),n:String(x[1]),s:String(x[2])}));}
let imp=[];
function openImport(list){imp=list;const d=$("dlgImp");const have=new Set(SL.fav.list.map(f=>f.k)),nuovi=list.filter(f=>!have.has(f.k));
  $("imTxt").textContent=list.length+(list.length===1?" preferito":" preferiti")+" nel link"+(SL.fav.list.length?": "+nuovi.length+" nuovi rispetto ai tuoi "+SL.fav.list.length+".":".");
  $("imList").innerHTML=list.map(f=>'<span class="chip'+(have.has(f.k)?" off":"")+'">'+SL.ico(f.s)+h(f.n)+'</span>').join("");
  $("imMerge").hidden=!SL.fav.list.length;$("imRepl").textContent=SL.fav.list.length?"SOSTITUISCI I MIEI":"IMPORTA";
  if(!d.open)d.showModal();}
function doImport(replace){const have=new Set(SL.fav.list.map(f=>f.k));
  if(replace)SL.fav.list.splice(0,SL.fav.list.length,...imp);else imp.forEach(f=>{if(!have.has(f.k))SL.fav.list.push(f);});
  SL.store.set("fav",SL.fav.list);SL.emit("fav");$("dlgImp").close();SL.toast("★ Preferiti importati: ora ne segui "+SL.fav.list.length+".");
  if(SL.state.sport==="home")SL.route();}

/* ricerca estesa: squadre dei campionati principali, NBA, EuroLega, primi 200 del tennis, piloti di F1.
   Stesse chiavi delle ★ nelle pagine, così il preferito funziona ovunque. */
let IDX=null,idxP=null;
X.favIndex=function(){if(IDX)return Promise.resolve(IDX);if(idxP)return idxP;
  idxP=(async()=>{const out=[],add=(s,kind,id,n,img)=>{if(id&&n)out.push({k:SL.fav.key(s,kind,id),s,n,img:img||""});};
    const espnTeams=async(path,sport)=>{const d=await SL.tryGet(SL.ESPN+path+"/teams",{ttl:864e5});
      ((((d||{}).sports||[])[0]||{}).leagues||[]).forEach(l=>(l.teams||[]).forEach(x=>{const t=x.team||{};add(sport,"team",String(t.id),t.displayName,(t.logos&&t.logos[0]&&t.logos[0].href)||"");}));};
    const jobs=["ita.1","eng.1","esp.1","ger.1","fra.1","uefa.champions"].map(l=>espnTeams("soccer/"+l,"calcio")).concat([espnTeams("basketball/nba","basket")]);
    ["atp","wta"].forEach(t=>jobs.push((async()=>{const d=await SL.tryGet(SL.ESPN+"tennis/"+t+"/rankings",{ttl:864e5});
      const R=d&&d.rankings&&d.rankings[0]&&d.rankings[0].ranks||[];R.slice(0,200).forEach(r=>{const a=r.athlete||{};add("tennis","player",String(a.id),a.displayName,a.flag&&a.flag.href);});})()));
    if(SL.euro&&SL.euro.clubs)jobs.push(SL.euro.clubs().then(L=>(L||[]).forEach(c=>add("basket","team","eu:"+c.code,c.name,c.logo))).catch(()=>{}));
    jobs.push((async()=>{const d=await SL.tryGet("https://api.jolpi.ca/ergast/f1/current/drivers.json",{ttl:864e5});
      (((d||{}).MRData||{}).DriverTable||{}).Drivers&&d.MRData.DriverTable.Drivers.forEach(x=>add("moto","rider",SL.norm(x.givenName+" "+x.familyName).replace(/\s+/g,"-"),x.givenName+" "+x.familyName,""));})());
    await Promise.all(jobs.map(p=>p.catch(()=>{})));
    const seen=new Set();IDX=out.filter(x=>{if(seen.has(x.k))return false;seen.add(x.k);return true;});return IDX;})();
  return idxP;};

/* =====================================================================
   5. STATO DELLE FONTI
   ===================================================================== */
const SRC=[
  {n:"ESPN",d:"calcio, NBA, tennis, rugby, golf, IndyCar",h:["site.api.espn.com","sports.core.api.espn.com"],t:()=>SL.ESPN+"basketball/nba/scoreboard"},
  {n:"EuroLega / EuroCup",d:"basket europeo",h:["feeds.incrowdsports.com","live.euroleague.net"],t:()=>"https://feeds.incrowdsports.com/provider/euroleague-feeds/v2/competitions/E/seasons"},
  {n:"OpenF1",d:"Formula 1: sessioni e tempi",h:["api.openf1.org"],t:()=>"https://api.openf1.org/v1/sessions?session_key=latest"},
  {n:"Jolpica",d:"Formula 1: classifiche",h:["api.jolpi.ca"],t:()=>"https://api.jolpi.ca/ergast/f1/current/driverStandings.json"},
  {n:"MotoGP",d:"live timing e classifiche",h:["api.motogp.pulselive.com"],moto:1,t:()=>"https://api.motogp.pulselive.com/motogp/v1/results/seasons"},
  {n:"Superbike",d:"WorldSBK",h:["api.pulselive.worldsbk.com"],moto:1,t:()=>"https://api.pulselive.worldsbk.com/wsbk-events/v1/seasons/"+new Date().getFullYear()+"/rounds"}
];
const ago=t=>{const s=Math.round((Date.now()-t)/1000);return s<60?s+" s fa":s<3600?Math.round(s/60)+" min fa":Math.round(s/3600)+" h fa";};
function drawSrc(){const box=$("srcList");if(!box)return;
  box.innerHTML=SRC.map(x=>{const st=x.h.map(k=>SL.src[k]).filter(Boolean).sort((a,b)=>b.t-a.t)[0];
    let cls="na",txt="non ancora usata";
    if(x.moto&&!SL.motoData()){cls="off";txt="serve l'estensione per PC o il proxy dati";}
    else if(st){cls=st.ok?(st.ms>2500?"slow":"ok"):"ko";txt=st.ok?"OK · "+st.ms+" ms · "+ago(st.t)+(st.proxy?" · via proxy":""):"non risponde ("+st.msg+") · "+ago(st.t)+(st.okT?" · ultima risposta "+ago(st.okT):"");}
    return'<div class="src '+cls+'"><i></i><span><b>'+h(x.n)+'</b><small>'+h(x.d)+'</small></span><em>'+h(txt)+'</em></div>';}).join("");}
X.testSources=async function(){$("srcMsg").textContent="Provo le fonti…";
  await Promise.all(SRC.filter(x=>!x.moto||SL.motoData()).map(x=>SL.get(x.t(),{ttl:0,timeout:12000}).catch(()=>null)));
  drawSrc();const bad=SRC.filter(x=>(!x.moto||SL.motoData())&&x.h.some(k=>SL.src[k]&&!SL.src[k].ok)).length;
  $("srcMsg").textContent=bad?bad+(bad===1?" fonte non risponde":" fonti non rispondono")+": i dati di quello sport possono mancare.":"Tutte le fonti rispondono.";};

/* =====================================================================
   6. PROXY DATI (Cloudflare Worker): indirizzo salvato nelle Impostazioni
   ===================================================================== */
async function testProxy(){const v=$("setProxy").value.trim().replace(/\/+$/,""),msg=$("setProxyMsg");
  if(!/^https:\/\/[^\s/]+/i.test(v)){msg.textContent="Scrivi l'indirizzo completo, che inizia con https://";return;}
  msg.textContent="Provo il proxy…";
  try{const u=v+"/?u="+encodeURIComponent("https://api.motogp.pulselive.com/motogp/v1/results/seasons");const r=await fetch(u,{cache:"no-store",credentials:"omit"});
    if(!r.ok)throw new Error("HTTP "+r.status);const j=await r.json();if(!Array.isArray(j)&&!j)throw new Error("risposta vuota");
    SL.settings.proxy=v;SL.saveSettings();msg.textContent="✓ Funziona: MotoGP e Superbike ora arrivano dal proxy.";SL.route();
  }catch(e){msg.textContent="Il proxy non risponde ("+(e.message||"errore")+"). Controlla l'indirizzo e che il Worker sia pubblicato.";}}

/* =====================================================================
   Avvio
   ===================================================================== */
function settingsOpen(){syncUI();drawSrc();$("setProxy").value=SL.settings.proxy||"";$("setProxyMsg").textContent=SL.proxyUrl()?"Proxy attivo.":"";$("setUpdMsg").textContent="";
  clearInterval(X._srcT);X._srcT=setInterval(()=>{if($("dlgSettings").open)drawSrc();else clearInterval(X._srcT);},3000);}
function init(){
  /* link aperti da fuori: stile/ritardo del watch party, preferiti da importare */
  const lk=applyLinkLook();
  const st0=SL.parseHash();let favIn=null;
  if(st0.fav){try{favIn=parseFav(st0.fav);}catch(e){setTimeout(()=>SL.toast("Il link dei preferiti non è valido o è incompleto."),800);}
    delete st0.fav;history.replaceState(null,"",SL.hashOf(st0));}
  setTimeout(()=>{if(lk.length)SL.toast("Aperto con "+lk.join(" e ")+" (lo cambi in ⚙).");if(favIn&&favIn.length)openImport(favIn);},900);

  /* avviso nuova versione */
  $("updGo").addEventListener("click",X.reload);
  $("updX").addEventListener("click",()=>{$("updBar").hidden=true;});
  const tick=()=>{if(!document.hidden)X.checkUpdate().catch(()=>{});};
  setTimeout(tick,60000);updT=setInterval(tick,10*60000);
  let lastVis=Date.now();document.addEventListener("visibilitychange",()=>{if(!document.hidden&&Date.now()-lastVis>5*60000)tick();if(document.hidden)lastVis=Date.now();});
  $("setUpd").addEventListener("click",async()=>{const m=$("setUpdMsg");m.textContent="Controllo…";
    try{const v=await X.checkUpdate(true);m.textContent=v&&cmpVer(v,X.ver())>0?"C'è la v"+v+": premi AGGIORNA in basso.":"Hai già l'ultima versione (v"+X.ver()+").";}
    catch(e){m.textContent="Non riesco a controllare adesso: riprova più tardi.";}});

  /* condividi */
  $("btnShare").addEventListener("click",X.openShare);
  $("shLook").addEventListener("change",refreshShare);$("shSync").addEventListener("change",refreshShare);
  $("shCopy").addEventListener("click",async()=>{const ok=await X.copy($("shUrl").value);SL.toast(ok?"Link copiato: incollalo dove vuoi.":"Non riesco a copiare: tieni premuto sul link e copialo.");if(!ok){$("shUrl").focus();$("shUrl").select();}});
  $("shNative").addEventListener("click",()=>{navigator.share({title:document.title,url:$("shUrl").value}).catch(()=>{});});
  $("shQrB").addEventListener("click",drawShareQr);

  /* TV SYNC */
  $("btnSync").addEventListener("click",()=>{syncUI();$("dlgSync").showModal();});
  wireSync("sySl","syP");wireSync("setSync","setSyncP");
  $("dlgSync").addEventListener("click",e=>{const b=e.target.closest("button[data-d]");if(b)X.setSync(Math.round(SL.syncMs()/1000)+(+b.dataset.d));});
  syncUI();

  /* preferiti */
  $("favLink").addEventListener("click",async()=>{if(!SL.fav.list.length){SL.toast("Non hai ancora preferiti da portare altrove.");return;}
    const ok=await X.copy(favUrl());SL.toast(ok?"Link dei preferiti copiato: aprilo sull'altro dispositivo.":"Non riesco a copiare il link.");});
  $("favQrB").addEventListener("click",async()=>{const box=$("favQr");if(!SL.fav.list.length){SL.toast("Non hai ancora preferiti da portare altrove.");return;}
    if(!box.hidden){box.hidden=true;return;}box.hidden=false;box.innerHTML='<div class="loading">Creo il QR</div>';
    try{box.innerHTML=await X.qr(favUrl(),260)+'<small>Inquadralo con il telefono o il tablet: si apre Sport LIVE e ti chiede se importare.</small>';}catch(e){box.innerHTML='<p class="hint">QR non disponibile: usa COPIA IL LINK.</p>';}});
  $("favPasteB").addEventListener("click",()=>{const r=$("favPasteRow");r.hidden=!r.hidden;if(!r.hidden)$("favPaste").focus();});
  $("favPasteGo").addEventListener("click",()=>{try{const L=parseFav($("favPaste").value);if(!L.length)throw 0;$("dlgFav").close();openImport(L);}catch(e){SL.toast("Codice non valido: incolla il link copiato dall'altro dispositivo.");}});
  $("favPaste").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();$("favPasteGo").click();}});
  $("imMerge").addEventListener("click",()=>doImport(false));
  $("imRepl").addEventListener("click",()=>doImport(!!SL.fav.list.length));

  /* impostazioni: stato fonti, proxy */
  SL.on("settings",settingsOpen);
  $("srcTest").addEventListener("click",X.testSources);
  $("setProxyTest").addEventListener("click",testProxy);
  $("setProxy").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();testProxy();}});
  $("setProxyOff").addEventListener("click",()=>{SL.settings.proxy="";SL.saveSettings();$("setProxy").value="";$("setProxyMsg").textContent="Proxy tolto.";SL.route();});
  /* la versione in alto apre le Impostazioni (lì c'è lo stato delle fonti) */
  const av=$("appVer");if(av){av.setAttribute("role","button");av.tabIndex=0;av.title+=" · tocca per stato fonti e aggiornamenti";
    av.addEventListener("click",()=>SL.ui.openSettings());av.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();SL.ui.openSettings();}});}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
