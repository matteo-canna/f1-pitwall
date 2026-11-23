/* Sport LIVE APP — GOLF (PGA Tour, DP World Tour, LPGA)
   Classifica del torneo live con posizione, totale, giro di oggi e buche giocate; scorecard buca per buca; italiani in gara; calendario con i Major. Dati: ESPN. */
(function(){
"use strict";
const h=SL.h,UI=SL.ui;
const M=SL.sports.golf={name:"Golf",tab:"Golf",icon:"⛳",color:"#d8b45a"};
const TOURS=[{k:"pga",n:"PGA Tour",s:"PGA"},{k:"eur",n:"DP World Tour",s:"DP World"},{k:"lpga",n:"LPGA",s:"LPGA"}];
const TN=k=>(TOURS.find(t=>t.k===k)||TOURS[0]).n,TS=k=>(TOURS.find(t=>t.k===k)||TOURS[0]).s;
const BASE=t=>SL.ESPN+"golf/"+t+"/";
const clean=n=>String(n||"").replace(/ (presented|pres\.) by.*$/i,"").replace(/ powered by.*$/i,"");
/* i quattro Major maschili e i cinque femminili; poi i grandi eventi di fine stagione e le sfide a squadre */
const MAJOR=/^(the )?masters( tournament)?$|^pga championship$|^u\.s\. open$|^the open( championship)?$|chevron championship|u\.s\. women's open|women's pga championship|evian championship|^aig women's open$/i;
const BIG=/players championship|tour championship|dp world tour championship|cme group tour championship|ryder cup|solheim cup|presidents cup|bmw pga championship|genesis scottish open|fedex st\. jude|bmw championship|italian open|open d'italia/i;
M.cat=name=>MAJOR.test(clean(name))?{k:"major",n:"MAJOR"}:BIG.test(clean(name))?{k:"big",n:"GRANDE EVENTO"}:null;
const toPar=s=>{s=String(s==null?"":s).trim();if(!s||s==="-")return null;if(/^e$/i.test(s))return 0;const n=parseFloat(s);return isNaN(n)?null:n;};
const fmtPar=n=>n==null?"–":n===0?"E":(n>0?"+":"")+n;
const isIta=alt=>/^ital/i.test(alt||"");
const favP=n=>SL.fav.hasName("golf",n);

/* ---------- normalizzazione di un torneo ESPN ---------- */
function norm(e,tour){
  const c=(e.competitions||[])[0]||{},cs=c.status||{},ct=cs.type||{},est=((e.status||{}).type||{}).state||"pre";
  const rnd=cs.period||0,cstate=ct.state||"pre";
  const P=(c.competitors||[]).map(x=>{const a=x.athlete||{},fl=a.flag||{};
    const R=(x.linescores||[]).map(l=>({n:l.period,v:l.value,tp:toPar(l.displayValue),holes:(l.linescores||[]).map(k=>({h:k.period,v:k.value,rel:toPar(k.scoreType&&k.scoreType.displayValue)}))}));
    const played=R.filter(r=>r.holes.length>0);
    const cur=R.find(r=>r.n===rnd)||played[played.length-1]||null;
    const thruN=cur?cur.holes.length:0;
    return{id:String(a.id||x.id||""),name:a.displayName||"",short:a.shortName||a.displayName||"",flag:fl.href||"",cc:fl.alt||"",ita:isIta(fl.alt),order:x.order||999,
      score:toPar(x.score),R,thruN,today:cur&&thruN?cur.tp:null,played:played.length,
      strokes:R.filter(r=>r.holes.length===18).reduce((s,r)=>s+(r.v||0),0)};}).sort((a,b)=>a.order-b.order);
  /* fuori dal taglio o ritirati: hanno giocato meno giri di chi è in testa */
  const lead=P[0]?P[0].played:0;
  P.forEach(p=>{p.out=lead>=3&&p.played<Math.min(lead,3)?(p.played===2&&p.R.slice(0,2).every(r=>r.holes.length===18)?"CUT":"RIT."):"";});
  const act=P.filter(p=>!p.out);
  act.forEach((p,i)=>{const same=act.filter(q=>q.score===p.score);const first=act.indexOf(same[0]);p.pos=(same.length>1?"T":"")+(first+1);p.rank=first+1;});
  P.filter(p=>p.out).forEach(p=>{p.pos=p.out;p.rank=999;});
  P.forEach(p=>{p.thru=p.out?"":p.thruN===18?"F":p.thruN?String(p.thruN):(cstate==="pre"&&rnd<=1?"":"–");p.fav=favP(p.name);});
  /* par di ogni buca: lo ricavo dai colpi meno il risultato rispetto al par, per tutti i giocatori */
  const pc={};P.forEach(p=>p.R.forEach(r=>r.holes.forEach(k=>{if(k.v==null||k.rel==null)return;const v=k.v-k.rel;(pc[k.h]=pc[k.h]||{})[v]=((pc[k.h]||{})[v]||0)+1;})));
  const par={};Object.keys(pc).forEach(k=>{par[k]=+Object.entries(pc[k]).sort((a,b)=>b[1]-a[1])[0][0];});
  const live=cstate==="in"&&est!=="post";
  return{id:String(e.id),tour,name:clean(e.name),date:e.date,end:e.endDate||e.date,est,cstate,rnd,live,done:est==="post",detail:ct.detail||ct.description||"",
    P,par,cat:M.cat(e.name),ita:P.filter(p=>p.ita),broadcast:c.broadcast||""};
}
const roundTxt=T=>T.done?"FINALE":T.live?T.rnd+"° GIRO":T.rnd&&T.cstate==="post"?"DOPO IL "+T.rnd+"° GIRO":T.rnd?T.rnd+"° GIRO":"";
async function board(tour,dateKey,ttl){const d=await SL.tryGet(BASE(tour)+"scoreboard"+(dateKey?"?dates="+dateKey:""),{ttl:ttl||60000});
  if(!d)return{evs:[],cal:[]};const lg=(d.leagues||[])[0]||{};
  return{evs:(d.events||[]).map(e=>norm(e,tour)),cal:(lg.calendar||[]).map(c=>({id:String(c.id),name:clean(c.label),start:c.startDate,end:c.endDate,cat:M.cat(c.label)}))};}
const inRange=(T,key)=>SL.dayKey(T.date)<=key&&key<=SL.dayKey(T.end);

/* ---------- home e avvisi ---------- */
/* un torneo dura più giorni: per ogni giorno dico che giro si gioca. Ieri solo se è finito quel giorno */
const kd=k=>new Date(+k.slice(0,4),+k.slice(4,6)-1,+k.slice(6,8),12);
function item(T,day){const key=SL.dayKey(SL.addDays(Date.now(),day)),top=T.P.filter(p=>!p.out).slice(0,3),ib=T.ita.filter(p=>!p.out)[0];
  const lines=top.map(p=>({pos:p.pos,n:p.name,img:p.flag,ita:p.ita,v:fmtPar(p.score)+(T.live&&p.thru&&p.thru!=="F"?" ("+p.thru+")":"")}));
  if(ib&&top.indexOf(ib)<0)lines.push({pos:ib.pos,n:ib.name,img:ib.flag,ita:true,v:fmtPar(ib.score)});
  const between=!T.live&&!T.done&&T.rnd>0,rn=Math.round((kd(key)-kd(SL.dayKey(T.date)))/864e5)+1;
  let state,status,live=false,done=false;
  if(day===0){state=T.live?"in":T.done||between?"post":"pre";live=T.live;done=T.done||between;status=T.live?T.rnd+"° GIRO":T.done?"FINALE":between?"DOPO IL "+T.rnd+"° GIRO":Math.max(1,rn)+"° GIRO";}
  else if(day<0){state="post";done=true;status="FINALE";}
  else{state="pre";status=Math.max(1,rn)+"° GIRO";}
  return{id:"golf:"+T.tour+":"+T.id,sport:"golf",comp:TS(T.tour)+" · "+T.name,date:live||done?new Date(Date.now()-36e5).toISOString():kd(key).toISOString(),
    state,live,done,status,allDay:!live,
    tk:day===0&&!T.live?(T.done?"FINALE":between?"DOPO IL "+T.rnd+"° GIRO":"OGGI"):"",
    important:T.P.some(p=>p.fav)||T.ita.some(p=>p.rank<=10)||!!(T.cat&&T.cat.k==="major"),
    sig:(top[0]&&top[0].id)+"|"+(top[0]&&top[0].score)+"|"+T.cstate+"|"+T.est+"|"+T.rnd,T,
    lines:lines.length?lines:[{n:"Inizio del torneo",ico:"golf",v:""}],foot:(T.cat?T.cat.n+" · ":"")+(day>0&&lines.length?"classifica attuale":TN(T.tour)),go:{sport:"golf",c:T.tour,e:T.id}};}
M.homeFeed=async function(day,ttl){const key=SL.dayKey(SL.addDays(Date.now(),day)),out=[];
  await Promise.all(TOURS.map(async t=>{const b=await board(t.k,key,ttl);
    b.evs.forEach(T=>{if(!(inRange(T,key)||(day===0&&T.live)))return;
      if(day>0&&T.done)return;
      if(day<0&&!(T.done&&SL.dayKey(T.end)===key))return;
      out.push(item(T,day));});}));
  return out;};
M.onChange=function(p,it){const a=p.T,b=it.T;if(!a||!b)return null;const la=a.P[0],lb=b.P[0];if(!lb)return null;
  if(!a.done&&b.done)return{id:"w:"+it.id,big:"VINCE",icon:lb.ita?"ita":"trophy",title:lb.name+" "+fmtPar(lb.score),text:it.comp,color:"var(--sa,#d8b45a)"};
  if(b.live&&la&&la.id!==lb.id)return{id:"l:"+it.id+":"+lb.id+":"+lb.score,big:"IN TESTA",icon:lb.ita?"ita":"golf",title:lb.name+" "+fmtPar(lb.score),text:it.comp,color:"var(--yellow)"};
  const ia=b.ita.find(x=>x.rank===1&&!a.P.some(y=>y.id===x.id&&y.rank===1));
  if(ia)return{id:"i:"+it.id+":"+ia.id,big:"ITALIA IN TESTA",icon:"ita",title:ia.name+" "+fmtPar(ia.score),text:it.comp,color:"var(--ita)",important:true};
  return null;};

/* ---------- fatti per testata e striscia ---------- */
async function lastWinner(tour,cal,cur){
  if(cur&&cur.done&&cur.P[0])return{T:cur,w:cur.P[0]};
  const past=cal.filter(c=>new Date(c.end).getTime()<Date.now()).reverse();
  for(const c of past.slice(0,2)){const b=await board(tour,SL.dayKey(c.start),216e5);const T=b.evs.find(x=>x.id===c.id)||b.evs.find(x=>x.done);if(T&&T.done&&T.P[0])return{T,w:T.P[0]};}
  /* calendario già della stagione nuova (succede al DP World Tour a novembre): provo le settimane precedenti */
  if(!past.length)for(const k of [7,14,21]){const b=await board(tour,SL.dayKey(SL.addDays(Date.now(),-k)),216e5);const T=b.evs.filter(x=>x.done&&x.P[0]).pop();if(T)return{T,w:T.P[0]};}
  return null;}
M.facts=async function(st){const one=st&&st.sport==="golf"&&st.c!=="live"?TOURS.find(t=>t.k===(st.c||"pga")):null;const list=one?[one]:TOURS;const out=[];
  for(const t of list){const b=await board(t.k,"",300000);const cur=b.evs[0];
    if(cur&&cur.live&&cur.P[0])out.push({l:"In testa · "+cur.name,v:cur.P[0].name+" "+fmtPar(cur.P[0].score),go:{sport:"golf",c:t.k,e:cur.id}});
    const lw=await lastWinner(t.k,b.cal,cur);
    if(lw)out.push({l:"Ultimo "+t.s+" · "+lw.T.name,v:"vince "+lw.w.name+" ("+fmtPar(lw.w.score)+")",go:{sport:"golf",c:t.k,e:lw.T.id}});
    if(one){const ib=cur&&cur.ita.filter(p=>!p.out)[0];if(ib)out.push({l:"Miglior italiano",v:ib.name+" · "+ib.pos+" ("+fmtPar(ib.score)+")",go:{sport:"golf",c:t.k,e:cur.id}});
      const nx=b.cal.find(c=>new Date(c.start).getTime()>Date.now());if(nx)out.push({l:"Prossimo torneo",v:nx.name+" · dal "+SL.fmtDay(nx.start)+(nx.cat?" · "+nx.cat.n:"")});
      const mj=b.cal.find(c=>c.cat&&c.cat.k==="major"&&new Date(c.start).getTime()>Date.now());if(mj&&mj!==nx)out.push({l:"Prossimo Major",v:mj.name+" · "+SL.fmtDay(mj.start)});}}
  return out;};

/* ---------- pagina ---------- */
const DEFS=[
  {k:"tv",n:"Diretta TV",sz:2,fixed:true},
  {k:"board",n:"Classifica del torneo",sz:3},
  {k:"card",n:"Scorecard",sz:2},
  {k:"ita",n:"Italiani in gara",sz:1},
  {k:"next",n:"Prossimo torneo",sz:1},
  {k:"cal",n:"Calendario",sz:2,couch:false}
];
M.mount=function(ctx){
  const st=ctx.st;let tour=st.c||"pga";if(tour!=="live"&&!TOURS.find(t=>t.k===tour))tour="pga";
  const r=document.createElement("div");r.className="row";
  r.appendChild(UI.chips([UI.liveChip("golf")].concat(TOURS.map(t=>({k:t.k,n:t.n}))),tour,v=>SL.go({c:v==="pga"?"":v,e:"",p:""})));
  ctx.sub.appendChild(r);
  if(tour==="live"){mountLive(ctx);return;}
  mountTour(ctx,tour,st.e||"");
};
async function mountLive(ctx){
  const rid=SL.routeId,note=document.createElement("div");note.className="row";ctx.sub.appendChild(note);
  const all=[].concat(...await Promise.all(TOURS.map(async t=>(await board(t.k,"",20000)).evs)));
  if(rid!==SL.routeId)return;
  const L=all.filter(T=>T.live).sort((a,b)=>(b.ita.length-a.ita.length)||((b.cat?1:0)-(a.cat?1:0)));
  if(L.length){note.appendChild(UI.liveNote("In campo adesso: "+L.map(T=>TS(T.tour)+" · "+T.name).join(" · ")));mountTour(ctx,L[0].tour,L[0].id,L.slice(1));UI.dock(ctx.sub,ctx.main);return;}
  const cards=UI.mount(ctx.main,[{k:"tv",n:"Diretta TV",sz:2,fixed:true},{k:"nolive",n:"Live ora",sz:2}]);UI.tv(cards.tv,"golf");
  const nx=all.filter(T=>!T.done).sort((a,b)=>new Date(a.date)-new Date(b.date))[0];
  cards.nolive.body.innerHTML='<div class="nolive">'+SL.ico("golf")+'<div>Nessun giro in corso adesso su PGA Tour, DP World Tour o LPGA.<br>'+(nx?"Prossimo: <b>"+h(nx.name)+"</b> ("+h(TN(nx.tour))+") "+(nx.rnd?"· "+h(roundTxt(nx)):"dal "+h(SL.fmtDay(nx.date))):"")+'</div></div>';
  UI.dock(ctx.sub,ctx.main);
  SL.every(async()=>{const a=await Promise.all(TOURS.map(t=>board(t.k,"",60000)));if(rid===SL.routeId&&a.some(b=>b.evs.some(T=>T.live)))SL.route();},60000,{delay:60000});
}
function mountTour(ctx,tour,evId,others){
  const st=ctx.st,S={tour,T:null,cal:[],sel:evId,p:st.p||"",r:0,f:"all",dateKey:""};
  const r2=document.createElement("div");r2.className="row";ctx.sub.appendChild(r2);
  if(others&&others.length){const r3=document.createElement("div");r3.className="row";
    r3.appendChild(UI.chips(others.map(T=>({k:T.tour+":"+T.id,n:TS(T.tour)+" · "+T.name,live:true})),"",v=>{const [t,e]=v.split(":");SL.go({c:t,e});}));ctx.sub.appendChild(r3);}
  const cards=UI.mount(ctx.main,DEFS);UI.tv(cards.tv,"golf");
  UI.seg(cards.board,[["all","Tutti"],["ita","Italiani"],["fav","★"]],"all",v=>{S.f=v;drawBoard();});
  let segR=null;
  ctx.main.addEventListener("click",e=>{if(e.target.closest(".star"))return;
    const row=e.target.closest("[data-p]");if(row){S.p=row.dataset.p;S.r=0;SL.setQuiet({p:S.p});drawBoard();drawCard();drawIta();return;}
    const ce=e.target.closest("[data-ce]");if(ce){S.sel=ce.dataset.ce;S.dateKey=ce.dataset.dk;S.p="";S.r=0;SL.setQuiet({e:S.sel,p:""});load();}});
  async function load(){
    let b=await board(S.tour,S.dateKey,S.dateKey?600000:20000);
    if(!S.cal.length||!S.dateKey)S.cal=b.cal.length?b.cal:S.cal;
    let T=S.sel?b.evs.find(x=>x.id===S.sel):b.evs[0];
    /* torneo scelto dal calendario o da un link: lo cerco nella sua settimana */
    if(!T&&S.sel){const c=S.cal.find(x=>x.id===S.sel);if(c){S.dateKey=SL.dayKey(c.start);b=await board(S.tour,S.dateKey,600000);T=b.evs.find(x=>x.id===S.sel);}}
    S.T=T||b.evs[0]||null;
    const T2=S.T;
    r2.innerHTML=T2?(T2.cat?'<span class="tag big">'+h(T2.cat.n)+'</span>':"")+'<b class="gname">'+h(T2.name)+'</b><span class="muted">'+h(TN(S.tour)+" · "+SL.fmtDay(T2.date)+" – "+SL.fmtDay(T2.end))+'</span>'+(T2.live?'<span class="tag live">'+h(T2.rnd+"° GIRO")+'</span>':roundTxt(T2)?'<span class="tag">'+h(roundTxt(T2))+'</span>':""):'<span class="muted">Nessun torneo '+h(TN(S.tour))+' questa settimana.</span>';
    drawBoard();drawCard();drawIta();drawNext();drawCal();}
  function drawBoard(){const c=cards.board,T=S.T;
    if(!T){c.body.innerHTML=UI.empty("Nessun torneo in programma.");c.sub("");return;}
    if(!T.P.length){c.sub(T.name);c.body.innerHTML='<div class="nolive">'+SL.ico("golf")+'<div>Il torneo inizia '+h(SL.when(T.date))+'.<br>La classifica compare con i primi colpi del 1° giro.</div></div>';return;}
    let L=T.P;if(S.f==="ita")L=L.filter(p=>p.ita);if(S.f==="fav")L=L.filter(p=>p.fav);
    const nR=Math.max(4,...T.P.map(p=>p.R.length));
    c.sub(T.name+" · "+(T.live?"in diretta · ":"")+T.P.filter(p=>!p.out).length+" in gara");
    c.body.innerHTML=L.length?'<div class="scroll"><table class="tbl gboard"><thead><tr><th>POS</th><th class="l">Giocatore</th><th>TOT</th><th>OGGI</th><th>BUCA</th>'+Array.from({length:nR},(_,i)=>'<th class="rr">R'+(i+1)+'</th>').join("")+'<th class="rr">COLPI</th></tr></thead><tbody>'+
      L.map(p=>'<tr data-p="'+h(p.id)+'" class="'+(p.ita?"ita":"")+(p.fav?" me":"")+(p.id===S.p?" sel":"")+(p.out?" out":"")+'"><td><b>'+h(p.pos)+'</b></td><td class="l"><span class="tn" style="max-width:none">'+(p.flag?'<img class="flag" src="'+h(p.flag)+'" alt="'+h(p.cc)+'" loading="lazy">':"")+h(p.name)+SL.star("golf","player",p.id,p.name)+'</span></td>'+
        '<td class="gpar '+(p.score<0?"un":p.score>0?"ov":"")+'"><b>'+h(fmtPar(p.score))+'</b></td><td class="gpar '+(p.today<0?"un":p.today>0?"ov":"")+'">'+h(p.today==null?"–":fmtPar(p.today))+'</td><td>'+h(p.thru||"–")+'</td>'+
        Array.from({length:nR},(_,i)=>{const rr=p.R[i];return'<td class="rr">'+h(rr&&rr.holes.length===18?rr.v:"")+'</td>';}).join("")+'<td class="rr">'+h(p.strokes||"")+'</td></tr>').join("")+'</tbody></table></div>'
      :UI.empty(S.f==="ita"?"Nessun italiano in questo torneo.":"Nessun preferito in gara. Tocca ★ accanto a un giocatore.");}
  /* segni classici della scorecard: cerchio birdie, doppio cerchio eagle, quadrato bogey, doppio quadrato doppio bogey */
  const mark=rel=>rel==null?"":rel<=-2?"eg":rel===-1?"bi":rel===0?"pa":rel===1?"bo":"db";
  function drawCard(){const c=cards.card,T=S.T;
    if(!T||!T.P.length){c.body.innerHTML=UI.empty("La scorecard compare quando il torneo è iniziato.");c.sub("");if(segR){segR.remove();segR=null;}return;}
    const p=T.P.find(x=>x.id===S.p)||T.P.find(x=>x.fav)||T.P[0];
    const played=p.R.filter(r=>r.holes.length);const rr=S.r&&p.R.find(r=>r.n===S.r)||played[played.length-1]||p.R[0];
    if(segR)segR.remove();
    segR=played.length>1?UI.seg(c,played.map(r=>[String(r.n),"R"+r.n]),String(rr.n),v=>{S.r=+v;drawCard();}):null;
    c.sub(p.name+" · "+p.pos+" · "+fmtPar(p.score));
    if(!rr||!rr.holes.length){c.body.innerHTML=UI.empty(p.name+" non ha ancora iniziato il giro.");return;}
    const by={};rr.holes.forEach(k=>{by[k.h]=k;});
    const half=(a,lab)=>{let ps=0,ss=0,full=true;const hs=[];for(let i=a;i<a+9;i++){const k=by[i],pr=T.par[i];hs.push({i,k,pr});if(pr)ps+=pr;if(k&&k.v)ss+=k.v;else full=false;}
      return'<tr class="gh"><th class="l">Buca</th>'+hs.map(x=>'<th>'+x.i+'</th>').join("")+'<th>'+lab+'</th></tr>'+
        '<tr class="gp"><td class="l">Par</td>'+hs.map(x=>'<td>'+h(x.pr||"")+'</td>').join("")+'<td>'+(ps||"")+'</td></tr>'+
        '<tr class="gs"><td class="l">Colpi</td>'+hs.map(x=>'<td>'+(x.k&&x.k.v?'<span class="gm '+mark(x.k.rel)+'">'+h(x.k.v)+'</span>':'<span class="dim">·</span>')+'</td>').join("")+'<td><b>'+(full?ss:ss||"")+'</b></td></tr>';};
    const cnt=k=>rr.holes.filter(x=>mark(x.rel)===k).length;
    c.body.innerHTML='<div class="ghead"><span class="tn" style="max-width:none">'+(p.flag?'<img class="flag" src="'+h(p.flag)+'" alt="">':"")+'<b>'+h(p.name)+'</b>'+SL.star("golf","player",p.id,p.name)+'</span><span class="gbig '+(rr.tp<0?"un":rr.tp>0?"ov":"")+'">'+h(fmtPar(rr.tp))+'</span><span class="muted">'+rr.n+'° giro'+(rr.holes.length<18?" · "+rr.holes.length+" buche":" · "+h(rr.v)+" colpi")+'</span></div>'+
      '<div class="scroll"><table class="tbl gsc">'+half(1,"OUT")+half(10,"IN")+'</table></div>'+
      '<div class="glegend"><span><span class="gm eg">3</span> eagle '+cnt("eg")+'</span><span><span class="gm bi">3</span> birdie '+cnt("bi")+'</span><span><span class="gm pa">4</span> par '+cnt("pa")+'</span><span><span class="gm bo">5</span> bogey '+cnt("bo")+'</span><span><span class="gm db">6</span> doppio+ '+cnt("db")+'</span></div>'+
      '<p class="note">Tocca un giocatore in classifica per vedere la sua scorecard.</p>';}
  function drawIta(){const c=cards.ita,T=S.T;if(!T){c.body.innerHTML=UI.empty("Nessun torneo.");return;}
    const I=T.ita;c.sub(I.length?I.length+" in gara":"");
    c.body.innerHTML=I.length?'<div style="display:flex;flex-direction:column;gap:6px">'+I.map(p=>'<div role="button" tabindex="0" class="tmatch ita gita'+(p.id===S.p?" sel":"")+'" data-p="'+h(p.id)+'"><b class="gpos">'+h(p.pos||"–")+'</b><span class="pl w"><span>'+h(p.name)+'</span>'+SL.star("golf","player",p.id,p.name)+'</span><span class="gpar '+(p.score<0?"un":p.score>0?"ov":"")+'"><b>'+h(fmtPar(p.score))+'</b></span><span class="hd" style="grid-column:1/-1">'+h(p.out?(p.out==="CUT"?"Fuori al taglio":"Ritirato"):p.thru==="F"?"Giro finito · oggi "+fmtPar(p.today):p.thru&&p.thru!=="–"?"In campo · buca "+p.thru+" · oggi "+fmtPar(p.today):"")+'</span></div>').join("")+'</div>'
      :'<div class="nolive">'+SL.ico("ita")+'<div>Nessun italiano in questo torneo.</div></div>';}
  function drawNext(){const c=cards.next,now=Date.now();const nx=S.cal.find(x=>new Date(x.start).getTime()>now);
    if(!nx){c.sub("");c.body.innerHTML=UI.empty("Stagione finita: il calendario nuovo non è ancora pubblicato.");return;}
    c.sub(nx.name);c.body.innerHTML=(nx.cat?'<span class="tag big">'+h(nx.cat.n)+'</span> ':"")+'<p class="muted">'+h(SL.fmtDayLong(nx.start))+'</p><div class="cd" data-cd="'+h(nx.start)+'">'+h(SL.countdown(new Date(nx.start)-now))+'</div>';}
  function drawCal(){const c=cards.cal;if(!S.cal.length){c.body.innerHTML=UI.empty("Calendario non disponibile.");return;}
    const now=Date.now(),curId=S.T&&S.T.id;c.sub(S.cal.length+" tornei · "+S.cal.filter(x=>x.cat&&x.cat.k==="major").length+" Major");
    c.body.innerHTML='<div class="scroll"><ul class="feed">'+S.cal.map(x=>{const past=new Date(x.end).getTime()<now;return'<li class="'+(x.id===curId?"goal":"")+'" style="cursor:pointer;'+(past?"opacity:.7":"")+'" data-ce="'+h(x.id)+'" data-dk="'+h(SL.dayKey(x.start))+'"><span class="t">'+h(SL.fmtDay(x.start).replace(/^\w+ /,""))+'</span><span>'+SL.ico(x.cat?"trophy":past?"flag":"golf")+'</span><span class="x">'+h(x.name)+(x.cat?' <span class="tag big">'+h(x.cat.n)+'</span>':"")+'</span></li>';}).join("")+'</ul></div>';
    const sc=c.body.querySelector(".scroll"),cur=c.body.querySelector("li.goal");if(sc&&cur)sc.scrollTop=Math.max(0,cur.offsetTop-sc.offsetTop-40);}
  SL.every(load,()=>S.T&&S.T.live&&!S.dateKey?20000:300000);
  SL.every(()=>{const el=cards.next.body.querySelector("[data-cd]");if(el)el.textContent=SL.countdown(new Date(el.dataset.cd)-Date.now());},1000,{delay:1000});
  SL.onPage("fav",()=>{if(S.T){S.T.P.forEach(p=>{p.fav=favP(p.name);});drawBoard();}});
}
})();
