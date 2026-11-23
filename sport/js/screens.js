/* Sport LIVE APP — SCHERMI (stesse funzioni del pulsante SCHERMI dell'app F1 Pit Wall)
   Scelta iniziale:
   · Schermo singolo: Diretta TV grande e centrata (16:9), le altre sezioni attorno (sopra, sinistra, destra, sotto).
     Preset pronti o disposizione manuale con trascinamento, misura S/M/L nella zona, dimensione della TV,
     barra comandi visibile o nascosta. Resta salvata sul dispositivo (una disposizione per sport).
   · Più schermi: rileva i monitor, proposta automatica o disposizione manuale, trascina le sezioni sugli schermi
     (o toccale e poi tocca lo schermo), misure S/M/L/⛶, cestino, apre una finestra per monitor, tutte sincronizzate.
   Finestre: barra con ⌂ HOME, ⚙ DISPOSIZIONE, ☰ COMANDI, ⛶ SCHERMO INTERO, ESCI / LAYOUT COMPLETO.
   Le sezioni sono quelle della pagina aperta (cambiano da sport a sport) più "Partite e filtri" (la barra in alto). */
(function(){
"use strict";
const UI=SL.ui,h=SL.h,$=id=>document.getElementById(id),$$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const SC=SL.screens={homeOn:false,mismatch:false};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const toast=t=>SL.toast(t);
const setT=(el,t)=>{if(el)el.textContent=t;};
const isF=()=>window.isFollower();

/* =====================================================================
   Sezioni della pagina (unità)
   ===================================================================== */
const ICON={tv:"▶",sub:"☰",match:"◉",events:"⚑",stats:"∿",pitch:"▦",table:"≡",momentum:"∿",shots:"◎",cronaca:"✎",multi:"⊞",leaders:"★",box:"▤",wp:"∿",
  games:"⊞",pbp:"✎",today:"⊞",ita:"✚",rank:"≡",cal:"▦",draw:"⑂",form:"↗",lineup:"▦",matches:"⊞",timing:"⏱",gap:"↔",weekend:"▦",results:"≡",
  standings:"≡",latest:"⏱",round:"▦",race:"⚑",next:"⏳",board:"≡",card:"▤",need:"!",nolive:"◌"};
const PAL=["#06B6D4","#10B981","#A855F7","#F59E0B","#ec4899","#4f8ef7","#f59b42","#3fbf7f","#e879f9","#22d3ee"];
let UNITS=[],UK={};
const shortName=n=>{const s=String(n).split(/ · | e /)[0].replace(/^Classifica (del torneo|live|mondiale|piloti)$/,"Classifica");return s.length>15?s.split(" ").slice(0,2).join(" "):s;};
function units(){
  const defs=UI.defs||[];UNITS=[];UK={};
  if(!defs.length||!defs.some(d=>d.k==="tv"))return UNITS;
  const add=u=>{UNITS.push(u);UK[u.k]=u;};let ci=0;
  add({k:"sub",n:"Partite e filtri",s:"Filtri",i:ICON.sub,c:"#8792aa",w:1});
  defs.forEach(d=>add({k:d.k,n:d.n,s:shortName(d.n),i:ICON[d.k]||"◆",c:d.k==="tv"?"#f43f5e":PAL[(ci++)%PAL.length],w:d.k==="tv"?3:(d.sz||2),hero:!!d.hero}));
  return UNITS;}
/* importanza: la sezione principale, poi la TV, poi l'ordine della pagina */
const rank=k=>{const u=UK[k];if(!u)return 99;if(u.hero)return-2;if(k==="tv")return-1;return UNITS.indexOf(u);};
SC.units=()=>units().slice();

/* =====================================================================
   Disposizione a griglia di una finestra (come l'app F1)
   misure: 1 piccola, 2 media, 3 grande, 4 schermo intero
   ===================================================================== */
const SZW={1:1,2:2,3:3.4},SZNAME={1:"S",2:"M",3:"L",4:"⛶"};
const szOf=(k,sz)=>{const v=(sz||{})[k];return v>=1&&v<=4?v:2;};
function layoutGrid(list,sz){
  const full=list.find(k=>szOf(k,sz)===4);
  if(full)return{nc:1,cols:"minmax(0,1fr)",rows:[full==="sub"?"tl":"u0"],trs:["minmax(0,1fr)"],body:full==="sub"?[]:[full],tiles:full==="sub"};
  const body=list.filter(k=>k!=="sub").sort((a,b)=>szOf(b,sz)-szOf(a,sz)||rank(a)-rank(b)),tiles=list.indexOf("sub")>=0;
  const W=k=>SZW[szOf(k,sz)],rest=body.slice(1),nc=body.length<=1?1:rest.length<=3?2:3,rows=[],trs=[];
  if(tiles){rows.push(Array(nc).fill("tl").join(" "));trs.push(body.length?"auto":"minmax(0,1fr)");}
  let cols="minmax(0,1fr)";
  if(nc===1&&body.length){rows.push("u0");trs.push("minmax(0,1fr)");}
  else if(nc===2){const mr=Math.max(...rest.map(W));cols="minmax(0,"+(W(body[0])*1.3).toFixed(2)+"fr) minmax(0,"+mr.toFixed(2)+"fr)";rest.forEach((k,r)=>{rows.push("u0 u"+(r+1));trs.push("minmax(0,"+W(k).toFixed(2)+"fr)");});}
  else if(nc===3){const mr=Math.max(...rest.map(W));cols="minmax(0,"+(W(body[0])*1.3).toFixed(2)+"fr) minmax(0,"+mr.toFixed(2)+"fr) minmax(0,"+mr.toFixed(2)+"fr)";
    for(let r=0;r<Math.ceil(rest.length/2);r++){const a=rest[r*2],b=rest[r*2+1];rows.push("u0 u"+(r*2+1)+" "+(b?"u"+(r*2+2):"u"+(r*2+1)));trs.push("minmax(0,"+Math.max(W(a),b?W(b):0).toFixed(2)+"fr)");}}
  return{nc,cols,rows,trs,body,tiles};
}

/* =====================================================================
   Quale disposizione vale in questa finestra
   ===================================================================== */
const leadKey=()=>"msolo2."+UI.sport;
const leadPlan=()=>{const p=SL.store.sget(leadKey(),null);return p&&Array.isArray(p.list)&&p.list.length?p:null;};
SC.urlSz=(()=>{const o={};(SL.qs.get("sz")||"").split(",").forEach(p=>{const a=p.split(":");if(a[0]&&+a[1]>=1&&+a[1]<=4)o[a[0]]=+a[1];});return o;})();
const sglOnStored=()=>!!SL.store.get("sglOn",false);
function sglWanted(){return!isF()&&sglOnStored()&&innerWidth>=900&&!leadPlan()&&(UI.defs||[]).some(d=>d.k==="tv");}
/* elenco delle sezioni da mostrare: lo usa UI.mount per nascondere le altre */
UI.soloList=function(){
  const defs=UI.defs||[],has=k=>k==="sub"||defs.some(d=>d.k===k);SC.mismatch=false;
  if(isF()){if(SC.homeOn)return null;const all=SL.solo||[],L=all.filter(has),spec=all.filter(k=>k!=="sub"&&k!=="tv");
    /* la TV e i filtri ci sono in ogni sport: se le sezioni proprie di questo schermo mancano (altro sport), pagina intera */
    if(!L.filter(k=>k!=="sub").length||(spec.length&&!L.some(k=>spec.indexOf(k)>=0))){SC.mismatch=!!(all.length&&defs.length);return null;}return L;}
  const lp=leadPlan();if(lp){const L=lp.list.filter(has);return L.length?L:null;}
  if(sglWanted())return sglList(sglCfg());
  return null;};

/* =====================================================================
   Barra della finestra (come la soloBar dell'app F1)
   ===================================================================== */
let barKind=null;
function bar(kind,list){
  barKind=kind;const sb=$("soloBar");if(!sb)return;
  if(!kind){sb.hidden=true;placeBar(false);document.body.classList.remove("has-sb");return;}
  sb.hidden=false;document.body.classList.add("has-sb");
  const names=(list||[]).map(k=>UK[k]?UK[k].n:k).join(" · ");
  $("soloLogo").hidden=!isF();
  $("soloHome").hidden=!isF()||(kind==="followHome"&&SC.mismatch);
  setT($("soloHome"),SC.homeOn?"↩ TORNA ALLA SEZIONE":"⌂ HOME");$("soloHome").setAttribute("aria-pressed",String(SC.homeOn));
  $("soloLay").hidden=kind!=="sgl";$("soloHd").hidden=kind!=="sgl";
  $("soloExit").hidden=!(kind==="lead"||kind==="sgl");setT($("soloExit"),kind==="sgl"?"ESCI":"LAYOUT COMPLETO");
  let t="";
  if(kind==="follow")t="Schermo secondario · "+names+" · sincronizzato";
  else if(kind==="followHome")t=SC.mismatch?"Questa pagina non ha le sezioni assegnate a questo schermo: la vedi intera, sincronizzata":"Home · pagina intera, sincronizzata con la finestra principale";
  else if(kind==="lead")t="Finestra principale · "+names;
  else if(kind==="sgl")t="Schermo singolo · "+sglName(sglCfg());
  sb.dataset.base=t;setT($("soloTxt"),t);$("soloTxt").classList.remove("k1r");
  placeBar(kind==="sgl"&&sglCfg().hd!==false);
  if(kind==="sgl")$("soloHd").setAttribute("aria-pressed",String(sglCfg().hd!==false));
}
/* in schermo singolo con la barra comandi visibile, i pulsanti vanno dentro la barra in alto (solo icone) */
let barPh=null;
function placeBar(inTop){
  const sb=$("soloBar"),top=$("top");if(!sb||!top)return;
  if(!barPh){barPh=document.createComment("barra finestra");sb.parentNode.insertBefore(barPh,sb);}
  if(inTop&&sb.parentNode!==top)top.appendChild(sb);
  else if(!inTop&&sb.parentNode===top)barPh.parentNode.insertBefore(sb,barPh.nextSibling);
  sb.classList.toggle("in-top",!!inTop);
  [["soloLay","Disposizione dello schermo singolo"],["soloHd","Mostra o nascondi la barra comandi"],["soloFs","Schermo intero"],["soloExit","Esci dallo schermo singolo"]].forEach(([id,l])=>{const b=$(id);if(!b)return;if(inTop){b.title=l;b.setAttribute("aria-label",l);}else{b.removeAttribute("title");b.removeAttribute("aria-label");}});
}

/* =====================================================================
   Applica la disposizione alla pagina appena disegnata
   ===================================================================== */
function stopPack(main){if(UI._ro){UI._ro.disconnect();UI._ro=null;}main.classList.remove("masonry");
  [...main.children].forEach(el=>{el.style.gridRow="";el.style.gridRowEnd="";el.style.gridColumn="";});}
function fitHeight(main){
  const top=$("top"),sb=$("soloBar"),tk=$("ticker");
  const vis=el=>el&&!el.hidden&&getComputedStyle(el).display!=="none";
  const used=(vis(top)?top.offsetHeight:0)+(vis(sb)&&!sb.classList.contains("in-top")?sb.offsetHeight:0)+(vis(tk)?tk.offsetHeight:0);
  main.style.height=Math.max(320,innerHeight-used)+"px";}
function applySolo(list,sz,lead){
  const main=$("main"),sub=$("subbar");if(!main)return;
  document.body.classList.add("solo");document.body.classList.toggle("lead",!!lead);
  stopPack(main);
  const g=layoutGrid(list,sz||{});
  main.classList.add("sololay");
  main.style.gridTemplateAreas=g.rows.map(r=>'"'+r+'"').join(" ");main.style.gridTemplateColumns=g.cols;main.style.gridTemplateRows=g.trs.join(" ");
  [...main.children].forEach(el=>{if(el===sub)return;if(el.classList.contains("card")){const i=g.body.indexOf(el.dataset.k);el.style.gridArea=i>=0?"u"+i:"";el.hidden=i<0;}else el.hidden=true;});
  if(sub){if(g.tiles){if(sub.parentNode!==main)main.prepend(sub);sub.classList.add("ingrid");sub.style.gridArea="tl";sub.hidden=false;}else sub.hidden=true;}
  bar(lead?"lead":"follow",list);fitHeight(main);
  requestAnimationFrame(()=>{fitHeight(main);SL.emit("resize");});
}
SC.active=()=>document.body.classList.contains("solo")||document.body.classList.contains("sgl");
/* misura S/M/L di una sezione dentro una finestra con più schermi (menu ⋯) */
SC.soloCur=k=>{const lp=leadPlan();return szOf(k,isF()?SC.urlSz:((lp&&lp.sz)||{}));};
SC.soloSet=(k,v)=>{if(isF())SC.urlSz[k]=v;else{const lp=leadPlan();if(lp){lp.sz=lp.sz||{};lp.sz[k]=v;SL.store.sset(leadKey(),lp);}}
  SC.refresh();toast((UK[k]?UK[k].n:k)+": misura "+SZNAME[v]+" in questa finestra.");};
/* chiamata dopo ogni disegno della pagina (anche quando una pagina monta le sezioni dopo) */
SC.refresh=function(){
  const b=document.body;b.classList.remove("solo","sgl","sgl-nohd","lead");
  const top=$("top");if(top)top.hidden=isF(); /* la barra in alto torna (le finestre secondarie non la hanno) */
  const main=$("main");if(main){main.classList.remove("sololay","sgllay");main.style.gridTemplateAreas=main.style.gridTemplateColumns=main.style.gridTemplateRows=main.style.height="";}
  units();
  if(!UNITS.length){bar(isF()?"followHome":null);return;}
  if(isF()){if(SC.homeOn||SC.mismatch){bar("followHome");return;}const L=UI.soloList();if(L){applySolo(L,SC.urlSz,false);return;}bar("followHome");return;}
  const lp=leadPlan();if(lp){const L=UI.soloList();if(L){applySolo(L,lp.sz||{},true);return;}}
  if(sglWanted()){sglApply();return;}
  bar(null);
};
let rfT=0;SC.refreshSoon=()=>{cancelAnimationFrame(rfT);rfT=requestAnimationFrame(SC.refresh);};

/* =====================================================================
   SCHERMO SINGOLO
   ===================================================================== */
const Z4=["T","L","R","B"],ZNAME={T:"Sopra",L:"Sinistra",R:"Destra",B:"Sotto"},WN=["","S","M","L"];
const TALL=["table","standings","rank","board","timing","cal","pbp","cronaca","events","box","lineup","pitch","draw","matches","today"];
const MINW=k=>k==="sub"?320:TALL.indexOf(k)>=0?320:280,MINH=k=>k==="sub"?Math.max(120,SG.subH||0):TALL.indexOf(k)>=0?230:150;
/* preset costruiti sulle sezioni della pagina: la principale, poi le altre in ordine di importanza */
function presets(){
  const L=UNITS.filter(u=>u.k!=="tv"&&u.k!=="sub").sort((a,b)=>rank(a.k)-rank(b.k)).map(u=>u.k),o=i=>L[i]?[L[i]]:[];
  return[
    {id:"regia",n:"Regia",d:"Equilibrato: partite e filtri sopra, la sezione principale a sinistra, le altre attorno.",tv:.62,Z:{T:["sub"],L:o(0),R:o(1).concat(o(2)),B:o(3)}},
    {id:"cinema",n:"Cinema",d:"La TV più grande possibile: solo la sezione principale a sinistra e una a destra.",tv:.8,Z:{T:[],L:o(0),R:o(1),B:[]}},
    {id:"analisi",n:"Analisi",d:"Più dati possibile attorno alla TV, con una sezione anche sotto.",tv:.5,Z:{T:["sub"],L:o(0).concat(o(3)),R:o(1).concat(o(2)),B:o(4)}},
    {id:"panoramica",n:"Panoramica",d:"Tutte le sezioni principali in vista, la TV un po' più piccola.",tv:.48,Z:{T:["sub"],L:o(0).concat(o(2)),R:o(1).concat(o(3)),B:o(4).concat(o(5))}},
    {id:"party",n:"Watch party",d:"Per seguire con gli amici: partite e filtri a sinistra, la sezione principale a destra.",tv:.6,Z:{T:[],L:["sub"],R:o(0).concat(o(1)),B:[]}}
  ];}
function sglNorm(c){
  c=c&&typeof c==="object"?c:{};const used={tv:1},Z={};
  Z4.forEach(z=>{Z[z]=(Array.isArray(c.Z&&c.Z[z])?c.Z[z]:[]).filter(k=>typeof k==="string"&&UK[k]&&!used[k]&&(used[k]=1));});
  const w={},cw=c.w&&typeof c.w==="object"?c.w:{};Object.keys(cw).forEach(k=>{if(UK[k]&&(cw[k]===1||cw[k]===3))w[k]=cw[k];});
  const tv=+c.tv,base=presets().some(p=>p.id===c.base)?c.base:"";
  return{base,mod:!!(base&&c.mod),tv:tv>=.4&&tv<=.8?tv:.62,Z,w,hd:c.hd!==false};}
const fromPreset=(p,hd)=>sglNorm({base:p.id,mod:false,tv:p.tv,Z:p.Z,w:{},hd:hd!==false});
const sglName=c=>{const p=presets().find(x=>x.id===c.base);return p?p.n+(c.mod?" (modificato)":""):"Personalizzata";};
const sglClone=c=>sglNorm(JSON.parse(JSON.stringify(c)));
const cfgKey=()=>"sgl2."+UI.sport;
function sglCfg(){units();let c=sglNorm(SL.store.get(cfgKey(),null));if(!Z4.some(z=>c.Z[z].length))c=fromPreset(presets()[0]);return c;}
const sglList=c=>["tv"].concat(...Z4.map(z=>c.Z[z]));
const SG=SC._sg={chrome:66,padW:22,it:0,itT:0,draft:null,armed:null,drag:null,geom:null};
/* geometria: la TV resta 16:9, centrata, la più grande possibile; le sezioni attorno hanno spazio minimo */
function sglGeom(W,H,c,chrome,padW){
  const g=10,Z=c.Z,lr=Z.L.length+Z.R.length>0,tb=Z.T.length+Z.B.length>0;
  const sideMin=lr?Math.round(Math.min(Math.max(clamp(W*.17,250,340),...Z.L.concat(Z.R).map(MINW)),W*.25)):0;
  /* fasce sopra e sotto: quella con "Partite e filtri" è alta quanto serve, l'altra ha il suo minimo */
  const zmin=z=>Z[z].length?Math.round(Math.max(Z[z].indexOf("sub")>=0?MINH("sub"):112,Math.min(Math.max(...Z[z].map(MINH)),H*.19))):0;
  const tMin=zmin("T"),bMin=zmin("B");
  let w=Math.min(c.tv*W,W-(lr?2*(sideMin+g):0)),ch=(w-padW)*9/16+chrome;
  /* misura S: anche quando l'altezza limita la TV resta visibilmente più piccola della M */
  const k=c.tv<.53?.8:1,maxSym=(H-(tb?2*(Math.max(tMin,bMin)+g):0))*k;
  let tRow=0;
  if(ch>maxSym){
    if(tMin===bMin)ch=maxSym;
    else{/* centrata non ci sta: la TV usa anche lo spazio che la fascia più bassa non usa */
      ch=Math.min(ch,(H-tMin-bMin-4*g)*k);const extra=Math.max(0,H-ch-4*g-tMin-bMin);tRow=Math.round(tMin+(bMin?extra/2:extra));}
    w=(ch-chrome)*16/9+padW;}
  w=Math.max(240,Math.round(w));ch=Math.max(160,Math.round(ch));
  const st=tRow||Math.max(0,(H-ch)/2-2*g),sb=Math.max(0,H-ch-4*g-st);
  return{w,h:ch,vw:Math.max(0,Math.round(w-padW)),vh:Math.max(0,Math.round(ch-chrome)),side:Math.max(0,(W-w)/2-g),strip:Math.max(st,sb),st,sb,tRow};}
function sglArea(hd,preview){
  const top=$("top"),sb=$("soloBar");
  const topH=top&&top.offsetHeight&&!top.hidden?top.offsetHeight:SL.store.get("sglHdH",64);
  if(top&&top.offsetHeight&&!preview&&hd)SL.store.set("sglHdH",top.offsetHeight);
  const hdH=hd?topH:0,sbH=hd?0:((sb&&!sb.hidden&&!sb.classList.contains("in-top")&&sb.offsetHeight)||36);
  const main=$("main"),W=(preview?document.documentElement.clientWidth:(main?main.clientWidth:innerWidth))-20;
  return{W:Math.max(600,W),H:Math.max(320,innerHeight-20-hdH-sbH),hdH,sbH};}
function sglApply(){
  const c=sglCfg(),main=$("main"),sub=$("subbar");if(!main)return;
  document.body.classList.add("sgl");document.body.classList.toggle("sgl-nohd",c.hd===false);
  stopPack(main);main.classList.add("sgllay");
  /* zone attorno alla TV (se c'erano già, prima rimetto le sezioni nella pagina) */
  $$(".sglz",main).forEach(z=>{[...z.children].forEach(ch=>main.appendChild(ch));z.remove();});
  const zones={};Z4.forEach(z=>{const d=document.createElement("div");d.className="sglz "+(z==="L"||z==="R"?"zcol":"zrow");d.dataset.z=z;d.style.gridArea=z;d.hidden=!c.Z[z].length;main.appendChild(d);zones[z]=d;});
  const el=k=>k==="sub"?sub:main.querySelector('.card[data-k="'+k+'"]');
  [...main.children].forEach(x=>{if(x.classList.contains("sglz"))return;if(x.classList.contains("card")&&x.dataset.k==="tv")return;if(x!==sub)x.hidden=true;});
  if(sub)sub.hidden=true;
  Z4.forEach(z=>c.Z[z].forEach(k=>{const e=el(k);if(!e)return;e.hidden=false;e.style.setProperty("--fw",c.w[k]||2);if(k==="sub")e.classList.add("ingrid");zones[z].appendChild(e);}));
  const tv=el("tv");if(tv){tv.style.gridArea="V";tv.hidden=false;
    /* TV accesa o spenta cambia forma al riquadro: ricalcolo */
    if(SG.mo)SG.mo.disconnect();SG.mo=new MutationObserver(()=>{SG.it=0;sglLayout();});SG.mo.observe(tv,{attributes:true,attributeFilter:["class"]});SL.onCleanup(()=>{if(SG.mo){SG.mo.disconnect();SG.mo=null;}});}
  /* le partite arrivano dopo: quando cambia l'altezza di "Partite e filtri" ricalcolo la fascia */
  if(SG.ro){SG.ro.disconnect();SG.ro=null;}if(SG.mo2){SG.mo2.disconnect();SG.mo2=null;}
  if(sub&&sub.parentElement&&sub.parentElement.classList.contains("zrow")&&window.ResizeObserver){
    let t=0;const kick=()=>{cancelAnimationFrame(t);t=requestAnimationFrame(()=>{const n=subNat(sglArea(c.hd!==false,false).H);if(n&&Math.abs(n-(SG.subH||0))>6){SG.it=0;sglLayout();}});};
    SG.ro=new ResizeObserver(kick);const obs=()=>[...sub.children].forEach(x=>SG.ro.observe(x));obs();
    SG.mo2=new MutationObserver(()=>{obs();kick();});SG.mo2.observe(sub,{childList:true});
    SL.onCleanup(()=>{if(SG.ro){SG.ro.disconnect();SG.ro=null;}if(SG.mo2){SG.mo2.disconnect();SG.mo2=null;}});}
  bar("sgl");SG.it=0;sglLayout();
}
/* altezza naturale di "Partite e filtri" in una fascia sopra/sotto (righe che vanno a capo) */
function subNat(H){
  const sb=document.querySelector("#main .sglz.zrow>.subbar");if(!sb)return 0;
  let t=1e9,bt=-1e9;[...sb.children].forEach(x=>{const r=x.getBoundingClientRect();if(!r.height)return;t=Math.min(t,r.top);bt=Math.max(bt,r.bottom);});
  return bt>t?Math.min(Math.round(H*.25),Math.round(bt-t+22)):0;}
function sglLayout(){
  if(!document.body.classList.contains("sgl"))return;
  const c=sglCfg(),main=$("main"),hd=c.hd!==false;
  $("top").hidden=!hd;
  const a=sglArea(hd,false),g=sglGeom(a.W,a.H,c,SG.chrome,SG.padW);SG.geom=g;
  main.style.gridTemplateAreas='"L T R" "L V R" "L B R"';
  main.style.gridTemplateRows=(g.tRow?g.tRow+"px ":"minmax(0,1fr) ")+g.h+"px minmax(0,1fr)";
  main.style.gridTemplateColumns="minmax(0,1fr) "+g.w+"px minmax(0,1fr)";
  main.style.height=a.H+"px";
  /* misura i bordi reali del riquadro TV e ricalcola se servono (come l'app F1) */
  requestAnimationFrame(()=>{
    if(Date.now()-SG.itT>1500)SG.it=0;
    /* "Partite e filtri" sopra o sotto la TV: la fascia è alta quanto serve (es. modalità divano, testi più grandi) */
    const nat=subNat(a.H);
    if(nat&&Math.abs(nat-(SG.subH||0))>6&&SG.it<4){SG.it++;SG.itT=Date.now();SG.subH=nat;sglLayout();return;}
    const tv=main.querySelector('.card[data-k="tv"]'),st=tv&&tv.querySelector(".tvstage");
    if(tv&&st&&tv.classList.contains("tv-on")){const tp=tv.getBoundingClientRect(),sr=st.getBoundingClientRect();
      if(tp.height&&sr.height){const ch=Math.round(tp.height-sr.height),pw=Math.round(tp.width-sr.width);
        if((Math.abs(ch-SG.chrome)>2||Math.abs(pw-SG.padW)>2)&&SG.it<4){SG.it++;SG.itT=Date.now();SG.chrome=ch;SG.padW=pw;sglLayout();return;}}}
    SL.emit("resize");});
}
function sglEnter(cfg){cfg=sglNorm(cfg);SL.store.set(cfgKey(),cfg);SL.store.set("sglOn",true);SL.store.sset(leadKey(),null);SL.route();}
function sglExit(){SL.store.set("sglOn",false);$("top").hidden=isF();SL.route();}
/* misura dal menu ⋯ in schermo singolo: peso della sezione nella sua zona, o grandezza della TV */
const TVSZ=[0,.46,.6,.8];
SC.sglOn=()=>document.body.classList.contains("sgl");
SC.sglCardCur=k=>{const c=sglCfg();return k==="tv"?(c.tv<.53?1:c.tv<.7?2:3):(c.w[k]||2);};
SC.sglCardSet=(k,v)=>{const c=sglCfg();if(k==="tv")c.tv=TVSZ[v];else{if(v===2)delete c.w[k];else c.w[k]=v;const e=document.querySelector('#main .card[data-k="'+k+'"]');if(e)e.style.setProperty("--fw",v);}
  c.mod=!!c.base;SL.store.set(cfgKey(),c);bar("sgl");SG.it=0;sglLayout();
  toast(k==="tv"?"Diretta TV: misura "+WN[v]+" · la TV resta centrata e la più grande possibile.":(UK[k]?UK[k].n:k)+": misura "+WN[v]+" nella zona "+(ZNAME[Z4.find(z=>c.Z[z].indexOf(k)>=0)]||"").toLowerCase()+".");};

/* ---------- editor dello schermo singolo ---------- */
function previewDims(c){const hd=c.hd!==false,a=sglArea(hd,true),ar=Math.max(1.2,Math.min(2.6,(a.W+20)/innerHeight));return{a,ar,g:sglGeom(a.W,a.H,c,SG.chrome,SG.padW)};}
function gridHTML(c,mini){
  const{g,ar}=previewDims(c),sd=Math.max(.01,g.side),st=Math.max(.01,g.st,g.sb*.5),sbt=Math.max(.01,g.sb,g.st*.5);
  let s='<div class="sgl-grid" style="--ar:'+ar.toFixed(3)+';grid-template-columns:minmax(0,'+sd.toFixed(1)+'fr) minmax(0,'+g.w+'fr) minmax(0,'+sd.toFixed(1)+'fr);grid-template-rows:minmax(0,'+st.toFixed(1)+'fr) minmax(0,'+g.h+'fr) minmax(0,'+sbt.toFixed(1)+'fr)">';
  Z4.forEach(z=>{const L=c.Z[z];
    s+='<div class="sgl-z z'+z+(L.length?'':' empty')+'" data-z="'+z+'"'+(mini?'':' tabindex="0" role="button" aria-label="Zona '+ZNAME[z].toLowerCase()+': '+(L.length?L.map(k=>UK[k].s).join(", "):"vuota")+'"')+'>';
    if(!L.length&&!mini)s+='<span class="sgl-zl">'+ZNAME[z]+'</span>';
    L.forEach(k=>{const w=c.w[k]||2,u=UK[k];
      s+=mini?'<i style="--uc:'+u.c+';flex:'+w+' 1 0"></i>':
      '<div class="sgl-cell'+(SG.armed===k?' armed':'')+((z==="T"||z==="B")&&TALL.indexOf(k)>=0?' cramped':'')+'" draggable="true" data-u="'+k+'" tabindex="0" role="button" aria-pressed="'+(SG.armed===k)+'" aria-label="'+h(u.s)+', zona '+ZNAME[z].toLowerCase()+', misura '+WN[w]+'" style="--uc:'+u.c+';flex:'+w+' 1 0" title="Trascina in un\'altra zona, oppure tocca e poi tocca la zona">'+
      '<span class="sgl-cn"><em>'+u.i+'</em>'+h(u.s)+'</span><span class="sgl-cb"><button type="button" class="sgl-w" data-w="'+k+'" title="Misura nella zona: S, M o L" aria-label="Cambia misura di '+h(u.s)+' (ora '+WN[w]+')">'+WN[w]+'</button><button type="button" class="sgl-x" data-rm="'+k+'" title="Togli" aria-label="Togli '+h(u.s)+'">×</button></span></div>';});
    s+='</div>';});
  return s+'<div class="sgl-tvc">'+(mini?'':'<b>▶ DIRETTA TV</b><small>'+g.vw+' × '+g.vh+' px</small>')+'</div></div>';}
function sglRender(){
  const d=SG.draft;if(!d)return;
  $("sglPresets").innerHTML=presets().map(p=>{const on=d.base===p.id,pc=fromPreset(p,d.hd),pd=previewDims(pc);
    return'<button type="button" class="sgl-pre'+(on?" on":"")+'" role="radio" aria-checked="'+on+'" data-p="'+p.id+'"><span class="sgl-mini" style="--ar:'+pd.ar.toFixed(3)+'">'+gridHTML(pc,true)+'</span><b>'+p.n+(on&&d.mod?'<i>modificato</i>':'')+'</b><small class="sgl-pre-tv">TV '+pd.g.vw+' × '+pd.g.vh+'</small><span>'+p.d+'</span></button>';}).join("");
  const{a,ar,g}=previewDims(d),scr=$("sglScreen"),hd=d.hd!==false;
  scr.style.setProperty("--ar",ar.toFixed(3));scr.style.setProperty("--hdp",(hd?a.hdH/innerHeight:0).toFixed(3));scr.style.setProperty("--sbp",(a.sbH/innerHeight).toFixed(3));
  scr.innerHTML=(hd?'<div class="sgl-hd">BARRA COMANDI · SCHERMO SINGOLO</div>':'<div class="sgl-sb">SCHERMO SINGOLO · '+h(sglName(d).toUpperCase())+'</div>')+gridHTML(d,false);
  setT($("sglName"),sglName(d));
  $("sglTv").value=String(Math.round(d.tv*100));
  const asked=Math.round(d.tv*a.W),capped=g.w<asked-4,tb=d.Z.T.length+d.Z.B.length>0;
  setT($("sglTvOut"),"TV "+g.vw+" × "+g.vh+(capped?" · massimo per questo schermo":""));
  $("sglTvOut").title=capped&&tb?"Per ingrandirla ancora: togli la barra comandi o lascia vuote le zone sopra e sotto.":"";
  $("sglHd").checked=hd;
  const used=Z4.reduce((n,z)=>n.concat(d.Z[z]),[]),free=UNITS.filter(u=>u.k!=="tv"&&used.indexOf(u.k)<0);
  $("sglPal").innerHTML=free.length?free.map(u=>'<button type="button" class="ms-chip'+(SG.armed===u.k?" on":"")+'" draggable="true" data-u="'+u.k+'" style="--uc:'+u.c+'" aria-pressed="'+(SG.armed===u.k)+'"><i>'+u.i+'</i><span>'+h(u.n)+'</span><small>non mostrata</small></button>').join(""):'<p class="note sgl-allin">Tutte le sezioni sono sullo schermo.</p>';
  setT($("sglPalH"),free.length?"SEZIONI NON MOSTRATE · trascinale in una zona":"SEZIONI NON MOSTRATE");
  const tip=capped&&(hd||tb)?" Per una TV ancora più grande: "+(hd?"togli la barra comandi":"")+(hd&&tb?" o ":"")+(tb?"lascia vuote le zone sopra e sotto":"")+".":"";
  const cr=d.Z.T.concat(d.Z.B).filter(k=>TALL.indexOf(k)>=0),warn=cr.length?" ⚠ "+cr.map(k=>UK[k].s).join(", ")+" sopra o sotto la TV "+(cr.length>1?"hanno":"ha")+" poco spazio: rende meglio in una colonna laterale.":"";
  $("sglHint").textContent=SG.armed?"Ora tocca la zona dove mettere "+UK[SG.armed].s+" (o una sezione per metterla prima di quella).":"Trascina le sezioni tra le zone attorno alla TV. S/M/L cambia lo spazio nella zona, × la toglie."+tip+warn;
}
function sglEdited(){SG.draft.mod=!!SG.draft.base;}
function sglMove(k,z,idx){
  const d=SG.draft;
  Z4.forEach(q=>{const i=d.Z[q].indexOf(k);if(i>=0){d.Z[q].splice(i,1);if(q===z&&idx!=null&&idx>i)idx--;}});
  if(z){const L=d.Z[z];L.splice(idx==null||idx<0||idx>L.length?L.length:idx,0,k);}else delete d.w[k];
  sglEdited();SG.armed=null;sglRender();}
function sglArm(k){SG.armed=SG.armed===k?null:k;sglRender();const el=$("dlgScr").querySelector('[data-u="'+k+'"]');if(el)el.focus();}
function insIdx(zone,e){const z=zone.dataset.z,col=z==="L"||z==="R",cells=Array.from(zone.querySelectorAll(".sgl-cell"));
  let i=0;for(const c of cells){const r=c.getBoundingClientRect();if(col?e.clientY>r.top+r.height/2:e.clientX>r.left+r.width/2)i++;}return{i,cells};}

/* =====================================================================
   PIÙ SCHERMI
   ===================================================================== */
const MSC={screens:null,api:false,current:0,count:SL.store.get("msN",2),modeSel:"auto",autoEdited:false,manual:{},sz:{},disp:{},wins:[],pending:[],role:null,sport:null};
let msArmed=null,dragK=null;
function msStatus(kind,txt){const el=$("msDetect");el.className="ms-status "+kind;el.querySelector("span").textContent=txt;}
async function detectScreens(){
  msStatus("wait","Rilevamento schermi… il browser può chiederti il permesso");
  if("getScreenDetails" in window){
    try{const d=await window.getScreenDetails();
      MSC.api=true;MSC.screens=d.screens.map((s,i)=>({i,label:s.label||("Schermo "+(i+1)),x:s.availLeft,y:s.availTop,w:s.availWidth,h:s.availHeight,primary:!!s.isPrimary}));
      MSC.current=Math.max(0,d.screens.indexOf(d.currentScreen));
      msStatus("ok",MSC.screens.length+(MSC.screens.length===1?" schermo rilevato":" schermi rilevati")+" · le finestre si aprono già al loro posto");
      if(d.addEventListener)d.addEventListener("screenschange",()=>toast("Configurazione schermi cambiata: rileva di nuovo."));
    }catch(e){MSC.api=false;msStatus("warn","Permesso negato: indica quanti schermi hai, poi trascina le finestre sul monitor giusto");manualScreens();}
  }else{MSC.api=false;msStatus("warn","Questo browser non vede gli altri schermi (serve Chrome o Edge): indica quanti sono, poi trascina le finestre");manualScreens();}
  renderMs();}
function manualScreens(){const n=MSC.count,sw=window.screen.width||1920,sh=window.screen.height||1080;
  MSC.screens=[];for(let i=0;i<n;i++)MSC.screens.push({i,label:i===0?"Questo schermo":"Schermo "+(i+1),x:i*sw,y:0,w:sw,h:sh,primary:i===0,virtual:true});MSC.current=0;}
/* proposta automatica: la sezione principale sullo schermo più grande, la TV su un altro, il resto distribuito; i filtri restano alla finestra principale */
function autoPlan(){
  const S=MSC.screens,n=S.length,plan=S.map(()=>[]);if(!n)return plan;
  if(n===1){plan[0]=null;return plan;}
  const area=s=>s.w*s.h,portrait=s=>s.h>s.w*1.05,load=new Array(n).fill(0);
  const largest=S.map((s,i)=>i).sort((a,b)=>area(S[b])-area(S[a]))[0];
  const order=UNITS.filter(u=>u.k!=="sub").sort((a,b)=>rank(a.k)-rank(b.k)).map(u=>u.k);
  let heroAt=-1;
  for(const k of order){const u=UK[k];let best=-1,bs=-1e9;
    for(let i=0;i<n;i++){let sc=-load[i]*10;const s=S[i];
      if(u.hero&&i===largest)sc+=12;
      if(k==="tv"&&i!==heroAt)sc+=9;
      if(TALL.indexOf(k)>=0&&portrait(s))sc+=8;
      sc+=area(s)/1e6*0.5;
      if(sc>bs){bs=sc;best=i;}}
    plan[best].push(k);load[best]+=u.w;if(u.hero)heroAt=best;}
  plan[MSC.current].push("sub");
  return plan;}
function currentPlan(){
  if(MSC.modeSel==="auto"&&!MSC.autoEdited)return autoPlan();
  const plan=MSC.screens.map(()=>[]);
  UNITS.forEach(u=>{const v=MSC.manual[u.k];if(v!=null&&v>=0&&v<plan.length)plan[v].push(u.k);});
  return plan;}
function appBase(){return location.href.split("#")[0].split("?")[0];}
function openOne(p){
  const s=MSC.screens[p.i],url=appBase()+"?solo="+p.units.join(",")+"&sz="+p.units.map(k=>k+":"+szOf(k,MSC.sz)).join(",")+"&follow=1"+location.hash;
  const feat=MSC.api&&!s.virtual?"popup=yes,left="+s.x+",top="+s.y+",width="+s.w+",height="+s.h:"popup=yes,width=1280,height=800";
  let w=null;try{w=window.open(url,"sl_screen_"+p.i,feat);}catch(e){w=null;}
  if(!w)return false;
  try{if(MSC.api&&!s.virtual){w.moveTo(s.x,s.y);w.resizeTo(s.w,s.h);}}catch(e){}
  MSC.wins.push(w);return true;}
function launch(){
  if(SL.inFrame){toast("Dentro un riquadro non si possono aprire altre finestre: apri il sito direttamente.");return;}
  const plan=currentPlan();
  if(!plan.some((p,i)=>i!==MSC.current&&p&&p.length)&&!(plan[MSC.current]&&plan[MSC.current].length)){toast("Assegna almeno una sezione a uno schermo.");return;}
  MSC.wins.forEach(w=>{try{w&&!w.closed&&w.close();}catch(e){}});MSC.wins=[];MSC.pending=[];
  MSC.role="lead";
  const todo=plan.map((u,i)=>({i,units:u||[]})).filter(p=>p.i!==MSC.current&&p.units.length);
  const tvScreen=plan.findIndex(p=>p&&p.indexOf("tv")>=0);
  for(const p of todo){if(!openOne(p))MSC.pending.push(p);}
  const mine=plan[MSC.current];
  SL.store.set("sglOn",false);
  SL.store.sset(leadKey(),mine&&mine.length?{list:mine,sz:Object.assign({},MSC.sz)}:null);
  SL.route();
  /* Diretta TV su un altro schermo, senza estensione: la finestra del servizio si apre su quello schermo */
  if(tvScreen>=0&&tvScreen!==MSC.current&&!SL.ext()&&UI.tvOpenAt){const sc=MSC.screens[tvScreen];
    UI.tvOpenAt(MSC.api&&!sc.virtual?{x:sc.x+Math.round(sc.w*.05),y:sc.y+Math.round(sc.h*.08),w:Math.round(sc.w*.6),h:Math.round(sc.h*.6)}:null);}
  renderMs();
  if(MSC.pending.length)toast("Il browser ha bloccato alcune finestre: aprile una alla volta dai pulsanti qui sotto, oppure consenti i popup per questo sito.");
  else{$("dlgMs").close();toast(todo.length?"Aperte "+todo.length+" finestre. In ognuna puoi premere SCHERMO INTERO.":"Disposizione applicata a questo schermo.");}
}
const gridSpec=list=>{const g=layoutGrid(list,MSC.sz),un=t=>t.replace(/minmax\(0,([^)]+)\)/g,"$1");return{body:g.body,tiles:g.tiles,cols:un(g.cols),areas:g.rows.map(r=>"'"+r+"'").join(" "),trs:g.trs.map(t=>t==="auto"?"0.55fr":un(t)).join(" ")};};
function msResize(k,d){
  const cur=szOf(k,MSC.sz),nv=clamp(cur+d,1,4);if(nv===cur)return;
  msEdit();MSC.sz[k]=nv;
  const plan=currentPlan(),i=plan.findIndex(p=>p&&p.indexOf(k)>=0);
  if(nv===4){if(i>=0){const others=plan[i].filter(x=>x!==k);MSC.disp[k]={i,units:others};others.forEach(x=>{MSC.manual[x]=-1;});
      if(others.length)toast(UK[k].n+" a schermo intero: "+others.map(x=>UK[x].s).join(", ")+" messe da parte. Con − tornano al loro posto.");}}
  else if(cur===4){const dd=MSC.disp[k];delete MSC.disp[k];
    if(dd&&i===dd.i){const back=dd.units.filter(x=>MSC.manual[x]===-1);back.forEach(x=>{MSC.manual[x]=dd.i;});if(back.length)toast(back.map(x=>UK[x].s).join(", ")+" di nuovo sullo schermo.");}}
  renderMs();}
function planToManual(p){MSC.manual={};UNITS.forEach(u=>{MSC.manual[u.k]=-1;});(p||[]).forEach((us,i)=>{if(us===null)UNITS.forEach(u=>{MSC.manual[u.k]=i;});else(us||[]).forEach(k=>{MSC.manual[k]=i;});});}
function msEdit(){if(MSC.modeSel==="auto"&&!MSC.autoEdited){planToManual(autoPlan());MSC.autoEdited=true;}}
function msAssign(k,i){msEdit();const pl=currentPlan();(pl[i]||[]).forEach(x=>{if(szOf(x,MSC.sz)===4&&x!==k){MSC.sz[x]=3;delete MSC.disp[x];}});if(szOf(k,MSC.sz)===4&&(pl[i]||[]).length)MSC.sz[k]=3;MSC.manual[k]=i;msArmed=null;renderMs();}
function msRemove(k){msEdit();delete MSC.disp[k];MSC.manual[k]=-1;if(msArmed===k)msArmed=null;renderMs();}
function cellHTML(k,area){const u=UK[k],armed=msArmed===k,s=szOf(k,MSC.sz);
  return'<div class="ms-cell'+(armed?" armed":"")+(s===4?" full":"")+'" draggable="true" data-u="'+k+'" tabindex="0" role="button" aria-pressed="'+armed+'" title="Trascina su un altro schermo, oppure tocca e poi tocca lo schermo" style="grid-area:'+area+';--uc:'+u.c+'"><span>'+u.i+' '+h(u.s)+'</span><button type="button" class="ms-x" data-rm="'+k+'" aria-label="Togli '+h(u.n)+'">×</button><span class="ms-sz"><button type="button" data-sz="-1" data-k="'+k+'" aria-label="Rimpicciolisci '+h(u.n)+'"'+(s<=1?" disabled":"")+'>−</button><b title="Misura">'+SZNAME[s]+'</b><button type="button" data-sz="1" data-k="'+k+'" aria-label="Ingrandisci '+h(u.n)+'"'+(s>=4?" disabled":"")+'>+</button></span></div>';}
function renderMs(){
  const S=MSC.screens,manual=MSC.modeSel==="manual";
  $("msBody").hidden=!S;$("msFootMain").hidden=!S;
  $$("#msModeSeg button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.m===MSC.modeSel)));
  $("msCount").hidden=!S||MSC.api;$("msNv").textContent=String(MSC.count);
  $("msReset").hidden=!(MSC.modeSel==="auto"&&MSC.autoEdited);
  if(!S)return;
  const plan=currentPlan(),stage=$("msStage");stage.textContent="";
  const order=S.map((s,i)=>i).sort((a,b)=>S[a].x-S[b].x||S[a].y-S[b].y);
  for(const i of order){
    const s=S[i],cur=i===MSC.current,list=plan[i],card=document.createElement("div");
    card.className="ms-scr drop"+(cur?" cur":"")+(msArmed?" armed":"");card.dataset.i=i;card.style.aspectRatio=(s.w/s.h).toFixed(3);
    const tag=cur?'<em class="ms-tag cur">QUESTA FINESTRA · COMANDI</em>':(list&&list.length?'<em class="ms-tag">NUOVA FINESTRA</em>':'<em class="ms-tag off">NON USATO</em>');
    let inner;
    if(list===null)inner='<div class="ms-empty">Pagina intera · trascina qui una sezione per dividerla</div>';
    else if(!list.length)inner='<div class="ms-empty">'+(msArmed?"Tocca per mettere qui "+h(UK[msArmed].s):"Trascina qui una sezione")+'</div>';
    else{const g=gridSpec(list);let cells=g.body.map((k,j)=>cellHTML(k,"u"+j)).join("");if(g.tiles)cells+=cellHTML("sub","tl");
      inner='<div class="ms-grid" style="grid-template-columns:'+g.cols+';grid-template-rows:'+g.trs+';grid-template-areas:'+g.areas+'">'+cells+'</div>';}
    card.innerHTML='<div class="ms-scr-h"><b>'+(order.indexOf(i)+1)+'</b><span>'+h(s.virtual?(cur?"Questo schermo":"Schermo "+(order.indexOf(i)+1)):s.label)+'</span><small>'+s.w+'×'+s.h+'</small></div>'+inner+tag;
    stage.appendChild(card);}
  const where=k=>{for(let i=0;i<plan.length;i++){const p=plan[i];if(p===null||(p&&p.indexOf(k)>=0))return i;}return-1;};
  const shown=manual?UNITS:UNITS.filter(u=>where(u.k)<0),pal=$("msPal");
  pal.hidden=!shown.length;$("msPalH").hidden=!shown.length;
  setT($("msPalH"),manual?"SEZIONI · trascinale sugli schermi":"SEZIONI TOLTE · trascinale su uno schermo per rimetterle");
  pal.innerHTML=shown.map(u=>{const w=where(u.k),txt=w<0?"nascosta":"schermo "+(order.indexOf(w)+1);
    return'<button type="button" class="ms-chip'+(msArmed===u.k?" on":"")+(w<0?" off":"")+'" draggable="true" data-u="'+u.k+'" style="--uc:'+u.c+'" aria-pressed="'+(msArmed===u.k)+'"><i>'+u.i+'</i><span>'+h(u.n)+'</span><small>'+txt+'</small></button>';}).join("");
  const others=plan.reduce((n,p,i)=>n+(i!==MSC.current&&p&&p.length?1:0),0),mine=plan[MSC.current];
  $("msHint").textContent=msArmed?"Ora tocca lo schermo dove vuoi spostare "+UK[msArmed].n+".":
    manual?"Trascina le sezioni sugli schermi, oppure toccane una e poi tocca lo schermo. La × toglie una sezione.":
    MSC.autoEdited?"Proposta automatica modificata da te. Trascina le sezioni tra gli schermi o toglile con la ×.":
    "Proposta automatica: puoi trascinare le sezioni da uno schermo all'altro o toglierle con la ×.";
  const go=$("msGo");go.textContent=others?"APRI "+others+(others>1?" FINESTRE":" FINESTRA"):(mine&&mine.length?"APPLICA A QUESTO SCHERMO":"NIENTE DA APRIRE");go.disabled=!others&&!(mine&&mine.length);
  const st=$("msWins");st.innerHTML="";
  MSC.pending.forEach(p=>{const b=document.createElement("button");b.type="button";b.className="btn warn";b.textContent="⚠ Apri schermo "+(order.indexOf(p.i)+1);b.addEventListener("click",()=>{if(openOne(p))MSC.pending.splice(MSC.pending.indexOf(p),1);renderMs();});st.appendChild(b);});
  const open=MSC.wins.filter(w=>w&&!w.closed).length,lp=!!leadPlan();$("msClose").hidden=!open&&!lp;$("msClose").textContent=open?"CHIUDI "+open+(open>1?" FINESTRE":" FINESTRA"):"RIPRISTINA LAYOUT";
}
function msOpenMulti(){
  units();
  if(MSC.sport!==UI.sport){MSC.sport=UI.sport;MSC.autoEdited=false;MSC.manual={};MSC.sz={};MSC.disp={};MSC.modeSel="auto";}
  $("msNote").hidden=!SL.inFrame;$("dlgScr").close();if(!$("dlgMs").open)$("dlgMs").showModal();
  if(!MSC.screens)detectScreens();else renderMs();}

/* =====================================================================
   Finestra "Schermi": scelta tra schermo singolo e più schermi
   ===================================================================== */
function scrOpen(step){
  if(isF()){toast("Questa è una finestra secondaria: gestisci gli schermi dalla finestra principale.");return;}
  units();
  const none=!UNITS.length,on=SC.sglOn();
  $("scrOn").hidden=!on;if(on)setT($("scrOn"),"✓ Schermo singolo attivo · "+sglName(sglCfg()));
  $("scrNone").hidden=!none;
  const narrow=innerWidth<900;$("scrOptSingle").disabled=narrow||none;$("scrOptMulti").disabled=none;$("scrNarrow").hidden=!narrow||none;
  setT($("scrSingleTag"),on?"ATTIVO · MODIFICA":"UN SOLO MONITOR");
  if(!none){SG.draft=sglClone(sglCfg());SG.armed=null;}
  if(!$("dlgScr").open)$("dlgScr").showModal();
  scrStep(step==="single"&&!narrow&&!none?"single":"choose");}
function scrStep(s){
  $("scrChoose").hidden=s!=="choose";$("scrSingle").hidden=s!=="single";
  setT($("scrH"),s==="single"?"Schermo singolo":"Schermi");
  setT($("scrSub"),s==="single"?"La diretta TV resta al centro e la più grande possibile: scegli un preset o sposta tu le sezioni attorno.":"Come vuoi usare "+(SL.sports[UI.sport]&&UI.sport!=="home"?SL.sports[UI.sport].name:"l'app")+"?");
  if(s==="single"){sglRender();$("sglOff").hidden=!SC.sglOn();setT($("sglGo"),SC.sglOn()?"APPLICA LE MODIFICHE":"APPLICA A QUESTO SCHERMO");
    const f=$("sglPresets").querySelector('[aria-checked="true"]')||$("sglPresets").querySelector("button");if(f)f.focus();}
  else{const f=!$("scrOptSingle").disabled?$("scrOptSingle"):!$("scrOptMulti").disabled?$("scrOptMulti"):null;if(f)f.focus();}}
SC.open=scrOpen;

/* =====================================================================
   Sincronizzazione tra finestre (oltre alla pagina scelta, già in core.js)
   ===================================================================== */
let leaderSeen=Date.now();
function chanPost(m){try{SL.chan&&SL.chan.postMessage(m);}catch(e){}}
if(SL.chan)SL.chan.addEventListener("message",ev=>{const m=ev.data||{};
  if(isF()){
    if(m.type==="hb"||m.type==="nav"){leaderSeen=Date.now();const t=$("soloTxt"),sb=$("soloBar");if(t&&t.classList.contains("k1r")&&sb.dataset.base){setT(t,sb.dataset.base);t.classList.remove("k1r");}}
    if(m.type==="bye"){setT($("soloTxt"),"Finestra principale chiusa: questa finestra non è più sincronizzata");$("soloTxt").classList.add("k1r");}
  }else{
    /* una finestra secondaria ha scelto un'altra partita: la seguo e la passo a tutte */
    if(m.type==="navreq"&&m.hash&&m.hash!==location.hash){location.hash=m.hash;}
  }});
/* le finestre secondarie chiedono alla principale di cambiare partita */
{const orig=SL.syncOut;SL.syncOut=function(){if(isF()){chanPost({type:"navreq",hash:location.hash});return;}orig();};}

/* =====================================================================
   Avvio
   ===================================================================== */
SC.boot=function(){
  /* finestra principale: battito ogni 2 s, e "ciao" quando si chiude */
  if(!isF()){setInterval(()=>chanPost({type:"hb"}),2000);
    window.addEventListener("beforeunload",()=>{if(MSC.wins.some(w=>w&&!w.closed))chanPost({type:"bye"});});}
  else{$("top").hidden=true;
    setInterval(()=>{if(Date.now()-leaderSeen>6000){const t=$("soloTxt");if(t&&!t.classList.contains("k1r")){setT(t,"In attesa della finestra principale…");t.classList.add("k1r");}}},2000);}
  /* pulsanti */
  $("btnScreens").addEventListener("click",()=>scrOpen("choose"));
  $("soloLay").addEventListener("click",()=>scrOpen("single"));
  $("soloHome").addEventListener("click",()=>{SC.homeOn=!SC.homeOn;SL.route();});
  $("soloFs").addEventListener("click",()=>{try{const p=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();if(p&&p.catch)p.catch(()=>toast("Schermo intero non consentito: premi F11."));}catch(e){toast("Premi F11 per lo schermo intero.");}});
  $("soloExit").addEventListener("click",()=>{
    if(barKind==="sgl"){sglExit();toast("Schermo singolo disattivato: layout completo ripristinato.");return;}
    SL.store.sset(leadKey(),null);SL.route();toast("Layout completo ripristinato in questa finestra.");});
  $("soloHd").addEventListener("click",()=>{if(!SC.sglOn())return;const c=sglCfg();c.hd=c.hd===false;SL.store.set(cfgKey(),c);document.body.classList.toggle("sgl-nohd",!c.hd);bar("sgl");SG.it=0;sglLayout();
    toast(c.hd?"Barra comandi visibile.":"Barra comandi nascosta: più spazio per la TV. Ripremi ☰ COMANDI per riaverla.");});
  /* scelta */
  $("scrOptSingle").addEventListener("click",()=>scrStep("single"));
  $("scrOptMulti").addEventListener("click",msOpenMulti);
  $("msBack").addEventListener("click",()=>{$("dlgMs").close();scrOpen("choose");});
  $("sglBack").addEventListener("click",()=>scrStep("choose"));
  /* editor schermo singolo */
  $("sglPresets").addEventListener("click",e=>{const b=e.target.closest(".sgl-pre");if(!b)return;const p=presets().find(x=>x.id===b.dataset.p);if(!p)return;
    SG.draft=fromPreset(p,SG.draft.hd);SG.armed=null;sglRender();const f=$("sglPresets").querySelector('[data-p="'+p.id+'"]');if(f)f.focus();});
  $("sglPresets").addEventListener("keydown",e=>{if(e.key!=="ArrowRight"&&e.key!=="ArrowLeft")return;const it=Array.from($("sglPresets").querySelectorAll(".sgl-pre")),i=it.indexOf(document.activeElement);if(i<0)return;e.preventDefault();it[(i+(e.key==="ArrowRight"?1:-1)+it.length)%it.length].click();});
  const scr=$("sglScreen");
  scr.addEventListener("click",e=>{
    const wb=e.target.closest(".sgl-w");if(wb){e.stopPropagation();const k=wb.dataset.w,d=SG.draft,v=((d.w[k]||2)%3)+1;if(v===2)delete d.w[k];else d.w[k]=v;sglEdited();sglRender();const f=scr.querySelector('.sgl-w[data-w="'+k+'"]');if(f)f.focus();return;}
    const x=e.target.closest(".sgl-x");if(x){e.stopPropagation();sglMove(x.dataset.rm,null);return;}
    const cell=e.target.closest(".sgl-cell"),zone=e.target.closest(".sgl-z");
    if(SG.armed&&zone){if(cell&&cell.dataset.u===SG.armed){sglArm(SG.armed);return;}const z=zone.dataset.z,idx=cell?SG.draft.Z[z].indexOf(cell.dataset.u):null;sglMove(SG.armed,z,idx);return;}
    if(cell)sglArm(cell.dataset.u);});
  scr.addEventListener("keydown",e=>{if(e.target.closest(".sgl-cb"))return;const cell=e.target.closest(".sgl-cell"),zone=e.target.closest(".sgl-z");
    if(e.key==="Enter"||e.key===" "){
      if(cell&&!SG.armed){e.preventDefault();sglArm(cell.dataset.u);}
      else if(zone&&SG.armed){e.preventDefault();if(cell&&cell.dataset.u===SG.armed){sglArm(SG.armed);return;}const z=zone.dataset.z,idx=cell?SG.draft.Z[z].indexOf(cell.dataset.u):null;sglMove(SG.armed,z,idx);const f=scr.querySelector('.sgl-z[data-z="'+z+'"]');if(f)f.focus();}}
    else if((e.key==="Delete"||e.key==="Backspace")&&cell){e.preventDefault();sglMove(cell.dataset.u,null);}});
  $("sglPal").addEventListener("click",e=>{const b=e.target.closest(".ms-chip");if(b)sglArm(b.dataset.u);});
  scr.addEventListener("dragover",e=>{const z=e.target.closest(".sgl-z");if(!z||!SG.drag)return;e.preventDefault();
    $$("#sglScreen .sgl-z.over").forEach(o=>o!==z&&o.classList.remove("over"));z.classList.add("over");
    const{i,cells}=insIdx(z,e);cells.forEach((c,j)=>c.classList.toggle("ins",j===i));z.classList.toggle("ins-end",i>=cells.length&&cells.length>0);});
  scr.addEventListener("dragleave",e=>{const z=e.target.closest(".sgl-z");if(z&&!z.contains(e.relatedTarget)){z.classList.remove("over","ins-end");z.querySelectorAll(".ins").forEach(c=>c.classList.remove("ins"));}});
  scr.addEventListener("drop",e=>{const z=e.target.closest(".sgl-z");if(!z)return;e.preventDefault();const k=SG.drag||e.dataTransfer.getData("text/plain");if(!UK[k]||k==="tv")return;
    const{i}=insIdx(z,e);SG.drag=null;$("dlgScr").classList.remove("is-drag");sglMove(k,z.dataset.z,i);});
  [$("sglPal"),$("sglTrash")].forEach(t=>{
    t.addEventListener("dragover",e=>{if(SG.drag){e.preventDefault();$("sglTrash").classList.add("over");}});
    t.addEventListener("dragleave",e=>{if(!t.contains(e.relatedTarget))$("sglTrash").classList.remove("over");});
    t.addEventListener("drop",e=>{e.preventDefault();const k=SG.drag||e.dataTransfer.getData("text/plain");SG.drag=null;$("dlgScr").classList.remove("is-drag");$("sglTrash").classList.remove("over");if(UK[k])sglMove(k,null);});});
  $("sglTv").addEventListener("input",()=>{SG.draft.tv=clamp(+$("sglTv").value/100,.4,.8);sglEdited();sglRender();});
  $("sglHd").addEventListener("change",()=>{SG.draft.hd=$("sglHd").checked;sglRender();});
  $("sglGo").addEventListener("click",()=>{const d=sglClone(SG.draft),n=Z4.reduce((s,z)=>s+d.Z[z].length,0),was=SC.sglOn();
    $("dlgScr").close();sglEnter(d);
    setTimeout(()=>{const st=document.querySelector('#main .card[data-k="tv"]');const r=st?st.getBoundingClientRect():{width:0,height:0};
      toast((was?"Disposizione aggiornata":"Schermo singolo attivo")+": "+sglName(d)+" · TV "+Math.round(r.width)+"×"+Math.round(r.height)+(n?"":" · nessuna sezione attorno")+". ▦ DISPOSIZIONE per cambiarla.");},350);});
  $("sglOff").addEventListener("click",()=>{$("dlgScr").close();sglExit();toast("Schermo singolo disattivato: layout completo ripristinato.");});
  /* più schermi */
  $("msDetectBtn").addEventListener("click",()=>{MSC.autoEdited=false;detectScreens();});
  const msSetN=n=>{MSC.count=clamp(n,2,6);SL.store.set("msN",MSC.count);manualScreens();Object.keys(MSC.manual).forEach(k=>{if(MSC.manual[k]>=MSC.count)MSC.manual[k]=-1;});renderMs();};
  $("msMinus").addEventListener("click",()=>msSetN(MSC.count-1));$("msPlus").addEventListener("click",()=>msSetN(MSC.count+1));
  $("msModeSeg").addEventListener("click",e=>{const b=e.target.closest("button");if(!b||b.dataset.m===MSC.modeSel)return;
    if(b.dataset.m==="manual"&&!MSC.autoEdited)planToManual(autoPlan());MSC.modeSel=b.dataset.m;msArmed=null;renderMs();});
  $("msReset").addEventListener("click",()=>{MSC.autoEdited=false;MSC.sz={};MSC.disp={};msArmed=null;renderMs();toast("Proposta automatica ripristinata.");});
  const armToggle=k=>{msArmed=msArmed===k?null:k;renderMs();};
  $("msPal").addEventListener("click",e=>{const b=e.target.closest(".ms-chip");if(b)armToggle(b.dataset.u);});
  const stg=$("msStage");
  stg.addEventListener("click",e=>{
    const x=e.target.closest(".ms-x");if(x){e.stopPropagation();msRemove(x.dataset.rm);return;}
    const zb=e.target.closest(".ms-sz button");if(zb){e.stopPropagation();msResize(zb.dataset.k,+zb.dataset.sz);return;}
    const cell=e.target.closest(".ms-cell[data-u]"),card=e.target.closest(".ms-scr");
    if(msArmed&&card){const from=cell&&cell.dataset.u;if(from===msArmed){armToggle(from);return;}msAssign(msArmed,+card.dataset.i);return;}
    if(cell)armToggle(cell.dataset.u);});
  stg.addEventListener("keydown",e=>{const cell=e.target.closest(".ms-cell[data-u]");if(!cell)return;if(e.key==="Enter"||e.key===" "){e.preventDefault();armToggle(cell.dataset.u);}else if(e.key==="Delete"||e.key==="Backspace"){e.preventDefault();msRemove(cell.dataset.u);}});
  stg.addEventListener("dragover",e=>{const c=e.target.closest(".ms-scr");if(c&&dragK){e.preventDefault();$$(".ms-scr.over").forEach(o=>o!==c&&o.classList.remove("over"));c.classList.add("over");}});
  stg.addEventListener("dragleave",e=>{const c=e.target.closest(".ms-scr");if(c&&!c.contains(e.relatedTarget))c.classList.remove("over");});
  stg.addEventListener("drop",e=>{const c=e.target.closest(".ms-scr");if(!c)return;e.preventDefault();const k=dragK||e.dataTransfer.getData("text/plain");if(UK[k])msAssign(k,+c.dataset.i);});
  const trash=$("msTrash");
  trash.addEventListener("dragover",e=>{if(dragK){e.preventDefault();trash.classList.add("over");}});
  trash.addEventListener("dragleave",()=>trash.classList.remove("over"));
  trash.addEventListener("drop",e=>{e.preventDefault();const k=dragK||e.dataTransfer.getData("text/plain");if(UK[k])msRemove(k);});
  $("msGo").addEventListener("click",launch);
  $("msClose").addEventListener("click",()=>{MSC.wins.forEach(w=>{try{w&&!w.closed&&w.close();}catch(e){}});MSC.wins=[];MSC.pending=[];chanPost({type:"closeall"});
    SL.store.sset(leadKey(),null);SL.route();renderMs();toast("Finestre chiuse, layout completo ripristinato.");});
  /* trascinamento (schede, celle, preset) */
  document.addEventListener("dragstart",e=>{
    const el=e.target.closest&&e.target.closest("#dlgMs [draggable][data-u]");
    if(el){dragK=el.dataset.u;try{e.dataTransfer.setData("text/plain",dragK);e.dataTransfer.effectAllowed="move";}catch(x){}el.classList.add("dragging");$("dlgMs").classList.add("is-drag");return;}
    const sg=e.target.closest&&e.target.closest("#dlgScr [draggable][data-u]");
    if(sg){SG.drag=sg.dataset.u;try{e.dataTransfer.setData("text/plain",SG.drag);e.dataTransfer.effectAllowed="move";}catch(x){}sg.classList.add("dragging");$("dlgScr").classList.add("is-drag");}});
  document.addEventListener("dragend",()=>{dragK=null;SG.drag=null;$$(".ms-scr.over,.dragging,#dlgScr .over,#dlgScr .ins").forEach(o=>o.classList.remove("over","dragging","ins","ins-end"));$("dlgMs").classList.remove("is-drag");$("dlgScr").classList.remove("is-drag");$("msTrash").classList.remove("over");});
  /* misure che cambiano */
  addEventListener("resize",()=>{if(SC.sglOn()){SG.it=0;requestAnimationFrame(sglLayout);}else if(document.body.classList.contains("solo")){const m=$("main");if(m)fitHeight(m);}
    if($("dlgScr").open&&!$("scrSingle").hidden)sglRender();});
};
})();
