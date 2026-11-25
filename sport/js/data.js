/* Sport LIVE APP — dati ESPN normalizzati (calcio, NBA, rugby) e configurazione competizioni */
(function(){
"use strict";
const E=SL.espn={};
SL.cfg={
  soccer:[
    {k:"ita.1",n:"Serie A",s:"SERIE A"},
    {k:"uefa.champions",n:"Champions League",s:"UCL"},
    {k:"uefa.europa",n:"Europa League",s:"UEL"},
    {k:"uefa.europa.conf",n:"Conference League",s:"UECL"},
    {k:"ita",n:"Nazionale",s:"ITALIA",multi:["uefa.nations","fifa.worldq.uefa","fifa.friendly","uefa.euroq","fifa.world","uefa.euro"],only:"Italy"},
    {k:"ita.coppa_italia",n:"Coppa Italia",s:"COPPA ITA"},
    {k:"eng.1",n:"Premier League",s:"PREMIER"},
    {k:"esp.1",n:"LaLiga",s:"LALIGA"},
    {k:"ger.1",n:"Bundesliga",s:"BUNDES"},
    {k:"fra.1",n:"Ligue 1",s:"LIGUE 1"}
  ],
  soccerNames:{"uefa.nations":"Nations League","fifa.worldq.uefa":"Qualificazioni Mondiali","fifa.friendly":"Amichevole","uefa.euroq":"Qualificazioni Europei","fifa.world":"Mondiali","uefa.euro":"Europei"},
  rugby:[
    {k:"17567",n:"Nations Championship",s:"NATIONS CH."},
    {k:"180659",n:"Sei Nazioni",s:"6 NAZIONI"},
    {k:"289234",n:"Test match",s:"TEST"},
    {k:"164205",n:"Coppa del Mondo",s:"RWC"}
  ]
};
SL.cfg.soccerLeagues=()=>{const o=[];SL.cfg.soccer.forEach(c=>{(c.multi||[c.k]).forEach(l=>o.push({league:l,comp:c}));});return o;};

/* club italiani (per riconoscere le italiane nelle coppe) */
E.itaClubs=new Set(SL.store.get("itaClubs",[]));
E.loadItaClubs=async()=>{if(E.itaClubs.size>15&&SL.store.get("itaClubsT",0)>Date.now()-7*864e5)return;
  const d=await SL.tryGet(SL.ESPN2+"soccer/ita.1/standings",{ttl:36e5});if(!d)return;
  const ids=[];E.entries(d).forEach(x=>ids.push(String(x.team.id)));if(ids.length){E.itaClubs=new Set(ids);SL.store.set("itaClubs",ids);SL.store.set("itaClubsT",Date.now());}};

/* normalizza un evento del tabellone ESPN */
E.norm=function(e,sport,league,compName){
  const c=(e.competitions||[])[0]||{},st=c.status||e.status||{},ty=st.type||{};
  const natL=/^(uefa\.nations|fifa\.|uefa\.euro$|uefa\.euroq)/.test(league||"");
  const side=w=>{const x=(c.competitors||[]).find(k=>k.homeAway===w)||{};const t=x.team||{};
    const nm=t.displayName||t.name||"";
    return{id:String(t.id||""),name:(sport==="rugby"||natL)?SL.tr.team(nm):nm,
      short:t.shortDisplayName||t.abbreviation||nm,abbr:t.abbreviation||"",logo:t.logo||(t.logos&&t.logos[0]&&t.logos[0].href)||"",
      color:t.color,alt:t.alternateColor,score:x.score==null||x.score===""?null:x.score,winner:!!x.winner,
      rec:(x.records&&x.records[0]&&x.records[0].summary)||"",ls:(x.linescores||[]).map(l=>l.displayValue!=null?l.displayValue:l.value),form:x.form||""};};
  const home=side("home"),away=side("away");
  let red={home:0,away:0},last="";
  (c.details||[]).forEach(d=>{const t=d.team&&String(d.team.id);const w=t===home.id?"home":t===away.id?"away":null;if(d.redCard&&w)red[w]++;
    if(d.scoringPlay){const who=(d.athletesInvolved||[])[0];last=(who?who.shortName||who.displayName:"")+" "+(d.clock&&d.clock.displayValue||"");}});
  home.red=red.home;away.red=red.away;
  /* tutti i marcatori (calcio), cartellini, mete e calci (rugby): per le caselle della home */
  const goals=[],cards=[],plays=[],yel={home:0,away:0};
  const nm=d=>{const a=(d.athletesInvolved||[])[0];return a?(a.shortName||a.displayName||""):"";};
  (c.details||[]).forEach(d=>{const t=d.team&&String(d.team.id);const w=t===home.id?"home":t===away.id?"away":null;if(!w)return;const m=d.clock&&d.clock.displayValue||"";
    if(sport==="rugby"){const k=String(d.type&&d.type.text||"").toLowerCase();const kind=/try/.test(k)?"meta":/conversion/.test(k)?"trasf":/drop/.test(k)?"drop":/penalty/.test(k)?"piazz":"";if(kind)plays.push({side:w,n:nm(d),m,kind});return;}
    if(d.scoringPlay)goals.push({side:w,n:nm(d),m,pen:!!d.penaltyKick,og:!!d.ownGoal});
    if(d.redCard)cards.push({side:w,n:nm(d),m,red:true});else if(d.yellowCard)yel[w]++;});
  /* statistiche e migliori (tiri, possesso, angoli; punti, rimbalzi, assist) */
  const sideStats=w=>{const x=(c.competitors||[]).find(k=>k.homeAway===w)||{},o={};(x.statistics||[]).forEach(t=>{o[t.name]=t.displayValue;});
    const L=(x.leaders||[]).map(l=>{const y=(l.leaders||[])[0];return y?{k:l.name,n:y.athlete&&(y.athlete.shortName||y.athlete.displayName)||"",v:y.displayValue}:null;}).filter(Boolean);return{st:o,lead:L};};
  const sh=sideStats("home"),sa=sideStats("away");
  home.stats=sh.st;away.stats=sa.st;home.lead=sh.lead;away.lead=sa.lead;
  const state=ty.state||"pre";
  let clock="";
  if(state==="in"){clock=sport==="calcio"?(ty.shortDetail||st.displayClock||"").replace(/^HT$/,"Intervallo"):sport==="basket"?(ty.shortDetail||""):(st.displayClock||ty.shortDetail||"");
    clock=SL.tr.status(clock)||clock;}
  const status=state==="pre"?SL.when(e.date):state==="in"?clock:(SL.tr.status(ty.description)||ty.description||"Finale");
  const comp=compName||(SL.cfg.soccerNames[league])||"";
  const ev={id:String(e.id),sport,league,comp,date:e.date,state,live:state==="in",done:state==="post",status,clock,period:st.period||0,
    detail:SL.tr.status(ty.shortDetail||ty.detail||""),home,away,last,goals,cards,plays,yel,odds:((c.odds||[])[0]||{}).details||"",venue:(c.venue&&c.venue.fullName)||"",name:e.name||"",note:(c.notes&&c.notes[0]&&c.notes[0].headline)||"",
    broadcast:""}; /* le emittenti ESPN sono americane: inutili in Italia */
  ev.ita=E.isIta(ev);ev.fav=E.isFav(ev);ev.important=ev.fav||ev.ita; /* Nazionale o club italiani nelle coppe */
  return ev;
};
E.isIta=function(ev){const nat=ev.home.name==="Italia"||ev.away.name==="Italia"||ev.home.abbr==="ITA"&&ev.sport!=="basket"||ev.away.abbr==="ITA"&&ev.sport!=="basket";
  ev.itaNat=nat&&(ev.sport==="calcio"||ev.sport==="rugby");
  if(ev.sport==="calcio"&&ev.league!=="ita.1"&&!/^ita\./.test(ev.league)&&(E.itaClubs.has(ev.home.id)||E.itaClubs.has(ev.away.id)))return true;
  return nat;};
/* ---------- marcatori e classifica: usati da home, multi-partita, avvisi, striscia, preferiti, agenda ---------- */
const sur=n=>String(n||"").replace(/^[A-ZÀ-Ý]\.\s*/,"");
/* gol di una squadra raggruppati per giocatore: [{n, m:["45' rig.","51'"]}] */
E.goalsBy=(ev,w)=>{const by=[];(ev.goals||[]).filter(g=>g.side===w).forEach(g=>{let x=by.find(y=>y.n===g.n);if(!x)by.push(x={n:g.n,m:[]});x.m.push(g.m+(g.pen?" rig.":g.og?" aut.":""));});return by;};
/* testo dei marcatori di una squadra: "Varela 45' rig., 51', Robinson 59'" (short: solo cognomi) */
E.goalsText=(ev,w,short)=>E.goalsBy(ev,w).map(x=>(short?sur(x.n):x.n)+" "+x.m.join(", ")).join(", ");
E.lastGoal=ev=>{const g=(ev.goals||[]).slice(-1)[0];return g?sur(g.n)+" "+g.m+(g.pen?" (rig.)":g.og?" (aut.)":""):"";};
/* riga compatta per liste: "⚽ Monza: Varela 45' rig., 51' · Fiorentina: Kean 80'" con espulsi */
E.scoreLine=function(ev){if(!ev||!(ev.live||ev.done))return"";const h=SL.h,out=[];
  if(ev.sport==="calcio"){["home","away"].forEach(w=>{const g=E.goalsText(ev,w,true),r=(ev.cards||[]).filter(c=>c.side===w&&c.red).map(c=>sur(c.n)+" "+c.m);
      if(g||r.length)out.push('<b>'+h(ev[w].short||ev[w].name)+'</b> '+h(g)+(r.length?' <span class="rcl"><i class="rcard"></i>'+h(r.join(", "))+'</span>':""));});
    return out.length?SL.ico("calcio")+out.join(" · "):"";}
  if(ev.sport==="rugby"){["home","away"].forEach(w=>{const T=(ev.plays||[]).filter(x=>x.side===w&&x.kind==="meta");if(T.length)out.push('<b>'+h(ev[w].short||ev[w].name)+'</b> '+h(T.map(x=>sur(x.n)+" "+x.m).join(", ")));});
    return out.length?SL.ico("rugby")+"Mete: "+out.join(" · "):"";}
  return"";};
/* classifica di un campionato: squadra → {pos, pts} (una richiesta all'ora) */
const TABLED={"ita.1":1,"eng.1":1,"esp.1":1,"ger.1":1,"fra.1":1,"uefa.champions":1,"uefa.europa":1,"uefa.europa.conf":1};
E.table=async function(league){if(!TABLED[league])return null;const d=await SL.tryGet(SL.ESPN2+"soccer/"+league+"/standings",{ttl:36e5});if(!d)return null;
  const m={};E.entries(d).forEach(x=>{const id=String(x.team&&x.team.id||"");if(id)m[id]={pos:E.stat(x,"rank"),pts:E.stat(x,"points"),gp:E.stat(x,"gamesPlayed")};});return m;};
E.attachTable=async function(evs){const L=[...new Set(evs.map(ev=>ev.league).filter(l=>TABLED[l]))];
  const T={};await Promise.all(L.map(async l=>{T[l]=await E.table(l).catch(()=>null);}));
  evs.forEach(ev=>{const t=T[ev.league];if(!t)return;ev.home.rank=t[ev.home.id]||null;ev.away.rank=t[ev.away.id]||null;});return evs;};
E.isFav=ev=>SL.fav.has(SL.fav.key(ev.sport,"team",ev.home.id))||SL.fav.has(SL.fav.key(ev.sport,"team",ev.away.id));
E.score=ev=>(ev.home.score==null?"-":ev.home.score)+"-"+(ev.away.score==null?"-":ev.away.score);

/* tabellone di un giorno */
E.board=async function(path,dateKey,opt){
  const url=SL.ESPN+path+"/scoreboard"+(dateKey?"?dates="+dateKey:"");
  return SL.get(url,opt);
};
/* calcio: tutte le partite di una competizione in un giorno (la Nazionale unisce più tornei) */
E.soccerDay=async function(comp,dateKey,ttl){
  const leagues=comp.multi||[comp.k],out=[];
  await Promise.all(leagues.map(async l=>{const d=await SL.tryGet(SL.ESPN+"soccer/"+l+"/scoreboard?dates="+dateKey,{ttl:ttl==null?15000:ttl});if(!d)return;
    (d.events||[]).forEach(e=>{const ev=E.norm(e,"calcio",l,comp.multi?SL.cfg.soccerNames[l]:comp.n);ev.compK=comp.k;
      if(comp.only&&ev.home.name!=="Italia"&&ev.away.name!=="Italia")return;out.push(ev);});}));
  return E.sort(out);
};
E.sort=list=>list.sort((a,b)=>(b.live-a.live)||(a.done-b.done)||(new Date(a.date)-new Date(b.date)));
E.summary=(sport,league,id,ttl)=>SL.get(SL.ESPN+sport+"/"+league+"/summary?event="+id,{ttl:ttl==null?10000:ttl});
E.entries=function(d){const out=[];const walk=n=>{if(!n)return;if(n.standings&&n.standings.entries)n.standings.entries.forEach(x=>{x._group=n.name||n.abbreviation||"";out.push(x);});(n.children||[]).forEach(walk);};walk(d);return out;};
E.groups=function(d){const out=[];const walk=n=>{if(!n)return;if(n.standings&&n.standings.entries)out.push({name:n.name||"",entries:n.standings.entries});(n.children||[]).forEach(walk);};walk(d);return out;};
E.stat=(entry,name)=>{const s=(entry.stats||[]).find(x=>x.name===name||x.type===name);return s?(s.value!=null?s.value:+s.displayValue):0;};
E.statD=(entry,name)=>{const s=(entry.stats||[]).find(x=>x.name===name||x.type===name);return s?s.displayValue:"";};

/* tessera partita per la striscia in alto */
E.tile=function(ev,sel){
  const sc=ev.state!=="pre";const hw=ev.done&&ev.home.winner,aw=ev.done&&ev.away.winner;
  const img=t=>t.logo?'<img src="'+SL.h(t.logo)+'" alt="" loading="lazy">':'<span></span>';
  return'<button type="button" class="mtile'+(ev.important?" fav":"")+'" data-ev="'+ev.id+'" data-lg="'+SL.h(ev.league)+'" aria-pressed="'+(ev.id===sel)+'">'+
    '<span class="st"><span>'+SL.h(ev.comp)+'</span><span class="'+(ev.live?"live":"")+'">'+(ev.live?"● ":"")+SL.h(ev.status)+'</span></span>'+
    img(ev.home)+'<span class="tn '+(aw?"l":"w")+'">'+SL.h(ev.home.name)+(ev.home.red?'<i class="rc" style="display:inline-block;width:7px;height:10px;background:var(--red);margin-left:4px;border-radius:1px"></i>':"")+'</span><span class="sc '+(aw?"l":"w")+'">'+(sc?SL.h(ev.home.score):"")+'</span>'+
    img(ev.away)+'<span class="tn '+(hw?"l":"w")+'">'+SL.h(ev.away.name)+(ev.away.red?'<i class="rc" style="display:inline-block;width:7px;height:10px;background:var(--red);margin-left:4px;border-radius:1px"></i>':"")+'</span><span class="sc '+(hw?"l":"w")+'">'+(sc?SL.h(ev.away.score):"")+'</span></button>';
};
})();
