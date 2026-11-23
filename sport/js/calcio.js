/* Sport LIVE APP — CALCIO
   Multi-partita live, partita, statistiche, momentum, campo con formazioni (2D/3D), mappa tiri con xG stimato,
   eventi, cronaca tradotta, classifica live, Diretta TV. Dati: ESPN. */
(function(){
"use strict";
const h=SL.h,E=SL.espn,V=SL.viz,UI=SL.ui;
const COMPS=SL.cfg.soccer;
const M=SL.sports.calcio={name:"Calcio",tab:"Calcio",icon:"⚽",color:"#2fbf71"};

SL.dayOff=d=>{const k=SL.dayKey(d),t=SL.dayKey(Date.now());const u=s=>Date.UTC(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8));return Math.round((u(k)-u(t))/864e5);};
const compOf=k=>COMPS.find(c=>c.k===k);

/* ---------- home e avvisi ---------- */
function item(ev){
  const sc=ev.state!=="pre";
  return{id:"calcio:"+ev.id,sport:"calcio",comp:ev.comp,date:ev.date,state:ev.state,live:ev.live,done:ev.done,status:ev.status,important:ev.important,ev,
    sig:E.score(ev)+"|"+ev.state+"|"+ev.home.red+ev.away.red,
    lines:[{n:ev.home.name,img:ev.home.logo,v:sc?ev.home.score:"",lose:ev.done&&ev.away.winner},{n:ev.away.name,img:ev.away.logo,v:sc?ev.away.score:"",lose:ev.done&&ev.home.winner}],
    foot:ev.live||ev.done?ev.last:(ev.broadcast||ev.venue),footIco:(ev.live||ev.done)&&ev.last?"calcio":"",
    go:{sport:"calcio",c:ev.compK,e:ev.id,d:SL.dayOff(ev.date)||""}};
}
M.homeFeed=async function(day,ttl){
  const key=SL.dayKey(SL.addDays(Date.now(),day)),out=[],seen=new Set();
  await Promise.all(COMPS.map(async c=>{const l=await E.soccerDay(c,key,ttl);l.forEach(ev=>{if(seen.has(ev.id))return;seen.add(ev.id);out.push(item(ev));});}));
  return out;
};
M.onChange=function(p,it){
  const a=p.ev,b=it.ev,t=b.home.name+" "+E.score(b)+" "+b.away.name;
  const hs=+b.home.score||0,as=+b.away.score||0,ph=+a.home.score||0,pa=+a.away.score||0;
  if(hs>ph||as>pa)return{id:"g:"+b.id+":"+E.score(b),big:"GOL",title:t,text:(hs>ph?b.home.name:b.away.name)+(b.last?" · "+b.last.replace("⚽ ",""):"")+" · "+b.comp,color:"var(--green)"};
  if(hs<ph||as<pa)return{id:"v:"+b.id+":"+E.score(b),big:"VAR",title:t,text:"Gol annullato · "+b.comp,color:"var(--yellow)"};
  if(b.home.red+b.away.red>a.home.red+a.away.red)return{id:"r:"+b.id+":"+(b.home.red+b.away.red),big:"ROSSO",title:t,text:"Espulsione · "+b.comp,color:"var(--red)"};
  if(a.state==="pre"&&b.state==="in")return{id:"k:"+b.id,big:"VIA",title:b.home.name+" – "+b.away.name,text:"Calcio d'inizio · "+b.comp,color:"var(--cyan)"};
  if(a.state==="in"&&b.state==="post")return{id:"f:"+b.id,big:"FINALE",title:t,text:b.comp,color:"var(--muted)"};
  return null;
};

/* ---------- fatti per testata e striscia: capolista, ultimo risultato, prossima partita ---------- */
M.facts=async function(st){
  const ck=st&&st.c;const comp=compOf(ck&&ck!=="all"&&ck!=="live"?ck:"ita.1")||compOf("ita.1");
  const span=comp.multi?[-1,0,1,2]:[-3,-2,-1,0,1,2,3];
  const get=days=>Promise.all(days.map(d=>E.soccerDay(comp,SL.dayKey(SL.addDays(Date.now(),d)),d===0?60000:900000)));
  let all=[].concat(...await get(span));
  if(!all.some(x=>x.done)&&!comp.multi)all=all.concat(...await get([-7,-6,-5,-4]));
  if(!all.some(x=>x.state==="pre")&&!comp.multi)all=all.concat(...await get([4,5,6,7]));
  const done=all.filter(x=>x.done).sort((a,b)=>new Date(b.date)-new Date(a.date)),next=all.filter(x=>x.state==="pre").sort((a,b)=>new Date(a.date)-new Date(b.date));
  const out=[];
  if(!comp.multi&&!/coppa/.test(comp.k)){const d=await SL.tryGet(SL.ESPN2+"soccer/"+comp.k+"/standings",{ttl:600000});const g=d&&E.groups(d);
    if(g&&g.length===1&&g[0].entries.length){const top=g[0].entries.slice().sort((a,b)=>(E.stat(a,"rank")||99)-(E.stat(b,"rank")||99))[0];out.push({l:"Capolista "+comp.n,v:top.team.displayName+" · "+E.stat(top,"points")+" pt"});}}
  const g=ev=>({sport:"calcio",c:comp.k,e:ev.id,d:SL.dayOff(ev.date)||""});
  if(done[0])out.push({l:"Ultimo risultato",v:done[0].home.name+" "+E.score(done[0])+" "+done[0].away.name,go:g(done[0])});
  if(next[0])out.push({l:"Prossima partita",v:next[0].home.name+" – "+next[0].away.name+" · "+SL.when(next[0].date),go:g(next[0])});
  return out;
};

/* ---------- pagina ---------- */
/* ordine per importanza: risultato, momenti chiave, numeri, formazioni, classifica; poi i dettagli */
const DEFS=[
  {k:"tv",n:"Diretta TV",sz:2,fixed:true},
  {k:"match",n:"Partita",sz:2,hero:true},
  {k:"events",n:"Eventi",sz:2},
  {k:"stats",n:"Statistiche",sz:2},
  {k:"pitch",n:"Campo · formazioni",sz:2},
  {k:"table",n:"Classifica live",sz:2},
  {k:"momentum",n:"Momentum",sz:2},
  {k:"shots",n:"Mappa tiri · xG stimato",sz:2,couch:false},
  {k:"cronaca",n:"Cronaca",sz:2,couch:false},
  {k:"multi",n:"Multi-partita live",sz:2}
];
/* in "Live ora" le altre partite in corso sono importanti: subito dopo la partita scelta */
const DEFS_LIVE=DEFS.slice(0,2).concat(DEFS.filter(d=>d.k==="multi"),DEFS.slice(2).filter(d=>d.k!=="multi"));
M.defs=DEFS;
M.mount=function(ctx){
  const st=ctx.st;let compK=st.c||"ita.1";if(compK!=="all"&&compK!=="live"&&!compOf(compK))compK="ita.1";
  const liveMode=compK==="live",day=liveMode?0:(+st.d||0);
  const dayKey=SL.dayKey(SL.addDays(Date.now(),day));
  /* sottobarra */
  const r1=document.createElement("div");r1.className="row";
  const liveBy={};(SL.live.bySport.calcio||[]).forEach(x=>{if(x.live)liveBy[x.ev.compK]=(liveBy[x.ev.compK]||0)+1;});
  r1.appendChild(UI.chips([UI.liveChip("calcio"),{k:"all",n:"Tutte",live:Object.keys(liveBy).length>0}].concat(COMPS.map(c=>({k:c.k,n:c.n,live:!!liveBy[c.k]}))),compK,v=>SL.go({c:v,e:"",d:""})));
  const r2=document.createElement("div");r2.className="row";
  if(liveMode)r2.appendChild(UI.liveNote("Solo le partite in corso adesso, in tutte le competizioni. Si aggiorna da sola."));
  else r2.appendChild(UI.daynav(day,v=>SL.go({d:v||"",e:""})));
  const nextBox=document.createElement("span");nextBox.className="muted";r2.appendChild(nextBox);
  const strip=document.createElement("div");strip.className="strip";strip.setAttribute("aria-label","Partite");
  ctx.sub.append(r1,r2,strip);
  const cards=UI.mount(ctx.main,liveMode?DEFS_LIVE:DEFS);
  UI.tv(cards.tv,"calcio");

  const S={evs:[],sel:st.e||"",sum:null,table:null,tableLg:null,timerM:null,pitchMode:SL.store.get("pitchMode","2d"),cron:"all",shotsT:"both"};
  /* comandi nelle intestazioni */
  UI.seg(cards.pitch,[["2d","2D"],["3d","3D"]],S.pitchMode,v=>{S.pitchMode=v;SL.store.set("pitchMode",v);drawPitch(true);});
  UI.seg(cards.cronaca,[["all","Tutto"],["key","Azioni"]],"all",v=>{S.cron=v;drawCronaca();});

  strip.addEventListener("click",e=>{const b=e.target.closest(".mtile");if(b)select(b.dataset.ev);});
  cards.multi.body.addEventListener("click",e=>{const b=e.target.closest(".mrow");if(b)select(b.dataset.ev);});
  SL.onPage("flash",id=>{if(!/^calcio:/.test(id))return;const ev=id.slice(7);document.querySelectorAll('[data-ev="'+CSS.escape(ev)+'"]').forEach(t=>{t.classList.remove("flash");void t.offsetWidth;t.classList.add("flash");});});
  SL.onPage("fav",()=>{S.evs.forEach(ev=>{ev.fav=E.isFav(ev);ev.important=ev.fav||ev.ita;});drawStrip();});
  SL.onPage("resize",()=>{drawMomentum();drawShots();});

  const sel=()=>S.evs.find(x=>x.id===S.sel);
  function select(id){if(id===S.sel)return;S.sel=id;SL.setQuiet({e:id});drawStrip();drawMulti();S.sum=null;["match","stats","momentum","pitch","shots","events","cronaca"].forEach(k=>cards[k].body.innerHTML='<div class="loading">Carico</div>');loadMatch(true);loadTable();}

  /* tabellone del giorno */
  async function loadBoard(){
    const list=compK==="all"||liveMode?COMPS:[compOf(compK)],all=[],seen=new Set();
    await Promise.all(list.map(async c=>{const l=await E.soccerDay(c,dayKey,15000);l.forEach(ev=>{if(!seen.has(ev.id)){seen.add(ev.id);all.push(ev);}});}));
    S.day=all;
    /* "Live ora": solo le partite in corso; quella che stai guardando resta finché non ne scegli un'altra */
    S.evs=E.sort(liveMode?all.filter(x=>x.live||(x.id===S.sel&&x.done)):all);
    if(!S.sel||!sel()){const pick=S.evs.find(x=>x.live&&x.important)||S.evs.find(x=>x.live)||S.evs.find(x=>x.important&&!x.done)||S.evs.find(x=>x.state==="pre")||S.evs[S.evs.length-1];S.sel=pick?pick.id:"";if(S.sel)SL.setQuiet({e:S.sel});}
    drawStrip();drawMulti();
    if(liveMode)nextBox.innerHTML=S.evs.some(x=>x.live)?"":nextKick();
    else if(!S.evs.length)await nextDate();else nextBox.textContent="";
    if(S.table)drawTable();
  }
  async function nextDate(){
    const c=compK==="all"?COMPS[0]:compOf(compK);const lg=(c.multi||[c.k])[0];
    const d=await SL.tryGet(SL.ESPN+"soccer/"+lg+"/scoreboard?dates="+dayKey,{ttl:36e5});
    const cal=(d&&d.leagues&&d.leagues[0]&&d.leagues[0].calendar)||[];
    const now=SL.addDays(Date.now(),day).getTime();const nx=cal.map(x=>typeof x==="string"?x:x.startDate).filter(Boolean).find(x=>new Date(x).getTime()>now-6*36e5&&SL.dayOff(x)>day);
    nextBox.innerHTML=nx?'Nessuna partita in questo giorno. <button type="button" class="btn">Prossime: '+h(SL.fmtDay(nx))+' →</button>':"Nessuna partita in programma.";
    const b=nextBox.querySelector("button");if(b)b.onclick=()=>SL.go({d:SL.dayOff(nx)||"",e:""});
  }
  function drawStrip(){strip.innerHTML=S.evs.length?S.evs.map(ev=>E.tile(ev,S.sel)).join(""):"";const b=strip.querySelector('[aria-pressed="true"]');if(b&&b.scrollIntoViewIfNeeded)b.scrollIntoViewIfNeeded();}
  function nextKick(){const n=(S.day||[]).filter(x=>x.state==="pre").sort((a,b)=>new Date(a.date)-new Date(b.date))[0];
    return n?"Nessuna partita in corso. La prossima: <b>"+h(n.home.name+" – "+n.away.name)+"</b> alle "+h(SL.fmtTime(n.date))+" ("+h(n.comp)+").":"Nessuna partita in corso e nessun'altra in programma oggi.";}
  function drawMulti(){
    const c=cards.multi,evs=S.evs;const live=evs.filter(x=>x.live).length;
    c.sub(live?live+" in diretta":evs.length?evs.length+" partite":"");
    if(liveMode&&!live&&!evs.length){c.body.innerHTML='<div class="nolive">'+SL.ico("calcio")+'<div>'+nextKick()+'</div></div>';return;}
    if(!evs.length){c.body.innerHTML=UI.empty("Nessuna partita in questo giorno per "+(compK==="all"?"le competizioni seguite":h(compOf(compK).n))+".");return;}
    const groups={};evs.forEach(ev=>{(groups[ev.comp]=groups[ev.comp]||[]).push(ev);});
    let s='<div class="mlist">';
    Object.keys(groups).forEach(g=>{if(compK==="all"||Object.keys(groups).length>1)s+='<div class="grp-h">'+h(g)+'</div>';
      groups[g].forEach(ev=>{const sc=ev.state!=="pre";
        s+='<button type="button" class="mrow'+(ev.id===S.sel?" sel":"")+'" data-ev="'+ev.id+'"><span class="min'+(ev.live?" live":"")+'">'+h(ev.live?ev.clock:ev.done?"FIN":SL.fmtTime(ev.date))+'</span>'+
          '<span class="tt"><img class="logo-t" src="'+h(ev.home.logo)+'" alt="" loading="lazy"><span>'+h(ev.home.name)+'</span>'+(ev.home.red?'<i class="rc"></i>'.repeat(ev.home.red):"")+'</span><span class="s">'+(sc?h(ev.home.score):"")+'</span>'+
          '<span class="min" style="grid-row:auto;display:none"></span><span class="tt"><img class="logo-t" src="'+h(ev.away.logo)+'" alt="" loading="lazy"><span>'+h(ev.away.name)+'</span>'+(ev.away.red?'<i class="rc"></i>'.repeat(ev.away.red):"")+'</span><span class="s">'+(sc?h(ev.away.score):"")+'</span>'+
          (ev.last&&(ev.live||ev.done)?'<span class="last">'+SL.ico("calcio")+" "+h(ev.last)+'</span>':"")+'</button>';});});
    c.body.innerHTML=s+"</div>";
  }

  /* partita selezionata */
  async function loadMatch(first){
    const ev=sel();if(!ev){["match","stats","momentum","pitch","shots","events","cronaca"].forEach(k=>cards[k].body.innerHTML=UI.empty(liveMode?"Nessuna partita in corso adesso: appena ne inizia una compare qui.":"Scegli una partita."));return;}
    try{S.sum=await E.summary("soccer",ev.league,ev.id,ev.live?8000:600000);}catch(e){if(first)cards.match.body.innerHTML=UI.empty("Dati della partita non disponibili ora. Riprovo tra poco.");return;}
    S.xg=null;
    drawMatch();drawStats();drawMomentum();drawPitch(first);drawShots();drawEvents();drawCronaca();
  }
  function teamsOf(){const ev=sel(),sum=S.sum||{},hc=((sum.header||{}).competitions||[{}])[0],cs=hc.competitors||[];
    const H=cs.find(c=>c.homeAway==="home")||{},A=cs.find(c=>c.homeAway==="away")||{};
    const [ch,ca]=V.pair(ev.home.color,ev.away.color);
    return{ev,hc,H,A,hid:String((H.team||{}).id||ev.home.id),aid:String((A.team||{}).id||ev.away.id),hn:ev.home.name,an:ev.away.name,
      hdn:(H.team||{}).displayName||ev.home.name,adn:(A.team||{}).displayName||ev.away.name,ch,ca};}
  const sideOf=(T,team)=>{if(!team)return null;const id=String(team.id||""),n=team.displayName||team.name||"";if(id&&id===T.hid||n&&n===T.hdn)return"h";if(id&&id===T.aid||n&&n===T.adn)return"a";return null;};

  function drawMatch(){
    const c=cards.match,T=teamsOf(),ev=T.ev,sum=S.sum||{};
    const st=(T.hc.status||{}).type||{};const state=st.state||ev.state;
    const clk=state==="in"?'<span class="tag live">'+h(SL.tr.status(st.shortDetail)||ev.clock)+'</span>':state==="post"?'<span class="tag">'+h(SL.tr.status(st.description)||"Finale")+'</span>':'<span class="tag">'+h(SL.when(ev.date))+'</span>';
    const sc=state!=="pre";
    const tm=(t,side)=>'<div class="tm">'+(t.logo?'<img src="'+h(t.logo)+'" alt="">':"")+'<div class="nm">'+h(t.name)+' '+SL.star("calcio","team",t.id,t.name)+'</div><div class="rec">'+h(form(side))+'</div></div>';
    const goals=(sum.keyEvents||[]).filter(k=>k.scoringPlay);
    const gl=w=>goals.filter(k=>sideOf(T,k.team)===w).map(k=>{const p=(k.participants||[])[0];const og=/own goal/i.test(k.type&&k.type.text||"")||/Own Goal/i.test(k.text||"");const pen=/penalty/i.test(k.type&&k.type.text||"")||/\(penalty\)/i.test(k.text||"");
      return h((p&&p.athlete&&p.athlete.displayName)||"")+" "+h(k.clock&&k.clock.displayValue||"")+(pen?" (rig.)":"")+(og?" (aut.)":"");}).join("<br>");
    const poss=statOf("possessionPct");
    let s='<div class="bug">'+tm(ev.home,"h")+'<div class="mid"><div class="score">'+(sc?h(ev.home.score)+'<i>–</i>'+h(ev.away.score):'<span style="font-size:.55em">'+h(SL.fmtTime(ev.date))+'</span>')+'</div><div class="clk">'+clk+'</div></div>'+tm(ev.away,"a")+'</div>';
    if(goals.length)s+='<div class="scorers"><div>'+gl("h")+'</div><div>'+gl("a")+'</div></div>';
    if(poss&&poss.h!=null)s+='<div class="stat" style="margin-top:12px"><span class="v">'+poss.h+'%</span><span class="lab">Possesso palla</span><span class="v r">'+poss.a+'%</span><div class="bar"><i style="width:'+poss.h+'%;background:'+T.ch+'"></i><i style="width:'+poss.a+'%;background:'+T.ca+'"></i></div></div>';
    if(state==="pre"){const ms=new Date(ev.date)-Date.now();s+='<p class="note" style="text-align:center">Calcio d\'inizio tra <b class="cdown">'+h(SL.countdown(ms))+'</b></p>';}
    const gi=sum.gameInfo||{},ven=(gi.venue&&gi.venue.fullName)||ev.venue,att=gi.attendance;
    const off=(gi.officials||[]).find(o=>/referee/i.test(o.position&&o.position.name||o.order||"")||o.order===1);
    s+='<p class="note" style="text-align:center">'+[ev.comp,ven,att?"Spettatori "+Number(att).toLocaleString("it-IT"):"",off?"Arbitro "+off.displayName:"",ev.broadcast?"TV: "+ev.broadcast:""].filter(Boolean).map(h).join(" · ")+'</p>';
    c.body.innerHTML=s;c.sub(ev.comp);
  }
  function form(side){const sum=S.sum||{},T=teamsOf();const lf=(sum.lastFiveGames||[]).find(x=>String((x.team||{}).id)===(side==="h"?T.hid:T.aid));
    if(!lf||!lf.events)return(side==="h"?T.ev.home.rec:T.ev.away.rec)||"";
    return"Forma: "+lf.events.slice(0,5).map(e=>({W:"V",D:"N",L:"P"}[e.gameResult]||e.gameResult||"")).join(" ");}
  function statOf(name){const T=teamsOf(),bt=((S.sum||{}).boxscore||{}).teams||[];const o={h:null,a:null};
    bt.forEach(t=>{const w=sideOf(T,t.team)||(t.homeAway==="home"?"h":t.homeAway==="away"?"a":null);const s=(t.statistics||[]).find(x=>x.name===name);if(w&&s)o[w]=s.displayValue!=null?s.displayValue:s.value;});
    return o.h==null&&o.a==null?null:o;}

  /* statistiche */
  const STATS=[["possessionPct","Possesso %"],["totalShots","Tiri"],["shotsOnTarget","Tiri in porta"],["xg","xG stimato"],["blockedShots","Tiri respinti"],["wonCorners","Calci d'angolo"],
    ["saves","Parate"],["totalPasses","Passaggi"],["passPct","Precisione passaggi"],["accurateCrosses","Cross riusciti"],["effectiveTackles","Contrasti vinti"],["interceptions","Intercetti"],
    ["effectiveClearance","Respinte"],["offsides","Fuorigioco"],["foulsCommitted","Falli"],["yellowCards","Ammonizioni"],["redCards","Espulsioni"]];
  function drawStats(){
    const c=cards.stats,T=teamsOf();
    if(!((S.sum||{}).boxscore||{}).teams||!statOf("totalShots")){c.body.innerHTML=UI.empty(T.ev.state==="pre"?"Le statistiche arrivano con il calcio d'inizio.":"Statistiche non disponibili per questa partita.");c.sub("");return;}
    const xg=shotsData().xg;
    let s="";STATS.forEach(([k,lab])=>{let o;
      if(k==="xg")o={h:xg.h.toFixed(2),a:xg.a.toFixed(2)};else o=statOf(k);if(!o)return;
      let a=parseFloat(o.h)||0,b=parseFloat(o.a)||0,da=o.h,db=o.a;
      if(k==="passPct"){if(a<=1&&b<=1){a*=100;b*=100;}da=Math.round(a)+"%";db=Math.round(b)+"%";}
      const tot=a+b||1;
      s+='<div class="stat"><span class="v">'+h(da)+'</span><span class="lab">'+h(lab)+(k==="xg"?" *":"")+'</span><span class="v r">'+h(db)+'</span><div class="bar"><i style="width:'+(a/tot*100).toFixed(1)+'%;background:'+T.ch+'"></i><i style="width:'+(b/tot*100).toFixed(1)+'%;background:'+T.ca+'"></i></div></div>';});
    c.body.innerHTML='<div class="legend" style="margin:0 0 10px"><span><i style="background:'+T.ch+'"></i>'+h(T.hn)+'</span><span><i style="background:'+T.ca+'"></i>'+h(T.an)+'</span></div><div class="stats2">'+s+'</div><p class="note">* xG stimato: calcolato da noi su posizione e angolo dei tiri, non è il dato ufficiale.</p>';
    c.sub(T.hn+" – "+T.an);
  }

  /* tiri ed xG stimato (modello semplice: distanza e angolo della porta) */
  function xgOf(p){const X=+p.fieldPositionX,Y=+p.fieldPositionY;if(!(X>=0)||!(Y>=0))return .05;
    const txt=(p.text||"")+" "+(p.type&&p.type.text||"");if(/penalty/i.test(txt)&&!/penalty area/i.test(txt))return .76;
    const dx=(100-X)*1.05,dy=(Y-50)*.68,d=Math.sqrt(dx*dx+dy*dy)||.5,ang=Math.atan2(7.32*dx,dx*dx+dy*dy-3.66*3.66);const a=ang<0?ang+Math.PI:ang;
    let z=-1.1+1.6*a-.09*d;if(/header/i.test(txt))z-=.55;if(/very close range/i.test(txt))z+=.25;if(/direct free kick/i.test(txt))z-=.3;
    return Math.max(.01,Math.min(.95,1/(1+Math.exp(-z))));}
  function shotsData(){
    if(S.xg&&S.xg.sum===S.sum)return S.xg;
    const T=teamsOf(),out={shots:[],xg:{h:0,a:0},n:{h:0,a:0},on:{h:0,a:0},sum:S.sum};
    const plays=((S.sum||{}).commentary||[]).map(c=>c.play).filter(Boolean);
    const seen=new Set();
    plays.forEach(p=>{const t=(p.type&&p.type.type)||"";if(!/^shot|^goal/.test(t)||seen.has(p.id))return;seen.add(p.id);
      const w=sideOf(T,p.team)||(p.text&&p.text.indexOf("("+T.hdn+")")>=0?"h":p.text&&p.text.indexOf("("+T.adn+")")>=0?"a":null);if(!w)return;
      if(/own goal/i.test(p.text||""))return;
      const goal=/^goal/.test(t),xg=xgOf(p);out.xg[w]+=xg;out.n[w]++;if(goal||t==="shot-on-target")out.on[w]++;
      out.shots.push({w,X:+p.fieldPositionX,Y:+p.fieldPositionY,goal,kind:goal?"goal":t,xg,min:(p.clock&&p.clock.displayValue)||"",who:((p.participants||[])[0]||{}).athlete?p.participants[0].athlete.displayName:"",text:p.text});});
    S.xg=out;return out;}
  function drawShots(){
    const c=cards.shots;if(!c.shown)return;const T=teamsOf(),D=shotsData();
    if(!D.shots.length){c.body.innerHTML=UI.empty(T.ev.state==="pre"?"I tiri compaiono qui durante la partita.":"Nessun tiro con posizione disponibile.");c.sub("");return;}
    let dots="";
    D.shots.sort((a,b)=>a.goal-b.goal).forEach(s=>{if(!(s.X>=0))return;let x=s.X*1.05,y=s.Y*.68;if(s.w==="a"){x=105-x;y=68-y;}
      const col=s.w==="h"?T.ch:T.ca,r=(1.1+Math.sqrt(s.xg)*3.4).toFixed(2);
      const fill=s.goal?col:s.kind==="shot-on-target"?col:"none",op=s.kind==="shot-blocked"?.55:1;
      dots+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r+'" fill="'+fill+'" fill-opacity="'+(s.goal?1:.55)+'" stroke="'+(s.goal?"#fff":col)+'" stroke-width="'+(s.goal?.6:.4)+'" opacity="'+op+'"><title>'+h(s.min+" "+s.who+" · xG "+s.xg.toFixed(2)+(s.goal?" · GOL":""))+'</title></circle>';
      if(s.goal)dots+='<text x="'+x.toFixed(1)+'" y="'+(y-+r-.8).toFixed(1)+'" font-size="2.6" fill="#fff" text-anchor="middle" class="svgtxt">'+h(s.min)+'</text>';});
    const lab='<text x="2" y="66" font-size="2.6" fill="#fff" opacity=".8" class="svgtxt">← '+h(T.an)+'</text><text x="103" y="66" font-size="2.6" fill="#fff" opacity=".8" text-anchor="end" class="svgtxt">'+h(T.hn)+' →</text>';
    c.body.innerHTML=V.pitch(dots+lab,{label:"Mappa dei tiri"})+
      '<div class="legend"><span><i style="background:'+T.ch+'"></i>'+h(T.hn)+': '+D.n.h+' tiri, '+D.on.h+' in porta, xG '+D.xg.h.toFixed(2)+'</span><span><i style="background:'+T.ca+'"></i>'+h(T.an)+': '+D.n.a+' tiri, '+D.on.a+' in porta, xG '+D.xg.a.toFixed(2)+'</span></div>'+
      '<p class="note">Cerchio pieno = in porta, vuoto = fuori, chiaro = respinto, bordo bianco = gol. Più grande = occasione migliore (xG stimato da noi, non ufficiale).</p>';
    c.sub("xG "+D.xg.h.toFixed(2)+" – "+D.xg.a.toFixed(2));
  }

  /* momentum: pressione offensiva minuto per minuto */
  const W={"goal":6,"shot-on-target":3,"shot-off-target":1.5,"shot-blocked":1.2,"corner-awarded":1,"offside":.4};
  function drawMomentum(){
    const c=cards.momentum;if(!c.shown)return;const T=teamsOf(),com=(S.sum||{}).commentary||[];
    const plays=com.map(x=>x.play).filter(p=>p&&p.clock);
    if(!plays.length){c.body.innerHTML=UI.empty(T.ev.state==="pre"?"Il grafico si riempie durante la partita.":"Dati azione per azione non disponibili.");c.sub("");return;}
    const last=Math.max(90,...plays.map(p=>Math.ceil((+p.clock.value||0)/60)));
    const raw=new Array(last+2).fill(0);const goals=[];
    plays.forEach(p=>{const t=(p.type&&p.type.type)||"",m=Math.min(last,Math.floor((+p.clock.value||0)/60));
      let w=0;if(/^goal/.test(t))w=W.goal;else if(W[t]!=null)w=W[t];else if(t==="foul"&&/attacking half/.test(p.text||""))w=.5;
      if(!w)return;
      let side=sideOf(T,p.team);
      if(t==="corner-awarded"){const m2=(p.text||"").match(/^Corner,\s*(.+?)\./);if(m2)side=m2[1]===T.hdn?"h":m2[1]===T.adn?"a":side;}
      if(t==="foul"){const m3=(p.text||"").match(/\((.+?)\) wins a free kick/);if(m3)side=m3[1]===T.hdn?"h":m3[1]===T.adn?"a":null;}
      if(!side)return;raw[m]+=side==="h"?w:-w;if(/^goal/.test(t))goals.push({m,side,txt:(p.clock&&p.clock.displayValue)||""});});
    const sm=raw.map((_,i)=>{let s=0,n=0;for(let k=Math.max(0,i-4);k<=i;k++){const wt=Math.exp(-(i-k)/2.2);s+=raw[k]*wt;n+=wt;}return s/n;});
    const mx=Math.max(1,...sm.map(Math.abs)),Wd=600,Hd=170,mid=Hd/2,bw=Wd/(last+1);
    const curMin=T.ev.live?Math.min(last,Math.floor(Math.max(...plays.map(p=>+p.clock.value||0))/60)):last;
    let bars="";sm.forEach((v,i)=>{if(i>curMin)return;const hh=Math.abs(v)/mx*(mid-14);if(hh<.5)return;bars+='<rect x="'+(i*bw).toFixed(1)+'" y="'+(v>0?mid-hh:mid).toFixed(1)+'" width="'+Math.max(1,bw-1).toFixed(1)+'" height="'+hh.toFixed(1)+'" fill="'+(v>0?T.ch:T.ca)+'" opacity=".9"/>';});
    let marks='<line x1="0" x2="'+Wd+'" y1="'+mid+'" y2="'+mid+'" stroke="var(--line)"/><line x1="'+(45*bw)+'" x2="'+(45*bw)+'" y1="6" y2="'+(Hd-6)+'" stroke="var(--dim)" stroke-dasharray="3 4"/><text x="'+(45*bw+4)+'" y="'+(Hd-6)+'" fill="var(--dim)" font-size="10" class="svgtxt">INT</text>';
    goals.forEach(g=>{const x=(g.m+.5)*bw,y=g.side==="h"?12:Hd-6;marks+='<line x1="'+x+'" x2="'+x+'" y1="'+(g.side==="h"?16:mid)+'" y2="'+(g.side==="h"?mid:Hd-16)+'" stroke="#fff" stroke-width="1" opacity=".6"/><use href="#i-calcio" x="'+(x-6.5)+'" y="'+(y-10)+'" width="13" height="13" color="#fff"/>';});
    [15,30,60,75,90].forEach(m=>{marks+='<text x="'+(m*bw)+'" y="'+(mid+12)+'" fill="var(--dim)" font-size="9" text-anchor="middle" class="svgtxt" opacity=".7">'+m+"'</text>";});
    c.body.innerHTML='<svg viewBox="0 0 '+Wd+' '+Hd+'" width="100%" role="img" aria-label="Momentum della partita" style="height:auto">'+bars+marks+'</svg>'+
      '<div class="legend"><span><i style="background:'+T.ch+'"></i>'+h(T.hn)+' (sopra)</span><span><i style="background:'+T.ca+'"></i>'+h(T.an)+' (sotto)</span></div>'+
      '<p class="note">Pressione offensiva da tiri, gol, angoli e punizioni nella metà campo avversaria, media sugli ultimi minuti.</p>';
    const rec=sm.slice(Math.max(0,curMin-9),curMin+1).reduce((a,b)=>a+b,0);
    c.sub(T.ev.live?(Math.abs(rec)<1?"Equilibrio":"Ultimi 10': spinge "+(rec>0?T.hn:T.an)):"");
  }

  /* campo con formazioni */
  const DEPTH=p=>{p=(p||"").toUpperCase();if(p==="G"||p==="GK")return 0;if(/WB/.test(p))return 1.6;if(/^(CD|CB|D|SW|LB|RB|RCB|LCB)/.test(p))return 1;if(/^DM/.test(p))return 2;if(/^AM/.test(p))return 4;if(/^(LW|RW)/.test(p))return 4.6;if(/^(F|CF|ST|S)/.test(p))return 5;if(/^(M|CM|LM|RM)/.test(p))return 3;return 3;};
  const LAT=p=>{p=(p||"").toUpperCase();if(/-L$|^L/.test(p))return-1;if(/-R$|^R/.test(p))return 1;if(/-CL$/.test(p))return-.4;if(/-CR$/.test(p))return.4;return 0;};
  function lineup(r){
    const starters=(r.roster||[]).filter(p=>p.starter);if(!starters.length)return null;
    const gk=starters.filter(p=>DEPTH(p.position&&p.position.abbreviation)===0),rest=starters.filter(p=>DEPTH(p.position&&p.position.abbreviation)!==0);
    rest.sort((a,b)=>DEPTH(a.position&&a.position.abbreviation)-DEPTH(b.position&&b.position.abbreviation)||(+a.formationPlace||0)-(+b.formationPlace||0));
    let counts=String(r.formation||"").split("-").map(Number).filter(n=>n>0);
    if(counts.reduce((a,b)=>a+b,0)!==rest.length){counts=[];let cur=null;rest.forEach(p=>{const d=Math.round(DEPTH(p.position&&p.position.abbreviation));if(d!==cur){counts.push(0);cur=d;}counts[counts.length-1]++;});}
    const lines=[gk.slice(0,1)];let i=0;counts.forEach(n=>{lines.push(rest.slice(i,i+n).sort((a,b)=>LAT(a.position&&a.position.abbreviation)-LAT(b.position&&b.position.abbreviation)));i+=n;});
    return{lines,formation:r.formation||counts.join("-"),bench:(r.roster||[]).filter(p=>!p.starter)};
  }
  function marks(){const T=teamsOf(),o={};const ke=(S.sum||{}).keyEvents||[];
    const add=(n,k,v)=>{if(!n)return;(o[n]=o[n]||{g:0,y:0,r:0,out:"",inn:""});if(k==="g")o[n].g++;else if(k==="y")o[n].y++;else if(k==="r")o[n].r++;else o[n][k]=v;};
    ke.forEach(k=>{const t=(k.type&&k.type.type)||"",p=(k.participants||[]).map(x=>x.athlete&&x.athlete.displayName),m=(k.clock&&k.clock.displayValue)||"";
      if(k.scoringPlay&&!/own/i.test(t))add(p[0],"g");
      if(/yellow/.test(t))add(p[0],"y");if(/red/.test(t))add(p[0],"r");
      if(/substitution/.test(t)){const mm=(k.text||"").match(/\.\s*(.+?) replaces (.+?)(?: because|\.|$)/);if(mm){add(mm[2].trim(),"out",m);add(mm[1].trim(),"inn",m);}else{add(p[0],"inn",m);add(p[1],"out",m);}}});
    return o;}
  function rosters(){const T=teamsOf(),rs=(S.sum||{}).rosters||[];let H=null,A=null;
    rs.forEach(r=>{const w=r.homeAway==="home"?"h":r.homeAway==="away"?"a":sideOf(T,r.team);if(w==="h")H=r;else if(w==="a")A=r;});return{H,A};}
  function positions(L,side){
    /* casa a sinistra attacca verso destra; ospiti specchiati */
    const n=L.lines.length,out=[];
    L.lines.forEach((line,li)=>{const x=li===0?3.5:6+li*(44/Math.max(1,n-1));
      line.forEach((p,j)=>{let y=(j+1)*68/(line.length+1);if(side==="a"){y=68-y;}out.push({p,x:side==="h"?x:105-x,y,up:li%2===1});});});
    return out;}
  let pitch3D=null;
  async function drawPitch(force){
    const c=cards.pitch;if(!c.shown)return;const T=teamsOf(),{H,A}=rosters();
    const LH=H&&lineup(H),LA=A&&lineup(A);
    if(!LH&&!LA){c.body.innerHTML=UI.empty(T.ev.state==="pre"?"Le formazioni ufficiali arrivano circa un'ora prima del calcio d'inizio.":"Formazioni non disponibili.");c.sub("");return;}
    c.sub((LH?T.hn+" "+LH.formation:"")+(LA?"  ·  "+T.an+" "+LA.formation:""));
    const mk=marks();
    const P=[].concat(LH?positions(LH,"h").map(o=>Object.assign(o,{w:"h"})):[],LA?positions(LA,"a").map(o=>Object.assign(o,{w:"a"})):[]);
    if(S.pitchMode==="3d"&&V.can3D()){
      if(pitch3D&&!force&&pitch3D.key===S.sel){pitch3D.update(P,mk);return;}
      try{await draw3D(c,P,mk,T);}catch(e){console.warn(e);S.pitchMode="2d";c.body.innerHTML='<p class="note">3D non disponibile su questo dispositivo.</p>';drawPitch(true);}
      return;}
    pitch3D=null;
    let s="";
    P.forEach(o=>{const a=o.p.athlete||{},n=a.shortName||a.displayName||"",col=o.w==="h"?T.ch:T.ca,m=mk[a.displayName]||{};
      const last=(a.lastName||n.split(" ").pop()||"").slice(0,11);
      s+='<g transform="translate('+o.x.toFixed(1)+' '+o.y.toFixed(1)+')"'+(m.out?' opacity=".7"':"")+'><circle r="2.7" fill="'+col+'" stroke="#0b0f19" stroke-width=".35"/><text y=".95" font-size="2.5" text-anchor="middle" fill="'+(contrast(col))+'" class="svgtxt">'+h(o.p.jersey||"")+'</text>'+
        '<text y="'+(o.up?-3.6:5.3)+'" font-size="1.95" text-anchor="middle" fill="#fff" class="svgtxt" style="paint-order:stroke;stroke:#000a;stroke-width:.6">'+h(last)+'</text>'+
        (m.g?Array.from({length:Math.min(m.g,3)},(_,i)=>'<use href="#i-calcio" x="'+(2.2+i*2.4)+'" y="-4.6" width="2.4" height="2.4" color="#fff"/>').join(""):"")+
        (m.r?'<rect x="-3.9" y="-3.6" width="1.5" height="2.1" fill="#ef4444" rx=".2"/>':m.y?'<rect x="-3.9" y="-3.6" width="1.5" height="2.1" fill="#f2c230" rx=".2"/>':"")+
        (m.out?'<text x="2.5" y="3.4" font-size="2" fill="#ef4444" class="svgtxt">▼'+h(m.out)+'</text>':"")+'</g>';});
    const bench=(L,mkr)=>L?L.bench.map(p=>{const a=p.athlete||{},m=mkr[a.displayName]||{};return'<div'+(m.inn?' class="in"':"")+'>'+h((p.jersey||"")+" "+(a.displayName||""))+(m.inn?" ▲"+h(m.inn):"")+(m.g?" "+SL.ico("calcio"):"")+'</div>';}).join(""):"";
    c.body.innerHTML=V.pitch(s,{label:"Formazioni"})+'<div class="bench"><div><h4>PANCHINA '+h(T.hn.toUpperCase())+'</h4>'+bench(LH,mk)+'</div><div><h4>PANCHINA '+h(T.an.toUpperCase())+'</h4>'+bench(LA,mk)+'</div></div>';
  }
  function contrast(hex){const n=parseInt(String(hex).slice(1),16);const l=.299*(n>>16)+.587*(n>>8&255)+.114*(n&255);return l>150?"#0b0f19":"#ffffff";}
  async function draw3D(c,P,mk,T){
    const sc=await V.scene(c.body,{r:105,ph:.92,th:-.5,hud:"Trascina per ruotare · rotella per zoom",shadow:70});
    const {T:THREE,scene,ticks}=sc;
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(150,110),new THREE.MeshStandardMaterial({color:0x0d2a18,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.05;ground.receiveShadow=true;scene.add(ground);
    const pm=new THREE.Mesh(new THREE.PlaneGeometry(107,70),new THREE.MeshStandardMaterial({map:V.pitchTexture(THREE),roughness:.95}));pm.rotation.x=-Math.PI/2;pm.receiveShadow=true;scene.add(pm);
    /* tribune */
    const standM=new THREE.MeshStandardMaterial({color:0x1a2236,roughness:.9});
    [[0,-46,130,8],[0,46,130,8],[-66,0,8,84],[66,0,8,84]].forEach(([x,z,w,d])=>{const g=new THREE.Mesh(new THREE.BoxGeometry(w,6,d),standM);g.position.set(x,3,z);g.castShadow=true;g.receiveShadow=true;scene.add(g);
      const rows=new THREE.Mesh(new THREE.BoxGeometry(w-2,.3,d-2),new THREE.MeshStandardMaterial({color:0x2b3756,emissive:0x0a1430}));rows.position.set(x,6.2,z);scene.add(rows);});
    /* porte */
    const postM=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.3});
    [-52.5,52.5].forEach(x=>{[-3.66,3.66].forEach(z=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,2.44,8),postM);p.position.set(x,1.22,z);scene.add(p);});
      const bar=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,7.32,8),postM);bar.rotation.x=Math.PI/2;bar.position.set(x,2.44,0);scene.add(bar);});
    /* torri faro */
    [[-60,-42],[60,-42],[-60,42],[60,42]].forEach(([x,z])=>{const t=new THREE.Mesh(new THREE.CylinderGeometry(.4,.6,26,8),standM);t.position.set(x,13,z);scene.add(t);
      const l=new THREE.Mesh(new THREE.BoxGeometry(4,2,.6),new THREE.MeshBasicMaterial({color:0xfff6d8}));l.position.set(x,26,z);l.lookAt(0,0,0);scene.add(l);});
    const group=new THREE.Group();scene.add(group);
    const ball=new THREE.Mesh(new THREE.SphereGeometry(.45,16,12),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.4}));ball.position.set(0,.45,0);ball.castShadow=true;scene.add(ball);
    const build=(P,mk)=>{while(group.children.length){const o=group.children.pop();o.traverse&&o.traverse(x=>{x.geometry&&x.geometry.dispose();x.material&&x.material.map&&x.material.map.dispose();});}
      P.forEach(o=>{const a=o.p.athlete||{},col=o.w==="h"?T.ch:T.ca,m=mk[a.displayName]||{},isGK=o.p.position&&/^G/.test(o.p.position.abbreviation||"");
        const g=new THREE.Group();const mat=new THREE.MeshStandardMaterial({color:isGK?0x111111:col,roughness:.55,metalness:.05,emissive:isGK?0x000000:col,emissiveIntensity:.12});
        const body=new THREE.Mesh(new THREE.CylinderGeometry(.75,.6,2.6,14),mat);body.position.y=1.9;body.castShadow=true;g.add(body);
        const head=new THREE.Mesh(new THREE.SphereGeometry(.52,14,10),new THREE.MeshStandardMaterial({color:0xe0b892,roughness:.7}));head.position.y=3.7;head.castShadow=true;g.add(head);
        const legs=new THREE.Mesh(new THREE.CylinderGeometry(.5,.35,1.1,10),new THREE.MeshStandardMaterial({color:0x0b0f19}));legs.position.y=.55;g.add(legs);
        const ring=new THREE.Mesh(new THREE.RingGeometry(1.2,1.5,24),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.6}));ring.rotation.x=-Math.PI/2;ring.position.y=.03;g.add(ring);
        const tag=V.label(THREE,(o.p.jersey||"")+" "+((a.lastName||a.displayName||"").toUpperCase().slice(0,11))+(m.g?" ⚽":"")+(m.r?" 🟥":m.y?" 🟨":""),{w:512,h:96,size:46,bg:"rgba(5,8,15,.78)",sx:10,sy:1.9});tag.position.y=5.6;g.add(tag);
        g.position.set(o.x-52.5,0,o.y-34);g.userData.ph=Math.random()*6;if(m.out)g.children.forEach(ch=>{if(ch.material){ch.material.transparent=true;ch.material.opacity=.45;}});
        group.add(g);});};
    build(P,mk);
    ticks.push((dt,t)=>{group.children.forEach(g=>{g.position.y=Math.abs(Math.sin(t/420+g.userData.ph))*.12;});ball.rotation.y+=dt;});
    pitch3D={key:S.sel,update:build};
  }

  /* eventi principali */
  /* icone degli eventi: per le liste (HTML) e dentro i grafici (SVG) */
  const ICN=t=>/^goal/.test(t)?["calcio","ico-g"]:/yellow/.test(t)?["card","ico-y"]:/red/.test(t)?["card","ico-r"]:/substitution/.test(t)?["sub","ico-sub"]:/var/i.test(t)?["var",""]:/penalty/.test(t)?["target",""]:/^shot/.test(t)?["goal",""]:/kickoff|half|end|start/.test(t)?["whistle",""]:null;
  const ICON=t=>{const n=ICN(t);return n?SL.ico(n[0],n[1]):'<span class="dim">•</span>';};
  const ICOCOL={"ico-g":"#3fbf7f","ico-y":"#f2c230","ico-r":"#ef4444","ico-sub":"#45c8ec","":"#e9eef8"};
  const ICOSVG=(t,x,y,s)=>{const n=ICN(t);return n?'<use href="#i-'+n[0]+'" x="'+(x-s/2).toFixed(1)+'" y="'+(y-s/2).toFixed(1)+'" width="'+s+'" height="'+s+'" color="'+ICOCOL[n[1]]+'"/>':"";};
  function drawEvents(){
    const c=cards.events,T=teamsOf(),ke=((S.sum||{}).keyEvents||[]).filter(k=>!/delay/.test(k.type&&k.type.type||""));
    if(!ke.length){c.body.innerHTML=UI.empty(T.ev.state==="pre"?"Gli eventi compaiono qui durante la partita.":"Nessun evento.");return;}
    /* linea del tempo */
    let tl='<svg viewBox="0 0 300 54" width="100%" style="height:auto;margin-bottom:8px" role="img" aria-label="Linea del tempo"><line x1="6" x2="294" y1="27" y2="27" stroke="var(--line)" stroke-width="2"/><line x1="150" x2="150" y1="20" y2="34" stroke="var(--dim)"/>';
    ke.forEach(k=>{const t=(k.type&&k.type.type)||"",m=(+(k.clock&&k.clock.value)||0)/60;if(!(/^goal|yellow|red|substitution/.test(t)))return;
      const x=6+Math.min(1,m/95)*288,w=sideOf(T,k.team);const y=w==="a"?42:12;tl+=ICOSVG(t,x,y,11);});
    tl+='<text x="2" y="9" font-size="8" fill="var(--muted)" class="svgtxt">'+h(T.hn)+'</text><text x="2" y="53" font-size="8" fill="var(--muted)" class="svgtxt">'+h(T.an)+'</text></svg>';
    const li=ke.slice().reverse().map(k=>{const t=(k.type&&k.type.type)||"",w=sideOf(T,k.team);const goal=/^goal/.test(t)||k.scoringPlay;
      return'<li class="'+(goal?"goal":"")+(/^goal|red|yellow|substitution/.test(t)?" key":"")+'"><span class="t">'+h(k.clock&&k.clock.displayValue||"")+'</span><span>'+ICON(t)+'</span><span class="x">'+h(SL.tr.soccer(k.text||k.type.text||""))+(w?'<small>'+h(w==="h"?T.hn:T.an)+'</small>':"")+'</span></li>';}).join("");
    c.body.innerHTML=tl+'<ul class="feed">'+li+'</ul>';
  }
  /* cronaca */
  function drawCronaca(){
    const c=cards.cronaca;if(!c.shown)return;const T=teamsOf(),com=((S.sum||{}).commentary||[]).slice().reverse();
    if(!com.length){c.body.innerHTML=UI.empty(T.ev.state==="pre"?"La cronaca inizia con la partita.":"Cronaca non disponibile.");return;}
    const keyT=/^goal|shot|yellow|red|substitution|penalty|var/;
    const list=com.filter(x=>S.cron==="all"||(x.play&&keyT.test(x.play.type&&x.play.type.type||""))).slice(0,150);
    c.body.innerHTML='<div class="scroll"><ul class="feed">'+list.map(x=>{const t=(x.play&&x.play.type&&x.play.type.type)||"";return'<li class="'+(/^goal/.test(t)?"goal":"")+'"><span class="t">'+h(x.time&&x.time.displayValue||"")+'</span><span>'+ICON(t)+'</span><span class="x">'+h(SL.tr.soccer(x.text))+'</span></li>';}).join("")+'</ul></div>';
    c.sub(com.length+" azioni");
  }

  /* classifica live */
  async function loadTable(){
    const ev=sel();const c=cards.table;if(!ev){c.body.innerHTML=UI.empty(liveMode?"Nessuna partita in corso adesso: appena ne inizia una compare qui.":"Scegli una partita.");return;}
    const lg=ev.league;if(/friendly/.test(lg)){c.body.innerHTML=UI.empty("Amichevole: nessuna classifica.");c.sub("");S.table=null;return;}
    const d=await SL.tryGet(SL.ESPN2+"soccer/"+lg+"/standings",{ttl:300000});
    if(!d){c.body.innerHTML=UI.empty("Classifica non disponibile.");return;}
    S.table=d;S.tableLg=lg;drawTable();
  }
  function zone(lg,pos,n){
    if(lg==="uefa.champions"||lg==="uefa.europa"||lg==="uefa.europa.conf")return pos<=8?"zone-co":pos<=24?"zone-cl":"zone-rel";
    if(lg==="ita.1"||lg==="esp.1"||lg==="eng.1"){if(pos<=4)return"zone-cl";if(pos===5)return"zone-el";if(pos===6)return"zone-co";if(pos>n-3)return"zone-rel";return"";}
    if(lg==="ger.1"||lg==="fra.1"){if(pos<=(lg==="fra.1"?3:4))return"zone-cl";if(pos===(lg==="fra.1"?4:5))return lg==="fra.1"?"zone-cl":"zone-el";if(pos===6)return"zone-co";if(pos>n-2)return"zone-rel";if(pos===n-2)return"zone-el";return"";}
    return"";}
  function drawTable(){
    const c=cards.table,d=S.table,lg=S.tableLg;if(!d)return;
    let groups=E.groups(d);if(!groups.length){c.body.innerHTML=UI.empty("Classifica non disponibile.");return;}
    const ev=sel();
    let g=groups.find(gr=>gr.entries.some(x=>ev&&(String(x.team.id)===ev.home.id||String(x.team.id)===ev.away.id)))||groups[0];
    const live=S.evs.filter(x=>x.league===lg&&x.live);
    const rows=g.entries.map(x=>({id:String(x.team.id),n:x.team.displayName,logo:(x.team.logos&&x.team.logos[0]&&x.team.logos[0].href)||"",gp:E.stat(x,"gamesPlayed"),w:E.stat(x,"wins"),d:E.stat(x,"ties"),l:E.stat(x,"losses"),gf:E.stat(x,"pointsFor"),ga:E.stat(x,"pointsAgainst"),pts:E.stat(x,"points"),rank:E.stat(x,"rank")||0,live:null}));
    rows.sort((a,b)=>(a.rank||99)-(b.rank||99));rows.forEach((r,i)=>r.off=i+1);
    live.forEach(ev=>{const H=rows.find(r=>r.id===ev.home.id),A=rows.find(r=>r.id===ev.away.id);if(!H||!A)return;const hs=+ev.home.score||0,as=+ev.away.score||0;
      [[H,hs,as],[A,as,hs]].forEach(([r,f,a])=>{r.gp++;r.gf+=f;r.ga+=a;if(f>a){r.w++;r.pts+=3;}else if(f===a){r.d++;r.pts+=1;}else r.l++;r.live=(r===H?"":"")+hs+"-"+as;});});
    if(live.length)rows.sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.off-b.off);
    const n=rows.length;
    c.sub((g.name&&groups.length>1?g.name+" · ":"")+(live.length?"proiezione live":"ufficiale"));
    c.body.innerHTML='<div class="scroll"><table class="tbl"><thead><tr><th>#</th><th class="l">Squadra</th><th>G</th><th>V</th><th>N</th><th>P</th><th>GF:GS</th><th>DR</th><th>PT</th></tr></thead><tbody>'+
      rows.map((r,i)=>{const pos=i+1,mv=live.length?r.off-pos:0,me=ev&&(r.id===ev.home.id||r.id===ev.away.id);
        return'<tr class="'+[zone(lg,pos,n),r.live!=null?"liv":"",me?"me":""].join(" ")+'"><td>'+pos+(mv?'<span class="'+(mv>0?"up":"dn")+'">'+(mv>0?"▲":"▼")+'</span>':"")+'</td><td class="l"><span class="tn">'+(r.logo?'<img class="logo-t" src="'+h(r.logo)+'" alt="" loading="lazy">':"")+h(r.n)+(r.live!=null?' <span class="tag live" style="padding:1px 5px">'+h(r.live)+'</span>':"")+'</span></td><td>'+r.gp+'</td><td>'+r.w+'</td><td>'+r.d+'</td><td>'+r.l+'</td><td>'+r.gf+':'+r.ga+'</td><td>'+V.sgn(r.gf-r.ga)+'</td><td><b>'+r.pts+'</b></td></tr>';}).join("")+'</tbody></table></div>'+
      (/^(ita|eng|esp|ger|fra)\.1$/.test(lg)?'<div class="legend"><span><i style="background:var(--blue)"></i>Champions</span><span><i style="background:var(--orange)"></i>Europa League</span><span><i style="background:var(--green)"></i>Conference</span><span><i style="background:var(--red)"></i>Retrocessione</span></div>':
       /^uefa\./.test(lg)&&n>20?'<div class="legend"><span><i style="background:var(--green)"></i>Ottavi</span><span><i style="background:var(--blue)"></i>Spareggi</span><span><i style="background:var(--red)"></i>Eliminate</span></div>':"");
  }

  /* aggiornamenti */
  const anyLive=()=>S.evs.some(x=>x.live)||S.evs.some(x=>x.state==="pre"&&new Date(x.date)-Date.now()<15*60000);
  SL.every(async()=>{await loadBoard();if(!S.sum)await loadMatch(true);},()=>liveMode||anyLive()?15000:120000);
  SL.every(async()=>{const ev=sel();if(ev&&ev.live)await loadMatch(false);},12000,{delay:12000});
  SL.every(loadTable,300000,{delay:1500});
  SL.every(()=>{const el=cards.match.body.querySelector(".cdown"),ev=sel();if(el&&ev)el.textContent=SL.countdown(new Date(ev.date)-Date.now());},1000,{delay:1000});
};
})();
