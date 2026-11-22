/* Sport LIVE APP — BASKET (NBA)
   Partite, tabellone con quarti, probabilità di vittoria, mappa tiri 2D/3D, box score, migliori, play-by-play, classifica. Dati: ESPN. */
(function(){
"use strict";
const h=SL.h,E=SL.espn,V=SL.viz,UI=SL.ui;
const M=SL.sports.basket={name:"Basket NBA",tab:"Basket",icon:"🏀",color:"#f5803e"};
const NY="America/New_York";

/* partite di un giorno italiano: le NBA notturne stanno nella data americana precedente */
async function dayGames(day,ttl){
  const target=SL.dayKey(SL.addDays(Date.now(),day));
  const keys=[SL.dayKey(SL.addDays(Date.now(),day-1),NY),SL.dayKey(SL.addDays(Date.now(),day),NY)];
  const out=[],seen=new Set();
  for(const k of [...new Set(keys)]){const d=await SL.tryGet(SL.ESPN+"basketball/nba/scoreboard?dates="+k,{ttl:ttl==null?15000:ttl});if(!d)continue;
    (d.events||[]).forEach(e=>{if(seen.has(e.id))return;const ev=E.norm(e,"basket","nba","NBA");if(SL.dayKey(ev.date)===target||(day===0&&ev.live)){seen.add(e.id);out.push(ev);}});}
  return E.sort(out);
}
function item(ev){const sc=ev.state!=="pre";
  return{id:"basket:"+ev.id,sport:"basket",comp:"NBA",date:ev.date,state:ev.state,live:ev.live,done:ev.done,status:ev.status,important:ev.fav,ev,
    sig:E.score(ev)+"|"+ev.state+"|"+ev.period,
    lines:[{n:ev.away.name,img:ev.away.logo,v:sc?ev.away.score:"",lose:ev.done&&ev.home.winner},{n:ev.home.name,img:ev.home.logo,v:sc?ev.home.score:"",lose:ev.done&&ev.away.winner}],
    foot:ev.state==="pre"?ev.venue:(ev.away.rec&&ev.home.rec?ev.away.rec+" · "+ev.home.rec:""),go:{sport:"basket",e:ev.id,d:SL.dayOff(ev.date)||""}};}
M.homeFeed=async(day,ttl)=>(await dayGames(day,ttl)).map(item);
M.onChange=function(p,it){const a=p.ev,b=it.ev,t=b.away.name+" "+b.away.score+" – "+b.home.score+" "+b.home.name;
  if(a.state==="in"&&b.state==="post")return{id:"f:"+b.id,big:"FINALE",title:t,text:"NBA",color:"var(--orange)"};
  if(a.state==="pre"&&b.state==="in")return{id:"k:"+b.id,big:"VIA",title:b.away.name+" @ "+b.home.name,text:"Palla a due · NBA",color:"var(--cyan)",important:b.fav};
  if(b.fav&&a.period!==b.period&&b.period>1)return{id:"q:"+b.id+":"+b.period,big:"Q"+(b.period-1),title:t,text:"Fine "+(b.period-1)+"° quarto",color:"var(--orange)"};
  const lead=x=>Math.sign((+x.home.score||0)-(+x.away.score||0));
  if(b.fav&&b.period>=4&&lead(a)!==lead(b)&&lead(b)!==0)return{id:"l:"+b.id+":"+E.score(b),big:"SORPASSO",title:t,text:b.clock,color:"var(--yellow)"};
  return null;};

const DEFS=[
  {k:"match",n:"Partita",sz:2},
  {k:"wp",n:"Probabilità di vittoria",sz:2},
  {k:"games",n:"Tutte le partite",sz:3},
  {k:"shots",n:"Mappa tiri",sz:2},
  {k:"leaders",n:"Migliori in campo",sz:1},
  {k:"box",n:"Box score",sz:3},
  {k:"pbp",n:"Play-by-play",sz:2,couch:false},
  {k:"table",n:"Classifica",sz:2},
  {k:"tv",n:"Diretta TV",sz:2,couch:false}
];
M.mount=function(ctx){
  const st=ctx.st,day=+st.d||0;
  const r=document.createElement("div");r.className="row";r.appendChild(UI.daynav(day,v=>SL.go({d:v||"",e:""})));
  const hint=document.createElement("span");hint.className="muted";hint.textContent="Orari italiani: le partite della notte sono nel giorno in cui iniziano da noi.";r.appendChild(hint);
  const strip=document.createElement("div");strip.className="strip";ctx.sub.append(r,strip);
  const cards=UI.mount(ctx.main,DEFS);UI.tv(cards.tv,"basket");
  const S={evs:[],sel:st.e||"",sum:null,team:"all",shot3d:SL.store.get("shot3d","2d"),boxT:"a"};
  const sel=()=>S.evs.find(x=>x.id===S.sel);
  UI.seg(cards.shots,[["all","Tutti"],["a","Ospiti"],["h","Casa"]],"all",v=>{S.team=v;drawShots(true);});
  UI.seg(cards.shots,[["2d","2D"],["3d","3D"]],S.shot3d,v=>{S.shot3d=v;SL.store.set("shot3d",v);drawShots(true);});
  const boxSeg=UI.seg(cards.box,[["a","Ospiti"],["h","Casa"]],"a",v=>{S.boxT=v;drawBox();});
  strip.addEventListener("click",e=>{const b=e.target.closest(".mtile");if(b)select(b.dataset.ev);});
  cards.games.body.addEventListener("click",e=>{const b=e.target.closest(".mrow");if(b)select(b.dataset.ev);});
  SL.onPage("flash",id=>{if(!/^basket:/.test(id))return;document.querySelectorAll('[data-ev="'+CSS.escape(id.slice(7))+'"]').forEach(t=>{t.classList.remove("flash");void t.offsetWidth;t.classList.add("flash");});});
  SL.onPage("resize",()=>{drawWP();});
  function select(id){if(id===S.sel)return;S.sel=id;SL.setQuiet({e:id});drawStrip();drawGames();S.sum=null;shots3D=null;["match","wp","shots","leaders","box","pbp"].forEach(k=>cards[k].body.innerHTML='<div class="loading">Carico</div>');loadGame(true);}
  async function loadBoard(){
    S.evs=await dayGames(day,15000);
    if(!S.sel||!sel()){const p=S.evs.find(x=>x.live&&x.fav)||S.evs.find(x=>x.live)||S.evs.find(x=>x.fav)||S.evs.find(x=>x.done)||S.evs[0];S.sel=p?p.id:"";if(S.sel)SL.setQuiet({e:S.sel});}
    drawStrip();drawGames();}
  function drawStrip(){strip.innerHTML=S.evs.map(ev=>{const t=E.tile(ev,S.sel);return t;}).join("")||'<span class="muted">Nessuna partita NBA in questo giorno.</span>';}
  function drawGames(){const c=cards.games;const n=S.evs.filter(x=>x.live).length;c.sub(n?n+" in diretta":S.evs.length+" partite");
    if(!S.evs.length){c.body.innerHTML=UI.empty("Nessuna partita NBA in questo giorno.");return;}
    c.body.innerHTML='<div class="mlist">'+S.evs.map(ev=>{const sc=ev.state!=="pre";
      return'<button type="button" class="mrow'+(ev.id===S.sel?" sel":"")+'" data-ev="'+ev.id+'"><span class="min'+(ev.live?" live":"")+'">'+h(ev.live?ev.clock:ev.done?"FIN":SL.fmtTime(ev.date))+'</span>'+
        '<span class="tt"><img class="logo-t" src="'+h(ev.away.logo)+'" alt="" loading="lazy"><span>'+h(ev.away.name)+'</span></span><span class="s">'+(sc?h(ev.away.score):"")+'</span>'+
        '<span class="tt"><img class="logo-t" src="'+h(ev.home.logo)+'" alt="" loading="lazy"><span>'+h(ev.home.name)+'</span></span><span class="s">'+(sc?h(ev.home.score):"")+'</span>'+
        '<span class="last">'+h(ev.away.rec&&ev.home.rec?ev.away.rec+" · "+ev.home.rec:ev.venue)+'</span></button>';}).join("")+'</div>';}

  async function loadGame(first){const ev=sel();if(!ev){["match","wp","shots","leaders","box","pbp"].forEach(k=>cards[k].body.innerHTML=UI.empty("Scegli una partita."));return;}
    try{S.sum=await E.summary("basketball","nba",ev.id,ev.live?8000:600000);}catch(e){if(first)cards.match.body.innerHTML=UI.empty("Dati della partita non disponibili ora.");return;}
    drawMatch();drawWP();drawShots(first);drawLeaders();drawBox();drawPbp();}
  function T(){const ev=sel(),[ch,ca]=V.pair(ev.home.color,ev.away.color);return{ev,ch,ca,hid:ev.home.id,aid:ev.away.id};}
  function drawMatch(){const c=cards.match,t=T(),ev=t.ev,sum=S.sum||{};const hc=((sum.header||{}).competitions||[{}])[0],cs=hc.competitors||[];
    const H=cs.find(x=>x.homeAway==="home")||{},A=cs.find(x=>x.homeAway==="away")||{};const st=(hc.status||{}).type||{};const state=st.state||ev.state;
    const tm=(e,x)=>'<div class="tm"><img src="'+h(e.logo)+'" alt=""><div class="nm">'+h(e.name)+' '+SL.star("basket","team",e.id,e.name)+'</div><div class="rec">'+h(((x.record||[])[0]||{}).summary||e.rec||"")+'</div></div>';
    let s='<div class="bug">'+tm(ev.away,A)+'<div class="mid"><div class="score">'+(state!=="pre"?h(A.score||ev.away.score)+'<i>–</i>'+h(H.score||ev.home.score):'<span style="font-size:.55em">'+h(SL.fmtTime(ev.date))+'</span>')+'</div><div class="clk">'+(state==="in"?'<span class="tag live">'+h(SL.tr.status(st.shortDetail)||ev.clock)+'</span>':state==="post"?'<span class="tag">'+h(SL.tr.status(st.description)||"Finale")+'</span>':'<span class="tag">'+h(SL.when(ev.date))+'</span>')+'</div></div>'+tm(ev.home,H)+'</div>';
    const la=(A.linescores||[]).map(x=>x.displayValue),lh=(H.linescores||[]).map(x=>x.displayValue);
    if(la.length){const n=Math.max(la.length,4);s+='<table class="tbl ls"><thead><tr><th class="l"></th>'+Array.from({length:n},(_,i)=>'<th>'+(i<4?"Q"+(i+1):"OT"+(i-3))+'</th>').join("")+'<th>TOT</th></tr></thead><tbody>'+
      [[ev.away,la,A],[ev.home,lh,H]].map(([e,l,x])=>'<tr><td class="l"><span class="tn"><img class="logo-t" src="'+h(e.logo)+'" alt="">'+h(e.abbr)+'</span></td>'+Array.from({length:n},(_,i)=>'<td>'+h(l[i]||"")+'</td>').join("")+'<td><b>'+h(x.score||"")+'</b></td></tr>').join("")+'</tbody></table>';}
    if(state==="pre")s+='<p class="note" style="text-align:center">Palla a due tra <b class="cdown">'+h(SL.countdown(new Date(ev.date)-Date.now()))+'</b></p>';
    const gi=sum.gameInfo||{};s+='<p class="note" style="text-align:center">'+[gi.venue&&gi.venue.fullName,gi.attendance?"Spettatori "+Number(gi.attendance).toLocaleString("it-IT"):""].filter(Boolean).map(h).join(" · ")+'</p>';
    c.body.innerHTML=s;}
  /* tempo di gioco in minuti */
  const gameMin=(per,clk)=>{let left=0;const s=String(clk||"");if(s.indexOf(":")>=0){const [m,ss]=s.split(":");left=+m+(+ss)/60;}else left=(+s||0)/60;const len=per<=4?12:5,start=per<=4?(per-1)*12:48+(per-5)*5;return start+(len-left);};
  function drawWP(){const c=cards.wp;if(!c.shown||!S.sum)return;const t=T(),wp=S.sum.winprobability||[],plays=S.sum.plays||[];
    if(!wp.length){c.body.innerHTML=UI.empty(t.ev.state==="pre"?"Il grafico parte con la palla a due.":"Probabilità non disponibile.");c.sub("");return;}
    const idx={};plays.forEach(p=>{idx[p.id]=p;});
    const pts=[];wp.forEach(w=>{const p=idx[w.playId];if(!p)return;pts.push([gameMin(p.period&&p.period.number||1,p.clock&&p.clock.displayValue),w.homeWinPercentage*100]);});
    if(!pts.length){c.body.innerHTML=UI.empty("Probabilità non disponibile.");return;}
    const xmax=Math.max(48,pts[pts.length-1][0]);const cur=pts[pts.length-1][1];
    c.body.innerHTML=V.line({w:640,h:220,xmin:0,xmax,ymin:0,ymax:100,yticks:[0,25,50,75,100],mid:50,yfmt:v=>v===50?"50%":v===100?t.ev.home.abbr:v===0?t.ev.away.abbr:"",
      xticks:[[12,"Q2"],[24,"Q3"],[36,"Q4"],[48,"FINE"]],series:[{pts,color:t.ch,width:2.4,fill:"color-mix(in srgb,"+t.ch+" 18%,transparent)",base:50}],label:"Probabilità di vittoria"})+
      '<div class="legend"><span><i style="background:'+t.ch+'"></i>'+h(t.ev.home.name)+' '+cur.toFixed(0)+'%</span><span><i style="background:'+t.ca+'"></i>'+h(t.ev.away.name)+' '+(100-cur).toFixed(0)+'%</span></div><p class="note">Stima ESPN aggiornata a ogni azione: sopra la metà è favorita la squadra di casa.</p>';
    c.sub(h(cur>=50?t.ev.home.abbr+" "+cur.toFixed(0)+"%":t.ev.away.abbr+" "+(100-cur).toFixed(0)+"%"));}
  function shotList(){const t=T();return(S.sum&&S.sum.plays||[]).filter(p=>p.shootingPlay&&p.coordinate&&p.coordinate.x>-100&&!/free throw/i.test(p.text||"")).map(p=>{const w=String(p.team&&p.team.id)===t.hid?"h":"a";
    return{w,x:+p.coordinate.x,y:+p.coordinate.y,made:!!p.scoringPlay,three:/three point|3-pt/i.test(p.text||"")||p.scoreValue===3,txt:p.text,clk:(p.period&&p.period.displayValue||"")+" "+(p.clock&&p.clock.displayValue||"")};}).filter(s=>S.team==="all"||s.w===S.team);}
  let shots3D=null;
  async function drawShots(force){const c=cards.shots;if(!c.shown||!S.sum)return;const t=T(),L=shotList();
    if(!L.length){c.body.innerHTML=UI.empty(t.ev.state==="pre"?"I tiri compaiono durante la partita.":"Nessun tiro con posizione.");c.sub("");return;}
    const mk=w=>{const a=L.filter(s=>s.w===w),m=a.filter(s=>s.made).length,th=a.filter(s=>s.three),tm=th.filter(s=>s.made).length;return{n:a.length,m,th:th.length,tm};};
    const A=mk("a"),H=mk("h");
    c.sub((S.team!=="h"?t.ev.away.abbr+" "+A.m+"/"+A.n:"")+(S.team==="all"?" · ":"")+(S.team!=="a"?t.ev.home.abbr+" "+H.m+"/"+H.n:""));
    const legend='<div class="legend">'+(S.team!=="h"?'<span><i style="background:'+t.ca+'"></i>'+h(t.ev.away.name)+': '+A.m+'/'+A.n+' dal campo, '+A.tm+'/'+A.th+' da tre</span>':"")+(S.team!=="a"?'<span><i style="background:'+t.ch+'"></i>'+h(t.ev.home.name)+': '+H.m+'/'+H.n+', '+H.tm+'/'+H.th+' da tre</span>':"")+'<span>● segnato · ✕ sbagliato</span></div>';
    if(S.shot3d==="3d"&&V.can3D()){if(shots3D&&!force){shots3D(L);return;}try{await court3D(c,L,t);c.body.insertAdjacentHTML("beforeend",legend);}catch(e){console.warn(e);S.shot3d="2d";drawShots(true);}return;}
    shots3D=null;
    let g="";L.forEach(s=>{const col=s.w==="h"?t.ch:t.ca,x=s.x,y=s.y+5.25;
      g+=s.made?'<circle cx="'+x+'" cy="'+y+'" r=".75" fill="'+col+'" stroke="#fff" stroke-width=".15"><title>'+h(s.clk+" "+SL.tr.nba(s.txt))+'</title></circle>':'<g stroke="'+col+'" stroke-width=".3" opacity=".75"><line x1="'+(x-.55)+'" y1="'+(y-.55)+'" x2="'+(x+.55)+'" y2="'+(y+.55)+'"/><line x1="'+(x-.55)+'" y1="'+(y+.55)+'" x2="'+(x+.55)+'" y2="'+(y-.55)+'"/><title>'+h(s.clk+" "+SL.tr.nba(s.txt))+'</title></g>';});
    c.body.innerHTML=V.court(g)+legend;}
  async function court3D(c,L,t){const sc=await V.scene(c.body,{r:62,ph:.85,th:.0,tz:14,ty:0,shadow:40,fog:90,rmin:25,rmax:120,spin:.05});
    const {T:THREE,scene}=sc;
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(50,47),new THREE.MeshStandardMaterial({map:V.courtTexture(THREE),roughness:.55,metalness:.05}));floor.rotation.x=-Math.PI/2;floor.position.set(0,0,23.5);floor.receiveShadow=true;scene.add(floor);
    const sur=new THREE.Mesh(new THREE.PlaneGeometry(90,80),new THREE.MeshStandardMaterial({color:0x10141f,roughness:1}));sur.rotation.x=-Math.PI/2;sur.position.set(0,-.02,23.5);scene.add(sur);
    const bb=new THREE.Mesh(new THREE.BoxGeometry(6,3.5,.15),new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.35,roughness:.1}));bb.position.set(0,11.5,1.2);scene.add(bb);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.75,.06,8,32),new THREE.MeshStandardMaterial({color:0xff6a1a,emissive:0x661800}));rim.rotation.x=Math.PI/2;rim.position.set(0,10,5.25);scene.add(rim);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,11,10),new THREE.MeshStandardMaterial({color:0x333a48}));pole.position.set(0,5.5,-2.5);scene.add(pole);
    const grp=new THREE.Group();scene.add(grp);
    const build=L=>{while(grp.children.length){const o=grp.children.pop();o.geometry&&o.geometry.dispose();}
      L.forEach(s=>{const col=new THREE.Color(s.w==="h"?t.ch:t.ca),x=s.x-25,z=s.y+5.25;
        if(s.made){const hgt=s.three?3.2:2;const m=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,hgt,14),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:.45,roughness:.35}));m.position.set(x,hgt/2,z);m.castShadow=true;grp.add(m);}
        else{const m=new THREE.Mesh(new THREE.TorusGeometry(.38,.08,6,18),new THREE.MeshStandardMaterial({color:col,transparent:true,opacity:.65}));m.rotation.x=-Math.PI/2;m.position.set(x,.1,z);grp.add(m);}});};
    build(L);shots3D=build;}
  function drawLeaders(){const c=cards.leaders,sum=S.sum||{},t=T();const L=sum.leaders||[];
    if(!L.length){c.body.innerHTML=UI.empty("Disponibili durante la partita.");return;}
    const nm={points:"Punti",rebounds:"Rimbalzi",assists:"Assist"};
    c.body.innerHTML=["a","h"].map(w=>{const tid=w==="h"?t.hid:t.aid,blk=L.find(x=>String(x.team&&x.team.id)===tid);if(!blk)return"";
      return'<h4 class="muted" style="margin:6px 0">'+h(w==="h"?t.ev.home.name:t.ev.away.name)+'</h4>'+(blk.leaders||[]).filter(x=>nm[x.name]).map(x=>{const l=(x.leaders||[])[0];if(!l)return"";
        return'<div class="row" style="justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--line)"><span>'+h(nm[x.name])+'</span><span><b>'+h(l.displayValue)+'</b> '+h(l.athlete&&l.athlete.shortName||"")+'</span></div>';}).join("");}).join("");}
  const BX={MIN:"MIN",PTS:"PT",FG:"TIRI",["3PT"]:"3P",FT:"TL",REB:"RIM",AST:"AST",TO:"PP",STL:"REC",BLK:"STOP",OREB:"RO",DREB:"RD",PF:"F","+/-":"+/-"};
  function drawBox(){const c=cards.box,t=T(),P=((S.sum||{}).boxscore||{}).players||[];
    const blk=P.find(x=>String(x.team&&x.team.id)===(S.boxT==="h"?t.hid:t.aid));
    boxSeg.querySelectorAll("button").forEach(b=>b.textContent=b.dataset.v==="h"?t.ev.home.abbr:t.ev.away.abbr);
    if(!blk||!blk.statistics||!blk.statistics[0]){c.body.innerHTML=UI.empty(t.ev.state==="pre"?"Il box score si riempie durante la partita.":"Box score non disponibile.");return;}
    const s0=blk.statistics[0],lab=s0.labels||[];const keep=["MIN","PTS","REB","AST","FG","3PT","FT","STL","BLK","TO","PF","+/-"];const ix=keep.map(k=>lab.indexOf(k)).filter(i=>i>=0);
    const rows=(s0.athletes||[]).map(a=>'<tr class="'+(a.starter?"":"")+'"><td class="l"><span class="tn">'+(a.starter?"<b>":"")+h(a.athlete&&a.athlete.displayName||"")+(a.starter?"</b>":"")+' <span class="dim">'+h(a.athlete&&a.athlete.position&&a.athlete.position.abbreviation||"")+'</span></span></td>'+
      (a.didNotPlay||!(a.stats||[]).length?'<td colspan="'+ix.length+'" class="l dim">'+h(a.reason||"Non ha giocato")+'</td>':ix.map(i=>'<td>'+(lab[i]==="PTS"?"<b>"+h(a.stats[i])+"</b>":h(a.stats[i]))+'</td>').join(""))+'</tr>').join("");
    const tot=s0.totals?'<tr><td class="l"><b>TOTALE</b></td>'+ix.map(i=>'<td><b>'+h(s0.totals[i]||"")+'</b></td>').join("")+'</tr>':"";
    c.body.innerHTML='<div class="scroll"><table class="tbl"><thead><tr><th class="l">Giocatore</th>'+ix.map(i=>'<th>'+h(BX[lab[i]]||lab[i])+'</th>').join("")+'</tr></thead><tbody>'+rows+tot+'</tbody></table></div><p class="note">PT punti · RIM rimbalzi · TL tiri liberi · REC palle recuperate · PP palle perse · STOP stoppate · F falli. In grassetto il quintetto.</p>';
    c.sub(S.boxT==="h"?t.ev.home.name:t.ev.away.name);}
  function drawPbp(){const c=cards.pbp;if(!c.shown)return;const t=T(),P=((S.sum||{}).plays||[]).slice().reverse().slice(0,160);
    if(!P.length){c.body.innerHTML=UI.empty("Le azioni compaiono durante la partita.");return;}
    c.body.innerHTML='<div class="scroll"><ul class="feed">'+P.map(p=>{const w=String(p.team&&p.team.id)===t.hid?t.ev.home.abbr:String(p.team&&p.team.id)===t.aid?t.ev.away.abbr:"";
      return'<li class="'+(p.scoringPlay?"goal":"")+'"><span class="t">'+h((p.period&&p.period.number?"Q"+p.period.number+" ":"")+(p.clock&&p.clock.displayValue||""))+'</span><span>'+(p.scoringPlay?SL.ico("basket"):"")+'</span><span class="x">'+h(SL.tr.nba(p.text))+'<small>'+h(w)+(p.scoringPlay?" · "+p.awayScore+"-"+p.homeScore:"")+'</small></span></li>';}).join("")+'</ul></div>';}
  async function loadTable(){const c=cards.table,d=await SL.tryGet(SL.ESPN2+"basketball/nba/standings",{ttl:600000});
    if(!d){c.body.innerHTML=UI.empty("Classifica non disponibile.");return;}
    const G=E.groups(d),ev=sel();
    c.body.innerHTML='<div class="scroll">'+G.map(g=>{const rows=g.entries.slice().sort((a,b)=>E.stat(b,"winPercent")-E.stat(a,"winPercent")||E.stat(b,"wins")-E.stat(a,"wins"));
      return'<h4 class="muted" style="margin:8px 0 4px">'+h(g.name.replace("Eastern Conference","Est").replace("Western Conference","Ovest"))+'</h4><table class="tbl"><thead><tr><th>#</th><th class="l">Squadra</th><th>V</th><th>P</th><th>%</th><th>GB</th><th>SERIE</th></tr></thead><tbody>'+
        rows.map((x,i)=>{const id=String(x.team.id),me=ev&&(id===ev.home.id||id===ev.away.id);return'<tr class="'+(i<6?"zone-cl":i<10?"zone-el":"")+(me?" me":"")+'"><td>'+(i+1)+'</td><td class="l"><span class="tn"><img class="logo-t" src="'+h(x.team.logos&&x.team.logos[0]&&x.team.logos[0].href||"")+'" alt="" loading="lazy">'+h(x.team.displayName)+'</span></td><td>'+E.stat(x,"wins")+'</td><td>'+E.stat(x,"losses")+'</td><td>'+h(E.statD(x,"winPercent"))+'</td><td>'+h(E.statD(x,"gamesBehind"))+'</td><td>'+h(E.statD(x,"streak"))+'</td></tr>';}).join("")+'</tbody></table>';}).join("")+'</div><div class="legend"><span><i style="background:var(--blue)"></i>Playoff</span><span><i style="background:var(--orange)"></i>Play-in</span></div>';}
  const anyLive=()=>S.evs.some(x=>x.live)||S.evs.some(x=>x.state==="pre"&&new Date(x.date)-Date.now()<15*60000);
  SL.every(async()=>{await loadBoard();if(!S.sum)await loadGame(true);},()=>anyLive()?15000:180000);
  SL.every(async()=>{const ev=sel();if(ev&&ev.live)await loadGame(false);},10000,{delay:10000});
  SL.every(loadTable,600000,{delay:1500});
  SL.every(()=>{const el=cards.match.body.querySelector(".cdown"),ev=sel();if(el&&ev)el.textContent=SL.countdown(new Date(ev.date)-Date.now());},1000,{delay:1000});
};
})();
