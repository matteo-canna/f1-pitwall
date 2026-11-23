/* Sport LIVE APP — EUROLEGA ed EUROCUP (dentro la pagina Basket)
   Giornate, partita con quarti, box score, mappa tiri su campo FIBA, play-by-play in italiano, classifica; Milano, Virtus e le italiane in evidenza.
   Dati: feed ufficiali EuroLeague (feeds.incrowdsports.com e live.euroleague.net), aperti, senza estensione. */
(function(){
"use strict";
const h=SL.h,UI=SL.ui,V=SL.viz;
const EU=SL.euro={};
const FEED="https://feeds.incrowdsports.com/provider/euroleague-feeds/";
const LIVE="https://live.euroleague.net/api/";
const COMPS={el:{code:"E",n:"EuroLega"},ec:{code:"U",n:"EuroCup"}};
EU.comps=COMPS;
/* la stagione parte in autunno: E2026 = 2026-27 */
EU.season=k=>{const d=new Date(),y=d.getMonth()>=7?d.getFullYear():d.getFullYear()-1;return COMPS[k].code+y;};
const ITA=/milan|olimpia|armani|bologna|virtus|trento|trentino|venezia|venice|reyer|brescia|germani|sassari|dinamo|tortona|derthona|trieste|reggio|napoli|varese|pistoia|treviso|cremona|scafati/i;
const favKey=code=>SL.fav.key("basket","team","eu:"+code);
const nice=n=>String(n||"").split(",").map(s=>s.trim()).reverse().join(" ").toLowerCase().replace(/(^|[\s\-'])([^\s\-'])/g,(m,a,b)=>a+b.toUpperCase()); /* "ALLMAN, KYLE" → "Kyle Allman" (senza \p{L}: va anche sui browser vecchi) */
const dk=s=>String(s||"").slice(0,10).replace(/-/g,"");

/* ---------- dati ---------- */
EU.rounds=async function(k){const d=await SL.tryGet(FEED+"v2/competitions/"+COMPS[k].code+"/seasons/"+EU.season(k)+"/rounds",{ttl:216e5});
  const it=s=>{const m=String(s||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m?SL.fmtDay(new Date(+m[1],+m[2]-1,+m[3],12)).replace(/^\w+ /,""):"";};
  return((d&&d.data)||[]).map(r=>({n:r.round,name:r.name,phase:r.phaseTypeCode,min:dk(r.minGameStartDate),max:dk(r.maxGameStartDate),txt:it(r.minGameStartDate)+(dk(r.minGameStartDate)!==dk(r.maxGameStartDate)?" – "+it(r.maxGameStartDate):"")})).sort((a,b)=>a.min<b.min?-1:a.min>b.min?1:a.n-b.n);};
/* giornata di riferimento: quella in corso oggi; altrimenti l'ultima se è finita da poco; altrimenti la prossima */
EU.curRound=function(R){const t=SL.dayKey(Date.now()),y2=SL.dayKey(SL.addDays(Date.now(),-2));
  return R.find(r=>r.min<=t&&t<=r.max)||R.filter(r=>r.max<t&&r.max>=y2).pop()||R.find(r=>r.min>t)||R[R.length-1]||null;};
function side(x,state){x=x||{};const q=x.quarters||{};const ls=["q1","q2","q3","q4","ot1","ot2","ot3","ot4","ot5"].map(k=>q[k]).filter((v,i)=>i<4||v!=null);
  return{id:String(x.code||""),code:String(x.code||""),name:x.abbreviatedName||x.editorialName||x.name||"",full:x.name||"",short:x.editorialName||x.abbreviatedName||"",abbr:x.tla||x.code||"",
    logo:(x.imageUrls&&x.imageUrls.crest)||(x.images&&x.images.crest)||"",score:state==="pre"?null:(x.score==null?null:String(x.score)),ls:state==="pre"?[]:ls.map(v=>v==null?"":String(v)),rec:"",color:"",winner:false};}
EU.norm=function(g,k){
  const raw=String(g.status||"").toLowerCase();
  const state=raw==="result"?"post":(raw==="confirmed"||raw==="scheduled"||raw==="postponed"||raw==="cancelled"||!raw||new Date(g.date)-Date.now()>5*60000)?"pre":"in";
  const home=side(g.home,state),away=side(g.away,state);
  if(state==="post"){const a=+home.score||0,b=+away.score||0;home.winner=a>b;away.winner=b>a;}
  const q=g.quarter;
  const clock=state==="in"?(q?(q>4?"Suppl.":"Q"+q)+(g.remainingTime?" "+String(g.remainingTime).replace(/^00:/,"").slice(0,5):""):"In corso"):"";
  const ev={id:k+"-"+g.code,code:g.code,seasonCode:(g.season&&g.season.code)||EU.season(k),sport:"basket",league:k,comp:COMPS[k].n,round:g.round&&g.round.round,roundName:g.round&&g.round.name,
    group:g.group&&g.group.name,phase:g.phaseType&&g.phaseType.code,date:g.date,state,live:state==="in",done:state==="post",
    status:state==="pre"?(raw==="postponed"?"Rinviata":SL.when(g.date)):state==="in"?clock:"Finale",clock,period:q||0,home,away,venue:(g.venue&&g.venue.name)||"",audience:g.audience||0,broadcast:""};
  ev.ita=ITA.test(home.full+" "+home.name)||ITA.test(away.full+" "+away.name);
  ev.fav=SL.fav.has(favKey(home.code))||SL.fav.has(favKey(away.code));ev.important=ev.fav||ev.ita;
  return ev;};
EU.games=async function(k,round,ttl){const d=await SL.tryGet(FEED+"v2/competitions/"+COMPS[k].code+"/seasons/"+EU.season(k)+"/games?roundNumber="+round,{ttl:ttl||60000});
  return((d&&d.data)||[]).map(g=>EU.norm(g,k)).sort((a,b)=>new Date(a.date)-new Date(b.date));};
/* partite di un giorno italiano, in entrambe le coppe */
EU.day=async function(day,ttl){const key=SL.dayKey(SL.addDays(Date.now(),day)),out=[];
  await Promise.all(Object.keys(COMPS).map(async k=>{const R=await EU.rounds(k);const rs=R.filter(r=>r.min<=key&&key<=r.max);
    for(const r of rs)(await EU.games(k,r.n,ttl)).forEach(ev=>{if(SL.dayKey(ev.date)===key||(day===0&&ev.live))out.push(ev);});}));
  return out.sort((a,b)=>(b.live-a.live)||(new Date(a.date)-new Date(b.date)));};
/* classifica: solo dopo giornate già iniziate (quelle future rispondono 404) */
EU.standings=async function(k,round){const t=SL.dayKey(Date.now()),R=await EU.rounds(k);
  const cand=R.filter(r=>r.n<=round&&r.min<t&&r.phase===((R.find(x=>x.n===round)||{}).phase||r.phase)).map(r=>r.n).sort((a,b)=>b-a).slice(0,3);
  for(const r of cand){
    const d=await SL.tryGet(FEED+"v3/competitions/"+COMPS[k].code+"/seasons/"+EU.season(k)+"/rounds/"+r+"/basicstandings",{ttl:600000});
    const T=(d&&d.teams)||[];if(T.some(t=>t.gamesPlayed>0))return{round:r,teams:T};}
  return{round:0,teams:[]};};
const lq=(ep,ev,ttl)=>SL.tryGet(LIVE+ep+"?gamecode="+ev.code+"&seasoncode="+ev.seasonCode,{ttl});

/* ---------- home, avvisi e fatti ---------- */
EU.item=function(ev){const sc=ev.state!=="pre";
  return{id:"basket:"+ev.id,sport:"basket",comp:ev.comp+(ev.roundName?" · "+ev.roundName.replace("Round","G."):""),date:ev.date,state:ev.state,live:ev.live,done:ev.done,status:ev.status,important:ev.important,ev,
    sig:ev.home.score+"-"+ev.away.score+"|"+ev.state+"|"+ev.period,
    lines:[{n:ev.home.name,img:ev.home.logo,v:sc?ev.home.score:"",lose:ev.done&&ev.away.winner},{n:ev.away.name,img:ev.away.logo,v:sc?ev.away.score:"",lose:ev.done&&ev.home.winner}],
    foot:ev.venue,go:{sport:"basket",c:ev.league,r:ev.round,e:ev.id}};};
EU.facts=async function(k){const out=[],R=await EU.rounds(k),cur=EU.curRound(R);if(!cur)return out;
  const st=await EU.standings(k,cur.n);const top=st.teams.slice().sort((a,b)=>a.position-b.position)[0];
  if(top)out.push({l:"Capolista "+COMPS[k].n,v:(top.club.abbreviatedName||top.club.name)+" · "+top.gamesWon+"-"+top.gamesLost,go:{sport:"basket",c:k}});
  /* italiane: ultima giocata e prossima, cercando nella giornata di riferimento e in quelle vicine */
  const idx=R.indexOf(cur),near=R.slice(Math.max(0,idx-1),idx+2);const evs=[].concat(...await Promise.all(near.map(r=>EU.games(k,r.n,600000)))).filter(e=>e.ita);
  const last=evs.filter(e=>e.done).sort((a,b)=>new Date(b.date)-new Date(a.date))[0],nx=evs.filter(e=>e.state==="pre").sort((a,b)=>new Date(a.date)-new Date(b.date))[0];
  if(last)out.push({l:"Ultima italiana",v:last.home.name+" "+last.home.score+"-"+last.away.score+" "+last.away.name,go:{sport:"basket",c:k,r:last.round,e:last.id}});
  if(nx)out.push({l:"Prossima italiana",v:nx.home.name+" – "+nx.away.name+" · "+SL.when(nx.date),go:{sport:"basket",c:k,r:nx.round,e:nx.id}});
  return out;};

/* ---------- pagina ---------- */
const DEFS=[
  {k:"tv",n:"Diretta TV",sz:2,fixed:true},
  {k:"match",n:"Partita",sz:2,hero:true},
  {k:"leaders",n:"Migliori in campo",sz:2},
  {k:"box",n:"Box score",sz:2},
  {k:"shots",n:"Mappa tiri",sz:2},
  {k:"table",n:"Classifica",sz:2},
  {k:"pbp",n:"Play-by-play",sz:2,couch:false},
  {k:"games",n:"Partite della giornata",sz:2}
];
const PT={"2FGM":"Canestro da 2","2FGA":"Errore da 2","3FGM":"Tripla","3FGA":"Tripla sbagliata","FTM":"Tiro libero a segno","FTA":"Tiro libero sbagliato",D:"Rimbalzo difensivo",O:"Rimbalzo offensivo",AS:"Assist",TO:"Palla persa",ST:"Palla recuperata",
  CM:"Fallo",RV:"Fallo subito",FV:"Stoppata",AG:"Tiro stoppato",TOUT:"Timeout",TOUT_TV:"Timeout TV",IN:"Entra",OUT:"Esce",BP:"Inizio quarto",EP:"Fine quarto",EG:"Fine partita",JB:"Palla a due",OF:"Fallo in attacco",C:"Fallo tecnico",CMT:"Fallo tecnico",CMU:"Fallo antisportivo",CMU_FL:"Fallo antisportivo",CMD:"Espulsione",CCH:"Cambio di possesso"};
EU.mount=function(ctx,k,liveOnly){
  const st=ctx.st,C=COMPS[k];
  const r=document.createElement("div");r.className="row";const strip=document.createElement("div");strip.className="strip";ctx.sub.append(r,strip);
  const cards=UI.mount(ctx.main,DEFS);UI.tv(cards.tv,"basket","eu");
  const S={R:[],round:+st.r||0,evs:[],sel:st.e||"",hdr:null,box:null,pts:null,pbp:null,team:"all",boxT:"h",stand:null};
  const sel=()=>S.evs.find(x=>x.id===S.sel);
  UI.seg(cards.shots,[["all","Tutti"],["h","Casa"],["a","Ospiti"]],"all",v=>{S.team=v;drawShots();});
  const boxSeg=UI.seg(cards.box,[["h","Casa"],["a","Ospiti"]],"h",v=>{S.boxT=v;drawBox();});
  strip.addEventListener("click",e=>{const b=e.target.closest(".mtile");if(b)select(b.dataset.ev);});
  cards.games.body.addEventListener("click",e=>{const b=e.target.closest(".mrow");if(b)select(b.dataset.ev);});
  SL.onPage("flash",id=>{if(!/^basket:/.test(id))return;document.querySelectorAll('[data-ev="'+CSS.escape(id.slice(7))+'"]').forEach(t=>{t.classList.remove("flash");void t.offsetWidth;t.classList.add("flash");});});
  function select(id){if(id===S.sel)return;S.sel=id;S.pbpTry=0;SL.setQuiet({e:id});drawStrip();drawGames();S.hdr=S.box=S.pts=S.pbp=null;["match","shots","leaders","box","pbp"].forEach(x=>cards[x].body.innerHTML='<div class="loading">Carico</div>');loadGame(true);}
  function nav(){r.innerHTML="";if(liveOnly){r.appendChild(UI.liveNote("Solo le partite di "+C.n+" in corso adesso."));return;}
    const R=S.R,i=R.findIndex(x=>x.n===S.round),cur=R[i];
    const w=document.createElement("div");w.className="daynav";
    w.innerHTML='<button type="button" data-d="-1" aria-label="Giornata precedente"'+(i<=0?" disabled":"")+'>‹</button><button type="button" class="cur" data-d="0">'+h(cur?(cur.phase==="RS"?"Giornata "+cur.n:cur.name)+" · "+cur.txt:"Giornata")+'</button><button type="button" data-d="1" aria-label="Giornata successiva"'+(i>=R.length-1?" disabled":"")+'>›</button>';
    w.addEventListener("click",e=>{const b=e.target.closest("button");if(!b||b.disabled)return;const v=+b.dataset.d;const nx=v===0?EU.curRound(R):R[i+v];if(!nx)return;SL.go({c:k,r:nx.n===EU.curRound(R).n?"":nx.n,e:""});});
    const hint=document.createElement("span");hint.className="muted";hint.textContent="Orari italiani · "+(C.n==="EuroLega"?"Olimpia Milano e Virtus Bologna in evidenza":"le italiane in evidenza");
    r.append(w,hint);}
  async function loadBoard(){
    if(!S.R.length){S.R=await EU.rounds(k);if(!S.round||!S.R.find(x=>x.n===S.round)){const c=EU.curRound(S.R);S.round=c?c.n:0;}nav();}
    let all=[];
    if(liveOnly)all=(await EU.day(0,15000)).filter(e=>e.league===k&&(e.live||e.id===S.sel));
    else if(S.round)all=await EU.games(k,S.round,anyLive()?15000:120000);
    S.evs=all;
    if(!S.sel||!sel()){const p=all.find(x=>x.live&&x.important)||all.find(x=>x.live)||all.filter(x=>x.done&&x.important).pop()||all.find(x=>x.important&&x.state==="pre")||all.filter(x=>x.done).pop()||all[0];S.sel=p?p.id:"";if(S.sel)SL.setQuiet({e:S.sel});}
    drawStrip();drawGames();}
  function drawStrip(){strip.innerHTML=S.evs.map(ev=>SL.espn.tile(ev,S.sel)).join("")||'<span class="muted">'+(liveOnly?"Nessuna partita di "+C.n+" in corso.":"Nessuna partita in questa giornata.")+'</span>';}
  function drawGames(){const c=cards.games,n=S.evs.filter(x=>x.live).length;c.sub(n?n+" in diretta":S.evs.length+" partite");
    if(!S.evs.length){c.body.innerHTML=UI.empty(liveOnly?"Nessuna partita in corso adesso.":"Nessuna partita in questa giornata.");return;}
    c.body.innerHTML='<div class="mlist">'+S.evs.map(ev=>{const sc=ev.state!=="pre";
      return'<button type="button" class="mrow'+(ev.id===S.sel?" sel":"")+(ev.important?" fav":"")+'" data-ev="'+ev.id+'"><span class="min'+(ev.live?" live":"")+'">'+h(ev.live?ev.clock:ev.done?"FIN":SL.fmtDay(ev.date).replace(/^\w+ /,"")+" "+SL.fmtTime(ev.date))+'</span>'+
        '<span class="tt"><img class="logo-t" src="'+h(ev.home.logo)+'" alt="" loading="lazy"><span>'+h(ev.home.name)+'</span></span><span class="s">'+(sc?h(ev.home.score):"")+'</span>'+
        '<span class="tt"><img class="logo-t" src="'+h(ev.away.logo)+'" alt="" loading="lazy"><span>'+h(ev.away.name)+'</span></span><span class="s">'+(sc?h(ev.away.score):"")+'</span>'+
        '<span class="last">'+h(ev.group&&!/regular/i.test(ev.group)?ev.group.replace("Group","Girone"):ev.venue)+'</span></button>';}).join("")+'</div>';}
  async function loadGame(first){const ev=sel();
    if(!ev){["match","shots","leaders","box","pbp"].forEach(x=>cards[x].body.innerHTML=UI.empty(liveOnly?"Nessuna partita in corso adesso: appena ne inizia una compare qui.":"Scegli una partita."));return;}
    if(ev.state!=="pre"){const ttl=ev.live?8000:600000;
      const [a,b,c2,d]=await Promise.all([lq("Header",ev,ttl),lq("Boxscore",ev,ttl),lq("Points",ev,ttl),cards.pbp.shown?lq("PlayByPlay",ev,ttl):null]);
      if(ev!==sel())return;S.hdr=a;S.box=b;S.pts=c2;S.pbp=d;}
    drawMatch();drawShots();drawLeaders();drawBox();drawPbp();}
  function drawMatch(){const c=cards.match,ev=sel();if(!ev)return;const H=S.hdr||{};
    const live=ev.live||H.Live===true;const rec=code=>{const t=S.stand&&S.stand.find(x=>x.club.code===code);return t?t.gamesWon+"-"+t.gamesLost+" · "+t.position+"°":"";};
    const tm=e=>'<div class="tm"><img src="'+h(e.logo)+'" alt=""><div class="nm">'+h(e.name)+' '+SL.star("basket","team","eu:"+e.code,e.name)+'</div><div class="rec">'+h(rec(e.code))+'</div></div>';
    const sa=H.ScoreA!=null&&H.ScoreA!==""?H.ScoreA:ev.home.score,sb=H.ScoreB!=null&&H.ScoreB!==""?H.ScoreB:ev.away.score;
    const clk=live?(H.Quarter?(+H.Quarter>4?"Suppl.":"Q"+H.Quarter)+" · "+String(H.RemainingPartialTime||"").trim():ev.clock):"";
    let s='<div class="bug">'+tm(ev.home)+'<div class="mid"><div class="score">'+(ev.state!=="pre"?h(sa)+'<i>–</i>'+h(sb):'<span style="font-size:.55em">'+h(SL.fmtTime(ev.date))+'</span>')+'</div><div class="clk">'+(live?'<span class="tag live">'+h(clk||"LIVE")+'</span>':ev.done?'<span class="tag">Finale</span>':'<span class="tag">'+h(SL.when(ev.date))+'</span>')+'</div></div>'+tm(ev.away)+'</div>';
    const la=ev.home.ls,lb=ev.away.ls;
    if(ev.state!=="pre"&&la.length){const n=Math.max(la.length,4);s+='<table class="tbl ls"><thead><tr><th class="l"></th>'+Array.from({length:n},(_,i)=>'<th>'+(i<4?"Q"+(i+1):"OT"+(i-3))+'</th>').join("")+'<th>TOT</th></tr></thead><tbody>'+
      [[ev.home,la,sa],[ev.away,lb,sb]].map(([e,l,t])=>'<tr><td class="l"><span class="tn"><img class="logo-t" src="'+h(e.logo)+'" alt="">'+h(e.abbr)+'</span></td>'+Array.from({length:n},(_,i)=>'<td>'+h(l[i]||"")+'</td>').join("")+'<td><b>'+h(t||"")+'</b></td></tr>').join("")+'</tbody></table>';}
    if(ev.state==="pre")s+='<p class="note" style="text-align:center">Palla a due tra <b class="cdown">'+h(SL.countdown(new Date(ev.date)-Date.now()))+'</b></p>';
    s+='<p class="note" style="text-align:center">'+[C.n+(ev.roundName?" · "+ev.roundName.replace("Round","Giornata"):""),ev.venue,ev.audience?"Spettatori "+Number(ev.audience).toLocaleString("it-IT"):""].filter(Boolean).map(h).join(" · ")+'</p>';
    c.body.innerHTML=s;c.sub(ev.home.abbr+" – "+ev.away.abbr);}
  /* tiri: centimetri dal canestro → piedi sul disegno del campo (canestro a 25, 5.25) */
  function shotList(){const ev=sel(),R=(S.pts&&S.pts.Rows)||[];
    return R.map(p=>Object.assign({},p,{ID_ACTION:String(p.ID_ACTION||"").trim()})).filter(p=>/^[23]FG[MA]$/.test(p.ID_ACTION)&&p.COORD_X!==-1).map(p=>{const w=String(p.TEAM||"").trim()===ev.home.code?"h":"a";
      return{w,x:25+(+p.COORD_X)/30.48,y:5.25+(+p.COORD_Y)/30.48,made:/M$/.test(p.ID_ACTION),three:/^3/.test(p.ID_ACTION),txt:nice(p.PLAYER)+" · "+(PT[p.ID_ACTION]||""),clk:"Q"+Math.min(5,Math.ceil((+p.MINUTE||1)/10))+" "+(p.CONSOLE||"")};}).filter(s=>S.team==="all"||s.w===S.team);}
  function drawShots(){const c=cards.shots,ev=sel();if(!c.shown||!ev)return;const L=shotList();
    if(!L.length){c.body.innerHTML=UI.empty(ev.state==="pre"?"I tiri compaiono durante la partita.":"Nessun tiro con posizione.");c.sub("");return;}
    const ch="#f5803e",ca="#7fb2ff";const mk=w=>{const a=L.filter(s=>s.w===w),m=a.filter(s=>s.made).length,th=a.filter(s=>s.three),tm=th.filter(s=>s.made).length;return{n:a.length,m,th:th.length,tm};};
    const A=mk("h"),B=mk("a");c.sub((S.team!=="a"?ev.home.abbr+" "+A.m+"/"+A.n:"")+(S.team==="all"?" · ":"")+(S.team!=="h"?ev.away.abbr+" "+B.m+"/"+B.n:""));
    let g="";L.forEach(s=>{const col=s.w==="h"?ch:ca,x=s.x,y=s.y;
      g+=s.made?'<circle cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r=".75" fill="'+col+'" stroke="#fff" stroke-width=".15"><title>'+h(s.clk+" "+s.txt)+'</title></circle>':'<g stroke="'+col+'" stroke-width=".3" opacity=".75"><line x1="'+(x-.55)+'" y1="'+(y-.55)+'" x2="'+(x+.55)+'" y2="'+(y+.55)+'"/><line x1="'+(x-.55)+'" y1="'+(y+.55)+'" x2="'+(x+.55)+'" y2="'+(y-.55)+'"/><title>'+h(s.clk+" "+s.txt)+'</title></g>';});
    c.body.innerHTML=V.court(g,true)+'<div class="legend">'+(S.team!=="a"?'<span><i style="background:'+ch+'"></i>'+h(ev.home.name)+': '+A.m+'/'+A.n+' dal campo, '+A.tm+'/'+A.th+' da tre</span>':"")+(S.team!=="h"?'<span><i style="background:'+ca+'"></i>'+h(ev.away.name)+': '+B.m+'/'+B.n+', '+B.tm+'/'+B.th+' da tre</span>':"")+'<span>● segnato · ✕ sbagliato · campo FIBA</span></div>';}
  const teamStats=w=>{const ev=sel(),st=((S.box||{}).Stats)||[];return st[w==="h"?0:1]||null;};
  function drawLeaders(){const c=cards.leaders,ev=sel();if(!ev)return;
    if(!S.box||!(S.box.Stats||[]).length){c.body.innerHTML=UI.empty("Disponibili durante la partita.");return;}
    const nm=[["Points","Punti"],["TotalRebounds","Rimbalzi"],["Assistances","Assist"],["Valuation","Valutazione"]];
    c.body.innerHTML=["h","a"].map(w=>{const t=teamStats(w);if(!t)return"";const P=(t.PlayersStats||[]).filter(p=>p.Minutes&&p.Minutes!=="DNP");
      return'<h4 class="muted" style="margin:6px 0">'+h(w==="h"?ev.home.name:ev.away.name)+'</h4>'+nm.map(([key,lab])=>{const b=P.slice().sort((x,y)=>(y[key]||0)-(x[key]||0))[0];if(!b)return"";
        return'<div class="row" style="justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--line)"><span>'+h(lab)+'</span><span><b>'+h(b[key])+'</b> '+h(nice(b.Player))+'</span></div>';}).join("");}).join("");}
  function drawBox(){const c=cards.box,ev=sel();if(!ev)return;
    boxSeg.querySelectorAll("button").forEach(b=>b.textContent=b.dataset.v==="h"?ev.home.abbr:ev.away.abbr);
    const t=teamStats(S.boxT);if(!t||!(t.PlayersStats||[]).length){c.body.innerHTML=UI.empty(ev.state==="pre"?"Il box score si riempie durante la partita.":"Box score non disponibile.");return;}
    const fr=(m,a)=>(m||0)+"/"+(a||0);
    const row=(p,tot)=>{const dnp=!tot&&(!p.Minutes||p.Minutes==="DNP");
      return'<tr><td class="l"><span class="tn">'+(tot?"<b>TOTALE</b>":(p.IsStarter?"<b>":"")+'<span class="dim">'+h(String(p.Dorsal||"").trim())+'</span> '+h(nice(p.Player))+(p.IsStarter?"</b>":""))+'</span></td>'+
        (dnp?'<td colspan="12" class="l dim">Non ha giocato</td>':[tot?"":String(p.Minutes||"").slice(0,5),"<b>"+h(p.Points)+"</b>",fr(p.FieldGoalsMade2,p.FieldGoalsAttempted2),fr(p.FieldGoalsMade3,p.FieldGoalsAttempted3),fr(p.FreeThrowsMade,p.FreeThrowsAttempted),p.TotalRebounds,p.Assistances,p.Steals,p.Turnovers,p.BlocksFavour,p.FoulsCommited,tot?"<b>"+h(p.Valuation)+"</b>":h(p.Valuation)].map((v,i)=>'<td>'+(i===1||(tot&&i===11)?v:h(v))+'</td>').join(""))+'</tr>';};
    c.body.innerHTML='<div class="scroll"><table class="tbl"><thead><tr><th class="l">Giocatore</th><th>MIN</th><th>PT</th><th>2P</th><th>3P</th><th>TL</th><th>RIM</th><th>AST</th><th>REC</th><th>PP</th><th>STOP</th><th>F</th><th>VAL</th></tr></thead><tbody>'+
      t.PlayersStats.map(p=>row(p,false)).join("")+(t.totr?row(t.totr,true):"")+'</tbody></table></div><p class="note">2P/3P/TL tiri da due, da tre e liberi (segnati/tentati) · RIM rimbalzi · REC recuperate · PP perse · STOP stoppate · F falli · VAL valutazione. In grassetto il quintetto.</p>';
    c.sub(S.boxT==="h"?ev.home.name:ev.away.name);}
  function drawPbp(){const c=cards.pbp,ev=sel();if(!c.shown||!ev)return;const P=S.pbp;
    if(!P){c.body.innerHTML=UI.empty(ev.state==="pre"?"Le azioni compaiono durante la partita.":"Carico le azioni…");if(ev.state!=="pre"&&!S.pbpTry){S.pbpTry=1;lq("PlayByPlay",ev,600000).then(d=>{S.pbp=d;drawPbp();});}return;}
    const Q=[["FirstQuarter",1],["SecondQuarter",2],["ThirdQuarter",3],["ForthQuarter",4],["ExtraTime",5]];
    const all=[];Q.forEach(([key,n])=>(P[key]||[]).forEach(x=>{const t=String(x.PLAYTYPE||"").trim();if(t==="IN"||t==="OUT")return;all.push(Object.assign({q:n},x,{PLAYTYPE:t}));}));
    if(!all.length){c.body.innerHTML=UI.empty("Le azioni compaiono durante la partita.");return;}
    c.body.innerHTML='<div class="scroll"><ul class="feed">'+all.reverse().slice(0,200).map(x=>{const sc=/^(2FGM|3FGM|FTM)$/.test(x.PLAYTYPE);const tc=String(x.CODETEAM||"").trim();const who=tc===ev.home.code?ev.home.abbr:tc===ev.away.code?ev.away.abbr:"";
      return'<li class="'+(sc?"goal":"")+'"><span class="t">'+h((x.q>4?"OT":"Q"+x.q)+" "+(x.MARKERTIME||""))+'</span><span>'+(sc?SL.ico("basket"):"")+'</span><span class="x">'+h((PT[x.PLAYTYPE]||x.PLAYINFO||x.PLAYTYPE)+(x.PLAYER?" · "+nice(x.PLAYER):""))+'<small>'+h(who)+(sc&&x.POINTS_A!=null?" · "+x.POINTS_A+"-"+x.POINTS_B:"")+'</small></span></li>';}).join("")+'</ul></div>';}
  async function loadTable(){const c=cards.table;if(!S.round){c.body.innerHTML=UI.empty("Classifica non disponibile.");return;}
    const st=await EU.standings(k,S.round);S.stand=st.teams;if(!st.teams.length){c.body.innerHTML=UI.empty("La classifica compare dopo la prima giornata.");return;}
    c.sub("dopo la giornata "+st.round);drawMatch();
    const G={};st.teams.forEach(t=>{const g=t.groupName||"";(G[g]=G[g]||[]).push(t);});const ev=sel(),many=Object.keys(G).length>1;
    c.body.innerHTML='<div class="scroll">'+Object.keys(G).sort().map(g=>(many?'<h4 class="muted" style="margin:8px 0 4px">'+h(g.replace("Group","Girone"))+'</h4>':"")+'<table class="tbl"><thead><tr><th>#</th><th class="l">Squadra</th><th>V</th><th>P</th><th>%</th><th>+/-</th><th>FORMA</th></tr></thead><tbody>'+
      G[g].sort((a,b)=>a.position-b.position).map((t,i)=>{const cl=t.club||{},me=ev&&(cl.code===ev.home.code||cl.code===ev.away.code),it=ITA.test((cl.name||"")+" "+(cl.abbreviatedName||""));
        const zone=many?(i<2?"zone-cl":i<6?"zone-el":""):(i<6?"zone-cl":i<10?"zone-el":"");
        return'<tr class="'+zone+(me?" me":"")+(it?" ita":"")+'"><td>'+t.position+'</td><td class="l"><span class="tn"><img class="logo-t" src="'+h(cl.images&&cl.images.crest||"")+'" alt="" loading="lazy">'+h(cl.abbreviatedName||cl.name)+SL.star("basket","team","eu:"+cl.code,cl.abbreviatedName||cl.name)+'</span></td><td>'+t.gamesWon+'</td><td>'+t.gamesLost+'</td><td>'+h(t.winPercentage)+'</td><td>'+h(t.pointsDifference)+'</td><td>'+(t.last5Form||[]).map(f=>'<span class="'+(f==="W"?"up":"dn")+'">'+(f==="W"?"V":"P")+'</span>').join(" ")+'</td></tr>';}).join("")+'</tbody></table>').join("")+'</div>'+
      '<div class="legend">'+(many?'<span><i style="background:var(--blue)"></i>Qualificate</span><span><i style="background:var(--orange)"></i>Ai play-in / ottavi</span>':'<span><i style="background:var(--blue)"></i>Playoff</span><span><i style="background:var(--orange)"></i>Play-in</span>')+'</div>';}
  const anyLive=()=>S.evs.some(x=>x.live)||S.evs.some(x=>x.state==="pre"&&new Date(x.date)-Date.now()<15*60000);
  SL.every(async()=>{await loadBoard();if(!S.hdr&&!S.box)await loadGame(true);},()=>liveOnly||anyLive()?15000:300000);
  SL.every(async()=>{const ev=sel();if(ev&&ev.live)await loadGame(false);},10000,{delay:10000});
  SL.every(loadTable,600000,{delay:1500});
  SL.every(()=>{const el=cards.match.body.querySelector(".cdown"),ev=sel();if(el&&ev)el.textContent=SL.countdown(new Date(ev.date)-Date.now());},1000,{delay:1000});
  SL.onPage("fav",()=>{S.evs.forEach(e=>{e.fav=SL.fav.has(favKey(e.home.code))||SL.fav.has(favKey(e.away.code));e.important=e.fav||e.ita;});drawStrip();drawGames();});
};
})();
