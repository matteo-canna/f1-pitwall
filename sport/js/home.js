/* Sport LIVE APP — Home "Adesso in diretta" + raccoglitore in background (contatori live, avvisi) */
(function(){
"use strict";
const h=SL.h;
const SPORTS=["calcio","basket","tennis","rugby","moto"];
const LIVE=SL.live={items:new Map(),bySport:{},tomorrow:{},updated:0,lastLive:{}};

/* ---------- raccoglitore: ogni sport fornisce homeFeed(giorno, ttl) ---------- */
async function collect(day){
  const res={};
  await Promise.all(SPORTS.map(async s=>{const m=SL.sports[s];if(!m||!m.homeFeed)return;
    const ttl=day===0?(LIVE.lastLive[s]?15000:240000):1800000;
    try{res[s]=await m.homeFeed(day,ttl)||[];}catch(e){console.warn("home",s,e);res[s]=[];}}));
  return res;
}
async function tickToday(){
  const res=await collect(0);
  SPORTS.forEach(s=>{const list=res[s]||[];LIVE.bySport[s]=list;const n=list.filter(x=>x.live).length;LIVE.lastLive[s]=n>0||list.some(x=>x.state==="pre"&&new Date(x.date)-Date.now()<20*60000);SL.setLive(s,n);
    const m=SL.sports[s];
    list.forEach(it=>{const prev=LIVE.items.get(it.id);LIVE.items.set(it.id,it);
      if(prev&&prev.sig!==it.sig&&m.onChange){const a=m.onChange(prev,it);if(a){a.important=a.important!=null?a.important:it.important;a.go=a.go||it.go;a.sport=s;SL.alert(a);SL.emit("flash",it.id);}}});});
  LIVE.updated=Date.now();
  SL.setLive("home",[...LIVE.items.values()].filter(x=>x.live).length);
  SL.emit("live");SL.ui.refreshLiveChips();
}
SL.sports.home={
  name:"Live ora",tab:"Live ora",icon:"●",color:"#e5383b",
  background(){SL.espn.loadItaClubs();SL.every(tickToday,()=>Object.values(LIVE.lastLive).some(Boolean)?20000:90000,{global:true});},
  mount
};

/* ---------- tessera di un evento ---------- */
const COL={calcio:"#2fbf71",basket:"#f5803e",tennis:"#c9dc3c",rugby:"#3fa7d6",moto:"#e5383b"};
const ICO={calcio:1,basket:1,tennis:1,rugby:1,moto:1};
SL.homeTile=function(it){
  const tag=it.live?'<span class="tag live">'+h(it.status||"LIVE")+'</span>':it.done?'<span class="tag">'+h(it.status||"FINALE")+'</span>':'<span class="tag">'+h(it.status)+'</span>';
  const lines=(it.lines||[]).map(l=>'<div class="ln'+(l.lose?" l":"")+'">'+(l.img?'<img class="logo-t" src="'+h(l.img)+'" alt="" loading="lazy">':'<span>'+(l.ico?SL.ico(l.ico):"")+'</span>')+'<span class="n">'+h(l.n)+(l.ita?' '+SL.ico("ita"):"")+'</span><span class="v">'+h(l.v==null?"":l.v)+'</span></div>').join("");
  return'<button type="button" class="htile sp-'+it.sport+(it.important?" fav":"")+'" style="--tc:'+COL[it.sport]+'" data-go="'+h(JSON.stringify(it.go||{sport:it.sport}))+'" data-id="'+h(it.id)+'">'+
    '<div class="hd"><span class="sportpill" style="--tc:'+COL[it.sport]+'">'+SL.ico(it.sport)+'</span><span class="cmp">'+h(it.comp||"")+'</span>'+tag+'</div>'+lines+
    (it.foot?'<div class="ft">'+(it.footIco?SL.ico(it.footIco)+" ":"")+h(it.foot)+'</div>':"")+'</button>';
};

/* ---------- pagina ---------- */
function mount(ctx){
  const st=ctx.st,f=st.f||"all";
  const chips=[{k:"all",n:"Tutti",ic:"home"}].concat(SPORTS.map(s=>({k:s,n:SL.sports[s].name,ic:s})));
  const row=document.createElement("div");row.className="row";
  row.appendChild(SL.ui.chips(chips,f,v=>SL.go({sport:"home",f:v==="all"?"":v},true)));
  ctx.sub.appendChild(row);
  const main=ctx.main;
  main.innerHTML='<div class="hero"><div><h1><em>●</em> Adesso in diretta</h1><p id="hSub">Carico partite e sessioni di tutti gli sport…</p></div><div class="row" id="hTools"></div></div><div class="hsec" id="hBody"><div class="loading">Carico</div></div>';
  const tools=main.querySelector("#hTools");
  if(!SL.extData()&&!SL.isTVLike())tools.innerHTML='<span class="muted" style="font-size:11.5px">Moto: dati live con l\'estensione per PC (⚙)</span>';
  let tomorrow=null;
  const draw=()=>{
    const all=[];SPORTS.forEach(s=>{if(f!=="all"&&f!==s)return;(LIVE.bySport[s]||[]).forEach(x=>all.push(x));});
    const now=Date.now(),fav=x=>x.important;
    const live=all.filter(x=>x.live).sort((a,b)=>(fav(b)-fav(a))||(new Date(a.date)-new Date(b.date)));
    const later=all.filter(x=>x.state==="pre").sort((a,b)=>(new Date(a.date)-new Date(b.date)));
    const done=all.filter(x=>x.done&&now-new Date(x.date)<8*36e5).sort((a,b)=>(fav(b)-fav(a))||(new Date(b.date)-new Date(a.date)));
    const favs=all.filter(x=>fav(x)&&!x.done);
    const tm=[];if(tomorrow)SPORTS.forEach(s=>{if(f!=="all"&&f!==s)return;(tomorrow[s]||[]).forEach(x=>tm.push(x));});
    tm.sort((a,b)=>(fav(b)-fav(a))||(new Date(a.date)-new Date(b.date)));
    const sec=(t,list,max,empty)=>'<div class="hsec"><h2>'+t+' <span class="c">'+list.length+'</span></h2>'+(list.length?'<div class="hgrid">'+list.slice(0,max||60).map(SL.homeTile).join("")+'</div>'+(list.length>(max||60)?'<p class="note">…e altre '+(list.length-max)+'. Apri lo sport per vederle tutte.</p>':""):'<div class="empty">'+empty+'</div>')+'</div>';
    let html="";
    if(favs.length)html+=sec("★ Preferiti e Italia",favs,12,"");
    html+=sec('<span style="color:var(--red)">●</span> In diretta ora',live,60,"Nessun evento in diretta in questo momento."+(later.length?" Il prossimo: <b>"+h(later[0].lines.map(l=>l.n).join(" – "))+"</b> alle "+h(SL.fmtTime(later[0].date))+".":""));
    html+=sec("Più tardi oggi",later,40,"Niente altro in programma oggi.");
    if(done.length)html+=sec("Appena finite",done,24,"");
    html+=sec("Domani · "+h(SL.fmtDay(SL.addDays(now,1))),tm,40,tomorrow?"Nessun evento domani nelle competizioni seguite.":"Carico…");
    const body=main.querySelector("#hBody");body.outerHTML='<div id="hBody" class="hsec">'+html+'</div>';
    const n=live.length;main.querySelector("#hSub").textContent=(n?n+" eventi live":"Nessun evento live")+" · aggiornato alle "+SL.fmtTime(LIVE.updated||Date.now())+" · orari italiani";
  };
  main.addEventListener("click",e=>{const b=e.target.closest(".htile");if(!b)return;try{SL.go(JSON.parse(b.dataset.go));}catch(x){}});
  SL.onPage("live",()=>{if(SL.state.sport==="home")draw();});
  SL.onPage("flash",id=>{const t=document.querySelector('.htile[data-id="'+CSS.escape(id)+'"]');if(t){t.classList.remove("flash");void t.offsetWidth;t.classList.add("flash");}});
  if(LIVE.updated)draw();
  SL.every(async()=>{const r=await collect(1);tomorrow=r;draw();},1800000);
}
})();
