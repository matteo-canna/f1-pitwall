/* Sport LIVE APP — RUGBY (Italia, Nations Championship, Sei Nazioni, Test match, Mondiali)
   Calendario e risultati, partita con cronologia punti ricavata dal punteggio, formazioni in campo, classifica, forma e precedenti. Dati: ESPN. */
(function(){
"use strict";
const h=SL.h,E=SL.espn,V=SL.viz,UI=SL.ui;
const L=SL.cfg.rugby;
const M=SL.sports.rugby={name:"Rugby",tab:"Rugby",icon:"🏉",color:"#3fa7d6"};
const compN=k=>(L.find(x=>x.k===k)||{}).n||"";

/* home e avvisi */
function item(ev){const sc=ev.state!=="pre";
  return{id:"rugby:"+ev.id,sport:"rugby",comp:ev.comp,date:ev.date,state:ev.state,live:ev.live,done:ev.done,status:ev.status,important:ev.important,ev,
    sig:E.score(ev)+"|"+ev.state,lines:[{n:ev.home.name,img:ev.home.logo,v:sc?ev.home.score:"",lose:ev.done&&ev.away.winner},{n:ev.away.name,img:ev.away.logo,v:sc?ev.away.score:"",lose:ev.done&&ev.home.winner}],
    foot:ev.venue,go:{sport:"rugby",c:ev.league,e:ev.id}};}
M.homeFeed=async function(day,ttl){const key=SL.dayKey(SL.addDays(Date.now(),day)),out=[];
  await Promise.all(L.map(async c=>{const d=await SL.tryGet(SL.ESPN+"rugby/"+c.k+"/scoreboard?dates="+key,{ttl});if(!d)return;
    (d.events||[]).forEach(e=>{const ev=E.norm(e,"rugby",c.k,c.n);if(SL.dayKey(ev.date)===key||(day===0&&ev.live))out.push(item(ev));});}));
  return out;};
const KIND=d=>d===5?"META":d===2?"TRASFORMAZIONE":d===3?"PIAZZATO":d===7?"META + TRASF.":d===8?"META + PIAZZATO":"+"+d;
M.onChange=function(p,it){const a=p.ev,b=it.ev,t=b.home.name+" "+E.score(b)+" "+b.away.name;
  const dh=(+b.home.score||0)-(+a.home.score||0),da=(+b.away.score||0)-(+a.away.score||0);
  if(dh>0||da>0){const d=dh>0?dh:da,who=dh>0?b.home.name:b.away.name;return{id:"p:"+b.id+":"+E.score(b),big:KIND(d),title:t,text:who+" · "+b.comp,color:who==="Italia"?"var(--ita)":"var(--cyan)",icon:who==="Italia"?"ita":"rugby"};}
  if(a.state==="pre"&&b.state==="in")return{id:"k:"+b.id,big:"VIA",title:b.home.name+" – "+b.away.name,text:b.comp,color:"var(--cyan)"};
  if(a.state==="in"&&b.state==="post")return{id:"f:"+b.id,big:"FINALE",title:t,text:b.comp,color:"var(--muted)"};
  return null;};

/* cronologia punti ricavata dai cambi di punteggio (ESPN non dà gli eventi del rugby) */
function trackScore(ev){if(!ev.live&&!ev.done)return;const k="rgtl."+ev.id,tl=SL.store.sget(k,{h:null,a:null,ev:[]});
  const hs=+ev.home.score||0,as=+ev.away.score||0;
  if(tl.h!=null&&ev.live){if(hs>tl.h)tl.ev.push({s:"h",d:hs-tl.h,c:ev.clock,sc:hs+"-"+as});if(as>tl.a)tl.ev.push({s:"a",d:as-tl.a,c:ev.clock,sc:hs+"-"+as});}
  tl.h=hs;tl.a=as;SL.store.sset(k,tl);}

/* fatti: ultima e prossima dell'Italia, capolista del Nations Championship / Sei Nazioni */
M.facts=async function(){
  const y=new Date().getFullYear(),all=[];
  await Promise.all(L.map(async c=>{for(const yy of [y,y+1]){const d=await SL.tryGet(SL.ESPN+"rugby/"+c.k+"/scoreboard?dates="+yy,{ttl:900000});
    ((d&&d.events)||[]).forEach(e=>{const ev=E.norm(e,"rugby",c.k,c.n);if(ev.home.name==="Italia"||ev.away.name==="Italia")all.push(ev);});}}));
  const done=all.filter(x=>x.done).sort((a,b)=>new Date(b.date)-new Date(a.date))[0],next=all.filter(x=>x.state==="pre").sort((a,b)=>new Date(a.date)-new Date(b.date))[0];
  const out=[];
  if(done)out.push({l:"Ultima dell'Italia",v:done.home.name+" "+E.score(done)+" "+done.away.name+" · "+done.comp,go:{sport:"rugby",c:"ita",e:done.id}});
  if(next)out.push({l:"Prossima dell'Italia",v:next.home.name+" – "+next.away.name+" · "+SL.when(next.date),go:{sport:"rugby",c:"ita",e:next.id}});
  for(const lg of ["17567","180659"]){const d=await SL.tryGet(SL.ESPN2+"rugby/"+lg+"/standings",{ttl:900000});const G=d?E.groups(d):[];
    const en=[].concat(...G.map(g=>g.entries));if(en.length){const top=en.sort((a,b)=>E.stat(b,"points")-E.stat(a,"points"))[0];out.push({l:"In testa · "+compN(lg),v:SL.tr.team(top.team.displayName)+" · "+E.stat(top,"points")+" pt"});break;}}
  return out;
};
const DEFS=[
  {k:"tv",n:"Diretta TV",sz:2,fixed:true},
  {k:"match",n:"Partita",sz:2},
  {k:"lineup",n:"Formazioni in campo",sz:2},
  {k:"matches",n:"Calendario e risultati",sz:3},
  {k:"table",n:"Classifica",sz:2},
  {k:"form",n:"Forma e precedenti",sz:1}
];
M.mount=function(ctx){
  const st=ctx.st;let comp=st.c||"ita";if(comp!=="ita"&&comp!=="live"&&!L.find(x=>x.k===comp))comp="ita";
  const liveMode=comp==="live";
  const r=document.createElement("div");r.className="row";
  r.appendChild(UI.chips([UI.liveChip("rugby"),{k:"ita",n:"Italia",ic:"ita"}].concat(L.map(x=>({k:x.k,n:x.n}))),comp,v=>SL.go({c:v,e:""})));
  ctx.sub.appendChild(r);
  if(liveMode){const r2=document.createElement("div");r2.className="row";r2.appendChild(UI.liveNote("Solo le partite in corso adesso, in tutte le competizioni seguite."));ctx.sub.appendChild(r2);}
  const cards=UI.mount(ctx.main,DEFS);UI.tv(cards.tv,"rugby");
  const S={evs:[],sel:st.e||"",sum:null};
  const sel=()=>S.evs.find(x=>x.id===S.sel);
  cards.matches.body.addEventListener("click",e=>{const b=e.target.closest(".mrow");if(b)select(b.dataset.ev);});
  function select(id){if(id===S.sel)return;S.sel=id;SL.setQuiet({e:id});drawList();S.sum=null;["match","lineup","form"].forEach(k=>cards[k].body.innerHTML='<div class="loading">Carico</div>');loadMatch();loadTable();}
  async function loadList(){
    const y=new Date().getFullYear(),list=comp==="ita"||liveMode?L:L.filter(x=>x.k===comp),all=[],seen=new Set();const today=SL.dayKey(Date.now());
    await Promise.all(list.map(async c=>{
      /* in "Live ora" basta il tabellone di oggi */
      const [a,b,t]=await Promise.all([liveMode?null:SL.tryGet(SL.ESPN+"rugby/"+c.k+"/scoreboard?dates="+y,{ttl:600000}),liveMode?null:SL.tryGet(SL.ESPN+"rugby/"+c.k+"/scoreboard?dates="+(y+1),{ttl:36e5}),SL.tryGet(SL.ESPN+"rugby/"+c.k+"/scoreboard?dates="+today,{ttl:15000})]);
      const evs=[].concat((t&&t.events)||[],(a&&a.events)||[],(b&&b.events)||[]);
      evs.forEach(e=>{if(seen.has(String(e.id)))return;const ev=E.norm(e,"rugby",c.k,c.n);if(comp==="ita"&&ev.home.name!=="Italia"&&ev.away.name!=="Italia")return;seen.add(ev.id);all.push(ev);});}));
    S.today=all;
    S.evs=(liveMode?all.filter(x=>x.live||(x.id===S.sel&&x.done)):all).sort((a,b)=>new Date(a.date)-new Date(b.date));
    S.evs.forEach(trackScore);
    if(!S.sel||!sel()){const now=Date.now();const p=S.evs.find(x=>x.live)||S.evs.filter(x=>x.done).pop()||S.evs.find(x=>new Date(x.date)>now)||S.evs[0];S.sel=p?p.id:"";if(S.sel)SL.setQuiet({e:S.sel});}
    drawList();}
  function drawList(){const c=cards.matches;
    if(liveMode&&!S.evs.length){const nx=(S.today||[]).filter(x=>x.state==="pre").sort((a,b)=>new Date(a.date)-new Date(b.date))[0];
      c.body.innerHTML='<div class="nolive">'+SL.ico("rugby")+'<div>'+(nx?"Nessuna partita in corso. La prossima: <b>"+h(nx.home.name+" – "+nx.away.name)+"</b> alle "+h(SL.fmtTime(nx.date))+" ("+h(nx.comp)+").":"Nessuna partita di rugby in corso e nessun'altra oggi nelle competizioni seguite.")+'</div></div>';c.sub("in corso adesso");return;}
    if(!S.evs.length){c.body.innerHTML=UI.empty("Nessuna partita trovata per questa scelta.");return;}
    const now=Date.now(),live=S.evs.filter(x=>x.live),next=S.evs.filter(x=>x.state==="pre"&&new Date(x.date)>now-36e5).slice(0,8),past=S.evs.filter(x=>x.done).slice(-12).reverse();
    const row=ev=>{const sc=ev.state!=="pre";const ita=ev.home.name==="Italia"||ev.away.name==="Italia";
      return'<button type="button" class="mrow'+(ev.id===S.sel?" sel":"")+(ita?" ":"")+'" data-ev="'+ev.id+'"'+(ita?' style="border-left:3px solid var(--ita)"':"")+'><span class="min'+(ev.live?" live":"")+'">'+h(ev.live?ev.clock||"LIVE":ev.done?SL.fmtDay(ev.date):SL.fmtDay(ev.date))+'</span>'+
        '<span class="tt"><img class="logo-t" src="'+h(ev.home.logo)+'" alt="" loading="lazy"><span>'+h(ev.home.name)+'</span></span><span class="s">'+(sc?h(ev.home.score):"")+'</span>'+
        '<span class="tt"><img class="logo-t" src="'+h(ev.away.logo)+'" alt="" loading="lazy"><span>'+h(ev.away.name)+'</span></span><span class="s">'+(sc?h(ev.away.score):"")+'</span>'+
        '<span class="last">'+h([comp==="ita"?ev.comp:"",ev.state==="pre"?SL.fmtTime(ev.date):"",ev.venue].filter(Boolean).join(" · "))+'</span></button>';};
    let s='<div class="mlist">';
    if(live.length)s+='<div class="grp-h">In diretta</div>'+live.map(row).join("");
    s+='<div class="grp-h">Prossime</div>'+(next.length?next.map(row).join(""):'<div class="muted">Nessuna partita in calendario per ora.</div>');
    if(past.length)s+='<div class="grp-h">Risultati</div>'+past.map(row).join("");
    c.body.innerHTML=s+'</div>';c.sub(liveMode?"in corso adesso":comp==="ita"?"Italia · tutte le competizioni":compN(comp));}
  async function loadMatch(){const ev=sel();if(!ev){["match","lineup","form"].forEach(k=>cards[k].body.innerHTML=UI.empty(liveMode?"Nessuna partita in corso adesso: appena ne inizia una compare qui.":"Scegli una partita."));return;}
    S.sum=await SL.tryGet(SL.ESPN+"rugby/"+ev.league+"/summary?event="+ev.id,{ttl:ev.live?10000:600000});
    drawMatch();drawLineup();drawForm();}
  function drawMatch(){const c=cards.match,ev=sel();if(!ev)return;const [ch,ca]=V.pair(ev.home.color,ev.away.color);
    const tm=t=>'<div class="tm">'+(t.logo?'<img src="'+h(t.logo)+'" alt="">':"")+'<div class="nm">'+h(t.name)+' '+SL.star("rugby","team",t.id,t.name)+'</div><div class="rec">'+h(t.rec||"")+'</div></div>';
    let s='<div class="bug">'+tm(ev.home)+'<div class="mid"><div class="score">'+(ev.state!=="pre"?h(ev.home.score)+'<i>–</i>'+h(ev.away.score):'<span style="font-size:.55em">'+h(SL.fmtTime(ev.date))+'</span>')+'</div><div class="clk">'+(ev.live?'<span class="tag live">'+h(ev.clock||"LIVE")+'</span>':ev.done?'<span class="tag">FINALE</span>':'<span class="tag">'+h(SL.when(ev.date))+'</span>')+'</div></div>'+tm(ev.away)+'</div>';
    const tl=SL.store.sget("rgtl."+ev.id,null);
    if(tl&&tl.ev.length){s+='<h4 class="muted" style="margin:12px 0 4px;font-size:11px;letter-spacing:.08em">PUNTI SEGNATI (visti in diretta)</h4><ul class="feed">'+tl.ev.slice().reverse().map(x=>'<li class="'+(x.d>=5?"goal":"")+'"><span class="t">'+h(x.c||"")+'</span><span>'+SL.ico(x.d>=5?"rugby":"posts")+'</span><span class="x"><b>'+h(KIND(x.d))+'</b> '+h(x.s==="h"?ev.home.name:ev.away.name)+'<small>'+h(x.sc)+'</small></span></li>').join("")+'</ul>';}
    else if(ev.live)s+='<p class="note">I punti segnati compaiono qui mentre segui la partita: i dati gratuiti danno solo il punteggio, l\'app ricava mete, trasformazioni e piazzati dai cambi.</p>';
    if(ev.state==="pre")s+='<p class="note" style="text-align:center">Calcio d\'inizio tra <b class="cdown">'+h(SL.countdown(new Date(ev.date)-Date.now()))+'</b></p>';
    const gi=(S.sum&&S.sum.gameInfo)||{};s+='<p class="note" style="text-align:center">'+[ev.comp,(gi.venue&&gi.venue.fullName)||ev.venue,gi.attendance?"Spettatori "+Number(gi.attendance).toLocaleString("it-IT"):""].filter(Boolean).map(h).join(" · ")+'</p>';
    c.body.innerHTML=s;c.sub(ev.comp);
    S.ch=ch;S.ca=ca;}
  /* posizioni standard 1-15 su campo orizzontale (casa attacca verso destra) */
  /* posizioni 1-15 (casa attacca verso destra): colonne ben separate, nomi sempre sotto il pallino */
  const POS={1:[45,20],2:[45,35],3:[45,50],4:[39,27.5],5:[39,42.5],6:[33,13],8:[33,35],7:[33,57],9:[27,45],10:[22,28],12:[17,41],13:[12.5,54],11:[11,7],14:[8,63],15:[4,34]};
  function drawLineup(){const c=cards.lineup,ev=sel(),R=(S.sum&&S.sum.rosters)||[];
    if(!R.length||!R.some(r=>(r.roster||[]).length)){c.body.innerHTML=UI.empty(ev&&ev.state==="pre"?"Le formazioni escono di solito due giorni prima della partita.":"Formazioni non disponibili.");c.sub("");return;}
    const side=r=>r.homeAway==="home"?"h":r.homeAway==="away"?"a":String(r.team&&r.team.id)===ev.home.id?"h":"a";
    const ch=S.ch||"#4f8ef7",ca=S.ca||"#f59b42";let g="";const bench={h:[],a:[]};
    R.forEach(r=>{const w=side(r),col=w==="h"?ch:ca;(r.roster||[]).forEach(p=>{const j=+p.jersey,a=p.athlete||{};
      if(j>=1&&j<=15&&POS[j]){let [x,y]=POS[j];if(w==="a"){x=100-x;y=70-y;}const last=(a.lastName||a.displayName||"").slice(0,10);
        g+='<g transform="translate('+x+' '+y+')"><circle r="2.4" fill="'+col+'" stroke="#0b0f19" stroke-width=".3"/><text y=".9" font-size="2.3" text-anchor="middle" fill="#fff" class="svgtxt">'+j+'</text><text y="4.6" font-size="1.75" text-anchor="middle" fill="#fff" class="svgtxt" style="paint-order:stroke;stroke:#000a;stroke-width:.5">'+h(last)+'</text>'+(p.captain?'<text x="2.6" y="-1.6" font-size="2" fill="#f2c230" class="svgtxt">C</text>':"")+'</g>';}
      else bench[w].push(p);});});
    const bl=(w,n)=>'<div><h4>'+h(n.toUpperCase())+' · PANCHINA</h4>'+bench[w].map(p=>'<div>'+h(p.jersey+" "+((p.athlete||{}).displayName||""))+(/replacement/i.test(p.position&&(p.position.displayName||p.position.name)||"")?"":' <span class="dim">'+h(SL.tr.rpos(p.position&&(p.position.displayName||p.position.name)))+'</span>')+'</div>').join("")+'</div>';
    c.body.innerHTML=V.rugby(g)+'<div class="bench">'+bl("h",ev.home.name)+bl("a",ev.away.name)+'</div><p class="note">1-3 prima linea · 4-5 seconde linee · 6-8 terza linea · 9 mediano di mischia · 10 apertura · 12-13 centri · 11-14 ali · 15 estremo.</p>';
    c.sub(ev.home.name+" a sinistra");}
  function drawForm(){const c=cards.form,ev=sel(),sum=S.sum||{};if(!ev)return;
    const res={W:"V",D:"P",L:"S"};let s="";
    (sum.lastFiveGames||[]).forEach(t=>{const n=SL.tr.team((t.team||{}).displayName||"");s+='<h4 class="muted" style="margin:6px 0 4px">'+h(n)+' · ultime partite</h4>'+(t.events||[]).slice(0,5).map(e=>'<div class="row" style="justify-content:space-between;border-bottom:1px solid var(--line);padding:3px 0"><span>'+h(SL.tr.team((e.opponent||{}).displayName||""))+'</span><span><b style="color:'+(e.gameResult==="W"?"var(--green)":e.gameResult==="L"?"var(--red)":"var(--muted)")+'">'+h(res[e.gameResult]||e.gameResult||"")+'</b> '+h(e.score||"")+'</span></div>').join("");});
    const hh=(sum.headToHeadGames||[])[0];if(hh&&hh.events&&hh.events.length)s+='<h4 class="muted" style="margin:10px 0 4px">Precedenti</h4>'+hh.events.slice(0,5).map(e=>'<div class="row" style="justify-content:space-between;border-bottom:1px solid var(--line);padding:3px 0"><span>'+h(SL.fmtDay(e.gameDate||e.date||""))+'</span><span>'+h(e.score||"")+'</span></div>').join("");
    c.body.innerHTML=s||UI.empty("Dati di forma non disponibili.");}
  async function loadTable(){const c=cards.table,ev=sel();if(liveMode&&!ev){c.body.innerHTML=UI.empty("La classifica compare quando c'è una partita in corso.");c.sub("");return;}
    const lg=ev?ev.league:comp==="ita"?"17567":comp;
    if(lg==="289234"){c.body.innerHTML=UI.empty("I test match non hanno classifica.");c.sub("");return;}
    const d=await SL.tryGet(SL.ESPN2+"rugby/"+lg+"/standings",{ttl:600000});const G=d?E.groups(d):[];
    if(!G.length){c.body.innerHTML=UI.empty("Classifica non disponibile.");return;}
    c.sub(compN(lg));
    c.body.innerHTML='<div class="scroll">'+G.map(g=>'<h4 class="muted" style="margin:8px 0 4px">'+h(g.name)+'</h4><table class="tbl"><thead><tr><th>#</th><th class="l">Squadra</th><th>G</th><th>V</th><th>N</th><th>P</th><th>DIFF</th><th>METE</th><th>BONUS</th><th>PT</th></tr></thead><tbody>'+
      g.entries.slice().sort((a,b)=>E.stat(b,"points")-E.stat(a,"points")||E.stat(b,"pointsDifference")-E.stat(a,"pointsDifference")).map((x,i)=>{const n=SL.tr.team(x.team.displayName),me=ev&&(String(x.team.id)===ev.home.id||String(x.team.id)===ev.away.id);
        return'<tr class="'+(n==="Italia"?"ita":"")+(me?" me":"")+'"><td>'+(i+1)+'</td><td class="l"><span class="tn"><img class="logo-t" src="'+h(x.team.logos&&x.team.logos[0]&&x.team.logos[0].href||"")+'" alt="" loading="lazy">'+h(n)+'</span></td><td>'+E.stat(x,"gamesPlayed")+'</td><td>'+E.stat(x,"gamesWon")+'</td><td>'+E.stat(x,"gamesDrawn")+'</td><td>'+E.stat(x,"gamesLost")+'</td><td>'+h(E.statD(x,"pointsDifference"))+'</td><td>'+E.stat(x,"triesFor")+'</td><td>'+E.stat(x,"bonusPoints")+'</td><td><b>'+E.stat(x,"points")+'</b></td></tr>';}).join("")+'</tbody></table>').join("")+'</div><p class="note">Bonus: punti extra per 4+ mete o sconfitta di misura.</p>';}
  const anyLive=()=>S.evs.some(x=>x.live)||S.evs.some(x=>x.state==="pre"&&new Date(x.date)-Date.now()<15*60000&&new Date(x.date)>Date.now());
  SL.every(async()=>{await loadList();if(!S.sum)await loadMatch();else{const ev=sel();if(ev&&ev.live){await loadMatch();}}},()=>liveMode||anyLive()?15000:300000);
  SL.every(loadTable,600000,{delay:1200});
  SL.every(()=>{const el=cards.match.body.querySelector(".cdown"),ev=sel();if(el&&ev)el.textContent=SL.countdown(new Date(ev.date)-Date.now());},1000,{delay:1000});
};
})();
