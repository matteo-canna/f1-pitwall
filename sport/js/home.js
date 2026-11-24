/* Sport LIVE APP — Home "Adesso in diretta" + raccoglitore in background (contatori live, avvisi)
   Pagina: riquadri grandi per entrare in ogni sport (con dirette, prossimo evento e una notizia),
   poi una colonna per giorno (ieri, oggi, domani, dopodomani) con gli eventi in verticale, divisi per orario. */
(function(){
"use strict";
const h=SL.h;
const SPORTS=["calcio","basket","tennis","rugby","moto","golf"];
const LIVE=SL.live={items:new Map(),bySport:{},tomorrow:{},updated:0,lastLive:{},loaded:{},failed:{}};

/* ---------- raccoglitore: ogni sport fornisce homeFeed(giorno, ttl) ----------
   Ogni sport ha un tempo massimo: una fonte lenta o ferma non blocca gli altri sport. */
const LIMIT=25000;
const within=(p,ms)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(new Error("tempo scaduto")),ms))]);
async function collect(day){
  const res={};
  await Promise.all(SPORTS.map(async s=>{const m=SL.sports[s];if(!m||!m.homeFeed)return;
    const ttl=day===0?(LIVE.lastLive[s]?15000:240000):1800000;
    try{res[s]=await within(m.homeFeed(day,ttl),LIMIT)||[];}catch(e){console.warn("home",s,e);res[s]=[];}}));
  return res;
}
function applySport(s,list){LIVE.bySport[s]=list;const n=list.filter(x=>x.live).length;LIVE.lastLive[s]=n>0||list.some(x=>x.state==="pre"&&new Date(x.date)-Date.now()<20*60000);SL.setLive(s,n);
  const m=SL.sports[s];
  list.forEach(it=>{const prev=LIVE.items.get(it.id);LIVE.items.set(it.id,it);
    if(prev&&prev.sig!==it.sig&&m.onChange){const a=m.onChange(prev,it);if(a){a.important=a.important!=null?a.important:it.important;a.go=a.go||it.go;a.sport=s;SL.alert(a);SL.emit("flash",it.id);}}});}
/* oggi: ogni sport compare appena arriva, senza aspettare gli altri */
async function tickToday(){
  await Promise.all(SPORTS.map(async s=>{const m=SL.sports[s];if(!m||!m.homeFeed){LIVE.loaded[s]=true;return;}
    const ttl=LIVE.lastLive[s]?15000:240000;
    try{const list=await within(m.homeFeed(0,ttl),LIMIT)||[];LIVE.failed[s]=false;applySport(s,list);}
    catch(e){console.warn("home",s,e);LIVE.failed[s]=true;if(!LIVE.bySport[s])LIVE.bySport[s]=[];}
    LIVE.loaded[s]=true;LIVE.updated=Date.now();
    SL.setLive("home",[...LIVE.items.values()].filter(x=>x.live).length);
    SL.emit("live");SL.ui.refreshLiveChips();}));
}
SL.sports.home={
  name:"Live ora",tab:"Live ora",icon:"●",color:"#e5383b",
  /* se una fonte non ha risposto riprovo presto (20 s), altrimenti al ritmo normale */
  background(){SL.espn.loadItaClubs();SL.every(tickToday,()=>Object.values(LIVE.lastLive).some(Boolean)||Object.values(LIVE.failed).some(Boolean)?20000:90000,{global:true});},
  mount
};

/* ---------- Italia e preferiti, separati ----------
   Italia: Nazionale, Serie A e Coppa Italia, club italiani nelle coppe, tennisti, piloti e golfisti italiani.
   Preferiti: squadre e atleti segnati con ★ su questo dispositivo. */
SL.homeIta=x=>!!((x.ev&&(x.ev.ita||(x.sport==="calcio"&&/^ita\./.test(x.ev.league||""))))||(x.m&&x.m.ita)||(x.lines||[]).some(l=>l.ita));
SL.homeFav=x=>!!((x.ev&&x.ev.fav)||(x.m&&x.m.fav)||(x.T&&x.T.P&&x.T.P.some(p=>p.fav))||(x.lines||[]).some(l=>l.n&&SL.fav.hasName(x.sport,String(l.n).replace(/^\(\d+\)\s*/,""))));

/* ---------- casella di un evento: stessa struttura, ma ogni sport ha colore, forma, trama e impaginazione sue ---------- */
const COL={calcio:"#2fbf71",basket:"#f5803e",tennis:"#c9dc3c",rugby:"#3fa7d6",moto:"#e5383b",golf:"#d8b45a"};
const stTxt=it=>it.live?(it.status||"LIVE"):it.done?(it.status||"FINALE"):it.allDay?(it.status||"in giornata"):it.tbd?"da definire":SL.fmtTime(it.date);
/* informazioni in più per la casella grande (scheda Oggi) */
const FORM={W:"V",D:"N",L:"P"};
const formHtml=f=>String(f||"").replace(/[^WDLVNP]/gi,"").slice(-5).split("").map(c=>{const x=FORM[c.toUpperCase()]||c.toUpperCase();return'<i class="fm f'+x+'">'+x+'</i>';}).join("");
function sideOf(it,l){const ev=it.ev;if(!ev||!ev.home)return null;return ev.home.name===l.n?ev.home:ev.away.name===l.n?ev.away:null;}
function liveProg(it){const ev=it.ev||{},s=String(it.status||"");
  if(it.sport==="calcio"){const m=s.match(/(\d+)'/);if(m)return Math.min(1,(+m[1])/90);if(/interv/i.test(s))return .5;}
  if(it.sport==="rugby"){const m=s.match(/(\d+)'/);if(m)return Math.min(1,(+m[1])/80);}
  if(it.sport==="basket"&&ev.period)return Math.min(1,(ev.period-.5)/4);
  return null;}
function moreInfo(it){const out=[],ev=it.ev,now=Date.now();
  if(it.state==="pre"&&!it.allDay&&!it.tbd){const ms=new Date(it.date)-now;if(ms>0){const m=Math.round(ms/60000),hh=Math.floor(m/60),dd=Math.floor(hh/24);
    out.push('<span class="hi cd">'+SL.ico("clock")+'tra <b>'+(dd?dd+" g "+(hh%24)+" h":hh?hh+" h "+(m%60)+" min":Math.max(1,m)+" min")+'</b></span>');}}
  if(it.live){const p=liveProg(it);if(p!=null)out.push('<span class="hi prog" title="Tempo di gioco"><i style="width:'+Math.round(p*100)+'%"></i></span>');}
  if(ev&&ev.last&&(it.live||it.done))out.push('<span class="hi">'+SL.ico(it.sport==="calcio"?"goal":it.sport)+(it.sport==="calcio"?"Ultimo gol: ":"Ultimi punti: ")+'<b>'+h(ev.last.trim())+'</b></span>');
  if(ev&&ev.note)out.push('<span class="hi">'+h(ev.note)+'</span>');
  if(it.m){if(it.m.round)out.push('<span class="hi">'+h(it.m.round)+'</span>');if(it.m.court)out.push('<span class="hi">'+SL.ico("target")+h(it.m.court)+'</span>');}
  if(it.f1&&it.f1.top&&it.f1.top.length)out.push('<span class="hi">'+SL.ico("flag")+h(it.f1.ses)+' · '+h(it.f1.gp)+'</span>');
  if(it.T&&it.T.rnd)out.push('<span class="hi">'+SL.ico("golf")+h(it.T.rnd)+'° giro · '+h(it.T.P.filter(p=>!p.out).length)+' in gara</span>');
  return out.length?'<span class="ht-info">'+out.join("")+'</span>':"";}
SL.homeTile=function(it,opt){
  const big=!!(opt&&opt.big),sp=it.sport;let L=it.lines||[];
  /* golf: nella casella grande i primi 3 (più il miglior italiano) con il punteggio di oggi */
  if(big&&it.T&&it.T.P&&it.T.P.length){const T=it.T,top=T.P.filter(p=>!p.out).slice(0,3),ib=T.ita.filter(p=>!p.out)[0];
    const fp=n=>n==null?"–":n===0?"E":(n>0?"+":"")+n;
    L=top.concat(ib&&top.indexOf(ib)<0?[ib]:[]).map(p=>({pos:p.pos,n:p.name,img:p.flag,ita:p.ita,v:fp(p.score)+(T.live&&p.thru&&p.thru!=="F"?" ("+p.thru+")":""),sub:T.live&&p.today!=null?"oggi "+fp(p.today):""}));}
  const teamOf=l=>it.f1&&it.f1.top?((it.f1.top.find(r=>r.name===l.n)||{}).team||""):"";
  const kind=sp==="tennis"?"tn":L.some(l=>l.pos!=null)?"lb":"tm";
  const subOf=l=>{if(!big)return"";if(l.sub)return l.sub;const t=teamOf(l);if(t)return h(t);const sd=sideOf(it,l);if(!sd)return"";return sd.form?formHtml(sd.form):sd.rec?h(sd.rec):"";};
  const name=l=>{const sb=subOf(l);return'<span class="n">'+h(l.n)+(l.ita?' '+SL.ico("ita"):"")+(sb?'<small class="nsub">'+sb+'</small>':"")+'</span>';};
  const pic=l=>l.img?'<img class="lg" src="'+h(l.img)+'" alt="" loading="lazy">':l.ico?SL.ico(l.ico,"lg"):'<span class="lg"></span>';
  const lines=L.map(l=>{
    if(kind==="tn")return'<span class="ln'+(l.lose?" l":"")+'">'+pic(l)+name(l)+'<span class="sets">'+String(l.v==null?"":l.v).split(/\s+/).filter(Boolean).map(x=>'<b>'+h(x)+'</b>').join("")+'</span></span>';
    if(kind==="lb")return'<span class="ln lb'+(l.pos!=null&&/^T?1$/.test(String(l.pos))?" first":"")+'">'+(l.pos!=null?'<span class="pos">'+h(l.pos)+'</span>':pic(l))+(l.pos!=null&&l.img?'<img class="fl" src="'+h(l.img)+'" alt="" loading="lazy">':"")+name(l)+'<span class="v">'+h(l.v==null?"":l.v)+'</span></span>';
    return'<span class="ln'+(l.lose?" l":"")+'">'+pic(l)+name(l)+'<span class="v">'+h(l.v==null?"":l.v)+'</span></span>';}).join("");
  return'<button type="button" class="htile'+(big?" big":"")+' sp-'+sp+(it.live?" is-live":it.done?" is-done":"")+(it.important?" fav":"")+'" style="--tc:'+COL[sp]+'" data-go="'+h(JSON.stringify(it.go||{sport:sp}))+'" data-id="'+h(it.id)+'">'+
    '<span class="ht-band">'+SL.ico(sp)+'<span class="cmp">'+h(it.comp||SL.sports[sp].name)+'</span>'+(SL.homeIta(it)&&!(sp==="calcio"&&it.ev&&!it.ev.ita)?'<span class="ht-ita" title="Italia">'+SL.ico("ita")+'</span>':"")+(SL.homeFav(it)?'<span class="ht-star" title="Preferito">★</span>':"")+'<span class="ht-st">'+(it.live?'<i class="dot"></i>':"")+h(stTxt(it))+'</span></span>'+
    '<span class="ht-body k-'+kind+'">'+lines+'</span>'+(big?moreInfo(it):"")+
    (function(){const ft=big&&it.ev&&it.ev.venue?it.ev.venue:it.foot;return ft?'<span class="ht-ft">'+h(ft)+'</span>':"";})()+'</button>';
};

/* ---------- sfondo della home: icone degli sport che fluttuano piano e puntini di luce che salgono ----------
   Disposizione casuale ma sempre uguale (seme fisso); su TV meno elementi; ferme se il sistema chiede meno movimento. */
const FLOAT=[["calcio","#2fbf71"],["basket","#f5803e"],["tennis","#c9dc3c"],["rugby","#3fa7d6"],["moto","#e5383b"],["golf","#d8b45a"],
  ["golfball","#d8b45a"],["trophy","#ffd166"],["racket","#c9dc3c"],["wheel","#e5383b"],["whistle","#2fbf71"],["star","#ffd166"]];
function floatLayer(){
  const old=document.getElementById("hfloat");if(old)old.remove();
  const ICONS=SL.icons.list,tv=SL.couch()||SL.isTVLike();
  let seed=20261123;const rnd=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
  const N=tv?12:22,D=tv?8:16;let html="";
  for(let i=0;i<N;i++){const [n,c]=FLOAT[i%FLOAT.length],big=rnd(),s=Math.round(36+big*120),sw=(1.8*44/s).toFixed(2);
    /* posizioni a griglia "mescolata": coprono tutto lo schermo senza ammassarsi */
    const col=i%6,row=Math.floor(i/6)%4,x=(col+.15+rnd()*.7)*100/6,y=(row+.1+rnd()*.8)*100/Math.ceil(N/6);
    const dur=(34+rnd()*40).toFixed(1);
    html+='<span class="hf" style="left:'+x.toFixed(1)+'%;top:'+y.toFixed(1)+'%;--s:'+s+'px;--o:'+(0.46-big*0.2).toFixed(2)+';--dx:'+((rnd()-.5)*14).toFixed(1)+'vw;--dy:'+((rnd()-.5)*16).toFixed(1)+'vh;--r:'+Math.round((rnd()-.5)*220)+'deg;color:'+c+';animation-duration:'+dur+'s;animation-delay:-'+(rnd()*dur).toFixed(1)+'s">'+
      '<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round">'+ICONS[n]+'</g></svg></span>';}
  for(let i=0;i<D;i++){const c=FLOAT[i%6][1],dur=(26+rnd()*34).toFixed(1);
    html+='<i class="hdot" style="left:'+(rnd()*100).toFixed(1)+'%;--s:'+(3+rnd()*5).toFixed(1)+'px;--c:'+c+';--dx:'+((rnd()-.5)*10).toFixed(1)+'vw;animation-duration:'+dur+'s;animation-delay:-'+(rnd()*dur).toFixed(1)+'s"></i>';}
  const el=document.createElement("div");el.id="hfloat";el.className="hfloat";el.setAttribute("aria-hidden","true");el.innerHTML=html;
  document.body.appendChild(el);SL.onCleanup(()=>el.remove());
}

/* ---------- pagina ---------- */
const DAYC={}; /* giorni diversi da oggi: {giorno: {t, res}} */
LIVE.days=DAYC;LIVE.collect=collect; /* servono anche alla finestra dei preferiti */
const DAYS=[-1,0,1,2],OTHER=[-1,1,2];
const dayName=d=>d===0?"Oggi":d===-1?"Ieri":d===1?"Domani":"Dopodomani";
const ONLYK="home.only"; /* "" tutti, "ita" solo Italia, "fav" solo preferiti */
function mount(ctx){
  const st=ctx.st,main=ctx.main;
  floatLayer();
  const S={f:SPORTS.indexOf(st.f)>=0?st.f:"all",only:["ita","fav"].indexOf(SL.store.get(ONLYK,""))>=0?SL.store.get(ONLYK,""):"",open:{}};
  main.innerHTML='<div class="home">'+
    '<div class="hhero"><div><h1><em>●</em> Adesso in diretta</h1><p id="hSub">Carico partite e sessioni di tutti gli sport…</p></div><div class="hstats" id="hStats"></div></div>'+
    '<nav class="sportsel" id="hSports" aria-label="Apri uno sport"></nav>'+
    '<div class="dtools"><h2 class="dt-h">Giorno per giorno</h2><div id="hFilter"></div><div class="chips onlyf" id="hOnly" role="group" aria-label="Mostra solo"><button type="button" class="chip itachip" data-only="ita" aria-pressed="'+(S.only==="ita")+'" title="Solo Nazionale, campionati italiani, club e atleti italiani">'+SL.ico("ita")+'Italia</button><button type="button" class="chip favchip" data-only="fav" aria-pressed="'+(S.only==="fav")+'" title="Solo squadre e atleti che hai segnato con ★">★ Preferiti</button></div>'+
      (!SL.motoData()&&!SL.isTVLike()?'<span class="muted dt-note">MotoGP e Superbike: con l\'estensione per PC (⚙)</span>':"")+'</div>'+
    /* quattro colonne verticali: Ieri a sinistra, Oggi al centro (più grande e in primo piano), Domani e Dopodomani a destra */
    '<div class="dswitch" id="hSwitch">'+DAYS.map(d=>'<button type="button" data-day="'+d+'" aria-pressed="'+(d===0)+'">'+dayName(d)+'</button>').join("")+'</div>'+
    '<div class="dcols dstage" id="hCols">'+DAYS.map(d=>'<section class="dcol'+(d===0?" dtoday today":" dside"+(d<0?" past":""))+'" data-day="'+d+'" aria-label="'+dayName(d)+'"><header class="dch"><span class="dn">'+dayName(d)+'</span><span class="dd">'+h(SL.fmtDayLong(SL.addDays(Date.now(),d)))+'</span><span class="dc"></span></header><div class="dbody"><div class="loading">Carico</div></div></section>').join("")+'</div>'+
  '</div>';
  const $=id=>main.querySelector("#"+id);
  /* filtro per sport */
  const drawFilter=()=>{const box=$("hFilter");box.innerHTML="";box.appendChild(SL.ui.chips([{k:"all",n:"Tutti",ic:"home"}].concat(SPORTS.map(s=>({k:s,n:SL.sports[s].name,ic:s}))),S.f,v=>{S.f=v;SL.setQuiet({f:v==="all"?"":v});drawFilter();drawCols();},"dfilter"));};
  drawFilter();
  /* Italia e Preferiti: uno alla volta; ritoccare quello acceso lo spegne */
  $("hOnly").addEventListener("click",e=>{const b=e.target.closest("[data-only]");if(!b)return;S.only=S.only===b.dataset.only?"":b.dataset.only;SL.store.set(ONLYK,S.only);
    $("hOnly").querySelectorAll("[data-only]").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.only===S.only)));drawCols();});

  /* riquadri grandi degli sport, con le informazioni del momento */
  const facts={};
  function drawSports(){const box=$("hSports"),now=Date.now();
    box.innerHTML=SPORTS.map(s=>{const m=SL.sports[s],L=LIVE.bySport[s]||[],nl=L.filter(x=>x.live).length;
      const I=x=>x.important?1:0;const pre=L.filter(x=>x.state==="pre").sort((a,b)=>(I(b)-I(a))||(new Date(a.date)-new Date(b.date)));
      const tm=((DAYC[1]&&DAYC[1].res[s])||[]).filter(x=>x.state==="pre").sort((a,b)=>(I(b)-I(a))||(new Date(a.date)-new Date(b.date)));
      const nx=pre[0]||tm[0],lv=L.filter(x=>x.live).sort((a,b)=>I(b)-I(a))[0];
      const evTxt=x=>x.lines&&x.lines.length>1&&x.lines.every(l=>l.pos==null)?x.lines.slice(0,2).map(l=>l.n).join(" – "):(x.comp||"").split(" · ").slice(-1)[0];
      const next=lv?{l:"In diretta",v:evTxt(lv)+(lv.status?" · "+lv.status:"")}:nx?{l:nx===pre[0]?"Prossimo oggi":"Domani",v:evTxt(nx)+(nx.allDay||nx.tbd?"":" · "+SL.fmtTime(nx.date))}:null;
      const f=(facts[s]||[])[0];
      return'<button type="button" class="sptile sp-'+s+'" data-go=\'{"sport":"'+s+'"}\' style="--tc:'+COL[s]+'">'+
        '<span class="spt-top">'+SL.ico(s,"spt-ic")+'<span class="spt-name">'+h(m.name)+'</span></span>'+
        '<span class="spt-count">'+(nl?'<span class="spt-live"><i class="dot"></i>'+nl+' LIVE</span>':"")+(L.length?L.length+(L.length===1?" evento":" eventi")+" oggi":"Niente oggi")+'</span>'+
        (next?'<span class="spt-info"><small>'+h(next.l)+'</small><b>'+h(next.v)+'</b></span>':"")+
        (f?'<span class="spt-info"><small>'+h(f.l)+'</small><b>'+h(f.v)+'</b></span>':"")+
        '<span class="spt-go" aria-hidden="true">APRI →</span></button>';}).join("");}
  SPORTS.forEach(s=>SL.ticker.facts(s,{}).then(F=>{facts[s]=F;if(SL.state.sport==="home")drawSports();}).catch(()=>{}));

  /* colonne dei giorni */
  const dayItems=d=>{const res=d===0?(SPORTS.some(s=>LIVE.loaded[s])?LIVE.bySport:null):(DAYC[d]&&DAYC[d].res);if(!res)return null;const all=[];
    SPORTS.forEach(s=>{if(S.f!=="all"&&S.f!==s)return;(res[s]||[]).forEach(x=>{if(!S.only||(S.only==="ita"?SL.homeIta(x):SL.homeFav(x)))all.push(x);});});return all;};
  const imp=x=>x.important?1:0;
  const byTime=(a,b)=>(new Date(a.date)-new Date(b.date))||(imp(b)-imp(a))||(SPORTS.indexOf(a.sport)-SPORTS.indexOf(b.sport));
  function group(id,title,list,opt){opt=opt||{};if(!list.length)return"";const max=opt.max||40,open=S.open[id],show=open?list:list.slice(0,max);
    const tile=x=>SL.homeTile(x,{big:!!opt.big});
    let html='<div class="dgroup'+(opt.cls?" "+opt.cls:"")+'"><h3 class="dgh">'+title+' <span class="c">'+list.length+'</span></h3><div class="dgrid">';
    if(opt.slots){let last="";show.forEach(x=>{const k=x.allDay?"all":x.tbd?"tbd":SL.fmtTime(x.date);if(k!==last){last=k;html+='<div class="dslot">'+(k==="all"?"Tutto il giorno":k==="tbd"?"Orario da definire":h(k))+'</div>';}html+=tile(x);});}
    else html+=show.map(tile).join("");
    html+='</div>';
    if(list.length>show.length)html+='<button type="button" class="dmore" data-open="'+id+'">Mostra altri '+(list.length-show.length)+' ▾</button>';
    return html+'</div>';}
  let front=0; /* scheda dei giorni in primo piano (schermi larghi): Oggi, finché non ne scegli un'altra */
  function drawCol(d){const col=main.querySelector('section[data-day="'+d+'"]');if(!col)return;const body=col.querySelector(".dbody"),cnt=col.querySelector(".dc");
    const all=dayItems(d);if(!all){body.innerHTML='<div class="loading">Carico</div>';return;}
    const nl=all.filter(x=>x.live).length;cnt.innerHTML=(nl?'<span class="live"><i class="dot"></i>'+nl+' live</span> · ':"")+all.length+(all.length===1?" evento":" eventi");
    const firstAll=x=>x.allDay?0:x.tbd?2:1;
    const sortP=(a,b)=>(firstAll(a)-firstAll(b))||byTime(a,b);
    let html="";
    const nm=s=>SL.sports[s]?SL.sports[s].name:s;
    /* caselle grandi nella scheda in primo piano (sui telefoni: Oggi) */
    /* sul telefono le caselle grandi solo per le partite in diretta: le altre compatte, meno da scorrere */
    const cs=$("hCols"),narrow=matchMedia("(max-width:760px)").matches,big=d===(cs&&cs.classList.contains("stacked")?front:0)&&!narrow,bigLive=big||(narrow&&d===0);
    const wait=d===0?SPORTS.filter(s=>!LIVE.loaded[s]&&(S.f==="all"||S.f===s)):[],ko=d===0?SPORTS.filter(s=>LIVE.failed[s]&&(S.f==="all"||S.f===s)):[];
    const note=(wait.length?'<div class="dpending"><span class="spin"></span>Sto ancora caricando: '+wait.map(nm).join(", ")+'</div>':"")+
      (ko.length?'<div class="dpending err">Non raggiungibili adesso: '+ko.map(nm).join(", ")+' · riprovo tra pochi secondi</div>':"");
    if(d===0){const live=all.filter(x=>x.live).sort((a,b)=>(imp(b)-imp(a))||byTime(a,b)),pre=all.filter(x=>x.state==="pre"&&!x.live).sort(sortP),done=all.filter(x=>x.done&&!x.live).sort((a,b)=>(imp(b)-imp(a))||(new Date(b.date)-new Date(a.date)));
      html=group("live",'<i class="dot"></i> In diretta ora',live,{cls:"g-live",big:bigLive})+group("pre","Prossime",pre,{slots:true,max:30,big})+group("done","Finite oggi",done,{max:8,big});}
    else if(d<0){const done=all.slice().sort(sortP);html=group("y","Risultati",done,{slots:true,max:30,big});}
    else{const pre=all.slice().sort(sortP);html=group("d"+d,"In programma",pre,{slots:true,max:30,big});}
    if(d===0&&!html&&wait.length){body.innerHTML=note+'<div class="loading">Carico</div>';return;}
    body.innerHTML=(d===0?note:"")+(html||'<div class="dempty">'+SL.ico(S.f==="all"?"home":S.f)+'<span>'+(S.only==="ita"?"Nessun evento con squadre o atleti italiani "+(d===0?"oggi":d<0?"ieri":d===1?"domani":"dopodomani")+".":S.only==="fav"?"Nessun evento dei tuoi preferiti "+(d===0?"oggi":d<0?"ieri":d===1?"domani":"dopodomani")+". Tocca ★ accanto a squadre e atleti per aggiungerli.":"Nessun evento "+(d===0?"oggi":d<0?"ieri":d===1?"domani":"dopodomani")+(S.f!=="all"?" per "+SL.sports[S.f].name:"")+".")+'</span></div>');}
  function drawCols(){DAYS.forEach(drawCol);}
  function draw(){drawSports();drawCols();
    const L=dayItems(0)||[],n=[].concat(...SPORTS.map(s=>LIVE.bySport[s]||[])).filter(x=>x.live).length,tot=[].concat(...SPORTS.map(s=>LIVE.bySport[s]||[])).length;
    const tm=DAYC[1]?[].concat(...SPORTS.map(s=>DAYC[1].res[s]||[])).length:null;
    $("hSub").innerHTML=h(SL.fmtDayLong(Date.now()))+' · aggiornato alle '+h(SL.fmtTime(LIVE.updated||Date.now()))+'<span class="hs-o"> · orari italiani</span>';
    $("hStats").innerHTML='<span class="hs live"><b>'+n+'</b><small>in diretta</small></span><span class="hs"><b>'+tot+'</b><small>oggi</small></span>'+(tm!=null?'<span class="hs"><b>'+tm+'</b><small>domani</small></span>':"");}
  /* clic: casella → pagina dello sport; "mostra altri" → apre il gruppo */
  main.addEventListener("click",e=>{const more=e.target.closest(".dmore");if(more){S.open[more.dataset.open]=1;drawCols();return;}
    const b=e.target.closest(".htile,.sptile");if(!b)return;try{SL.go(JSON.parse(b.dataset.go));}catch(x){}});
  /* telefono e tablet: le colonne scorrono di lato; i pulsanti dei giorni portano alla colonna */
  const cols=$("hCols"),sw=$("hSwitch");
  /* altezza della barra in alto: serve ai pulsanti dei giorni che restano appiccicati sotto */
  const top=document.getElementById("top"),setTop=()=>{if(top)document.documentElement.style.setProperty("--toph",top.offsetHeight+"px");};setTop();SL.onPage("resize",setTop);
  sw.addEventListener("click",e=>{const b=e.target.closest("button[data-day]");if(!b)return;const c=cols.querySelector('.dcol[data-day="'+b.dataset.day+'"]');if(c)cols.scrollTo({left:c.offsetLeft-cols.offsetLeft,behavior:"smooth"});});
  let raf=0;cols.addEventListener("scroll",()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{let best=null,bd=1e9;cols.querySelectorAll(".dcol").forEach(c=>{const d=Math.abs(c.offsetLeft-cols.offsetLeft-cols.scrollLeft);if(d<bd){bd=d;best=c.dataset.day;}});
    sw.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.day===best)));});},{passive:true});
  /* ---------- schermi larghi: le quattro schede "a mazzo" ----------
     Tutte della stessa misura. Quella in primo piano (all'inizio Oggi) è al centro della pagina, sopra; le altre restano in
     ordine di giorno: quelle prima sbucano da sinistra, quelle dopo da destra, più in basso e dietro.
     Il contenuto delle schede dietro sta nella parte che si vede (--vis), così resta leggibile.
     Passando col mouse (o toccando) una scheda dietro, va lei in primo piano. */
  function layoutStage(){
    const secs={};cols.querySelectorAll("section[data-day]").forEach(s=>{secs[s.dataset.day]=s;});
    const C=cols.clientWidth,couch=SL.couch();
    if(innerWidth<1100||C<1000){cols.classList.remove("stacked");Object.values(secs).forEach(s=>{s.removeAttribute("style");delete s.dataset.side;s.classList.remove("narrow","slim");
      const d=+s.dataset.day;s.classList.toggle("dtoday",d===0);s.classList.toggle("dside",d!==0);});cols.style.height="";return;}
    cols.classList.add("stacked");
    const W=Math.round(Math.min(couch?760:660,Math.max(460,C*0.40))),ml=(C-W)/2,room=ml;
    const H=Math.round(Math.max(540,Math.min(innerHeight-120,couch?1150:1000))),drop=26;
    /* quanto si vede di ogni scheda dietro, dalla più vicina alla più lontana */
    const visOf=n=>{if(n===1)return[Math.round(Math.min(W*0.58,room*0.6))];
      if(n===2){const v1=Math.round(Math.min(W*0.58,room*0.6));return[v1,Math.round(Math.max(150,Math.min(W*0.45,room-v1)))];}
      const a=Math.round(Math.min(W*0.5,room*0.46)),b=Math.round(Math.min(W*0.4,room*0.32));return[a,b,Math.round(Math.max(84,room-a-b))];};
    const put=(s,left,top,z,vis,side)=>{if(!s)return;s.style.cssText="left:"+Math.round(left)+"px;top:"+top+"px;width:"+W+"px;height:"+H+"px;z-index:"+z+";--vis:"+vis+"px";
      s.dataset.side=side;s.classList.toggle("narrow",vis<215);s.classList.toggle("slim",vis<130);
      const d=+s.dataset.day;s.classList.toggle("dtoday",side==="main");s.classList.toggle("dside",side!=="main");};
    const fi=DAYS.indexOf(front),L=DAYS.slice(0,fi).reverse(),R=DAYS.slice(fi+1),vl=visOf(L.length),vr=visOf(R.length);
    put(secs[front],ml,0,6,W,"main");
    let off=0;L.forEach((d,i)=>{off+=vl[i];put(secs[d],ml-off,drop*(i+1),5-i,vl[i],"left");});
    off=0;R.forEach((d,i)=>{off+=vr[i];put(secs[d],ml+off,drop*(i+1),5-i,vr[i],"right");});
    cols.style.height=(H+drop*3+6)+"px";}
  /* porta in primo piano la scheda di un giorno (con un breve scorrimento) */
  let animT=0;
  function setFront(d){
    if(d===front||DAYS.indexOf(d)<0||!cols.classList.contains("stacked"))return;
    const old=front;front=d;sw.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(+x.dataset.day===d)));
    cols.classList.add("anim");clearTimeout(animT);animT=setTimeout(()=>cols.classList.remove("anim"),480);
    layoutStage();drawCol(old);drawCol(d);}
  /* mouse sopra una scheda dietro (fermo un istante): va in primo piano.
     Conta solo se il mouse si è mosso davvero: quando le schede scorrono sotto il puntatore fermo non succede niente. */
  let hvT=0,hvDay=null,ptr={x:-1e4,y:-1e4},still={x:-1e4,y:-1e4};
  const hvStop=()=>{clearTimeout(hvT);hvT=0;hvDay=null;};
  cols.addEventListener("mousemove",e=>{ptr={x:e.clientX,y:e.clientY};
    if(!cols.classList.contains("stacked"))return;
    const s=e.target.closest("section[data-day]");
    if(!s||s.dataset.side==="main"){hvStop();return;}
    if(Math.abs(e.clientX-still.x)+Math.abs(e.clientY-still.y)<10)return;
    const d=+s.dataset.day;if(hvDay===d)return;
    hvStop();hvDay=d;hvT=setTimeout(()=>{hvT=0;hvDay=null;still={x:ptr.x,y:ptr.y};setFront(d);},220);});
  cols.addEventListener("mouseleave",hvStop);
  /* tocco o clic su una scheda dietro: prima va in primo piano (il secondo tocco apre la partita) */
  cols.addEventListener("click",e=>{if(!cols.classList.contains("stacked"))return;const s=e.target.closest("section[data-day]");
    if(!s||s.dataset.side==="main")return;e.preventDefault();e.stopPropagation();hvStop();still={x:e.clientX,y:e.clientY};setFront(+s.dataset.day);},true);
  /* da tastiera: il Tab che entra in una scheda dietro la porta davanti */
  cols.addEventListener("focusin",e=>{if(!cols.classList.contains("stacked"))return;const s=e.target.closest("section[data-day]");if(!s||s.dataset.side==="main")return;
    let kb=true;try{kb=e.target.matches(":focus-visible");}catch(x){}if(kb)setFront(+s.dataset.day);});
  layoutStage();SL.onPage("resize",layoutStage);
  /* passando da telefono a schermo largo (o viceversa) cambiano le caselle */
  {let wasN=matchMedia("(max-width:760px)").matches;SL.onPage("resize",()=>{const n=matchMedia("(max-width:760px)").matches;if(n!==wasN){wasN=n;drawCols();}});}
  requestAnimationFrame(()=>{if(cols.classList.contains("stacked"))return;const t=cols.querySelector('.dcol[data-day="0"]');if(t&&cols.scrollWidth>cols.clientWidth+4)cols.scrollLeft=t.offsetLeft-cols.offsetLeft;});
  SL.onPage("live",()=>{if(SL.state.sport==="home")draw();});
  SL.onPage("flash",id=>{const t=document.querySelector('.htile[data-id="'+CSS.escape(id)+'"]');if(t){t.classList.remove("flash");void t.offsetWidth;t.classList.add("flash");}});
  SL.onPage("fav",()=>drawCols());
  draw();
  const loadDay=d=>async()=>{const c=DAYC[d];if(c&&Date.now()-c.t<1500000){draw();return;}const r=await collect(d);DAYC[d]={t:Date.now(),res:r};if(SL.state.sport==="home")draw();};
  SL.every(loadDay(1),1800000);
  SL.every(loadDay(-1),1800000,{delay:1500});
  SL.every(loadDay(2),1800000,{delay:3500});
}
})();
