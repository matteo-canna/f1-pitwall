/* Sport LIVE APP — TENNIS (ATP)
   Partite di oggi, partita, italiani, tabellone, ranking ATP, calendario tornei. In evidenza italiani e grandi eventi. Dati: ESPN. */
(function(){
"use strict";
const h=SL.h,UI=SL.ui;
const M=SL.sports.tennis={name:"Tennis ATP",tab:"Tennis",icon:"🎾",color:"#c9dc3c"};
const BASE=SL.ESPN+"tennis/atp/";
const M1000=/Indian Wells|BNP Paribas Open|Miami Open|Monte[- ]Carlo|Madrid|Internazionali BNL|Italian Open|National Bank Open|Canadian Open|Omnium Banque|Cincinnati|Western & Southern|Shanghai|Paris Masters|Rolex Paris/i;
const M500=/ABN Amro|Rio Open|Abierto Mexicano|Mexican Open|Dubai|Qatar ExxonMobil|Barcelona|Halle|Terra Wortmann|Queen'?s|cinch|HSBC Championships|Hamburg|Mubadala Citi DC|Washington|China Open|Kinoshita|Japan Open|Erste Bank|Vienna|Swiss Indoors|Basel/i;
M.cat=e=>e.major?{k:"slam",n:"SLAM"}:/ATP Finals/i.test(e.name)?{k:"fin",n:"FINALS"}:M1000.test(e.name)?{k:"1000",n:"MASTERS 1000"}:/Next Gen/i.test(e.name)?{k:"ng",n:"NEXT GEN"}:M500.test(e.name)?{k:"500",n:"ATP 500"}:/United Cup|Laver Cup|Davis/i.test(e.name)?{k:"team",n:"A SQUADRE"}:{k:"250",n:"ATP 250"};
const big=c=>c.k==="slam"||c.k==="1000"||c.k==="fin";
const isIta=a=>a&&((a.flag&&/\/ita\.png/i.test(a.flag.href||""))||/^Italy$/i.test(a.flag&&a.flag.alt||"")||a.citizenshipCountry==="ITA");

/* normalizza una partita */
function pl(x){const a=x.athlete||{},r=x.roster||{};let name=a.displayName||r.displayName||r.shortDisplayName||((r.athletes||[]).map(z=>z.shortName||z.displayName).join(" / "))||"—";
  const flag=(a.flag&&a.flag.href)||((r.athletes||[])[0]&&r.athletes[0].flag&&r.athletes[0].flag.href)||"";
  const ita=isIta(a)||(r.athletes||[]).some(isIta);
  return{id:String(a.id||x.id||""),name,short:a.shortName||name,flag,cc:(a.flag&&a.flag.alt)||"",ita,seed:(x.curatedRank&&x.curatedRank.current)||null,winner:!!x.winner,
    sets:(x.linescores||[]).map(l=>({v:l.value!=null?Math.round(l.value):l.displayValue,w:!!l.winner,tb:l.tiebreak})),serve:!!x.possession};}
function norm(ev,g,c){
  const st=(c.status||{}).type||{},state=st.state||"pre",cat=M.cat(ev);
  const ps=(c.competitors||[]).slice().sort((a,b)=>(a.order||0)-(b.order||0)).map(pl);
  const fav=ps.some(p=>SL.fav.has(SL.fav.key("tennis","player",p.id)));
  const m={id:String(c.id),tid:String(ev.id),tourn:ev.name.replace(/ presented by.*$/i,""),cat,big:big(cat),type:/doubles/i.test(g.grouping&&g.grouping.displayName||"")?"D":"S",
    round:SL.tr.round(c.round&&c.round.displayName),date:c.date,timeValid:c.timeValid!==false,state,live:state==="in",done:state==="post",
    court:(c.venue&&c.venue.court)||"",p:ps,note:(c.notes&&c.notes[0]&&c.notes[0].text)||"",period:(c.status||{}).period||0,
    detail:st.shortDetail||st.description||""};
  m.ita=ps.some(p=>p.ita);m.fav=fav;m.important=fav||(m.ita&&m.type==="S");
  m.status=m.live?"In corso · "+(m.period?m.period+"° set":""):m.done?(/retire|ret\./i.test(m.detail+m.note)?"Ritiro":/walkover|w\/o/i.test(m.detail+m.note)?"Walkover":"Finale"):(m.timeValid?SL.when(m.date):SL.relDay(m.date)+" · orario da definire");
  return m;}
async function week(key,ttl){const d=await SL.tryGet(BASE+"scoreboard"+(key?"?dates="+key:""),{ttl:ttl==null?20000:ttl});if(!d)return{evs:[],matches:[]};
  const matches=[];(d.events||[]).forEach(ev=>(ev.groupings||[]).forEach(g=>(g.competitions||[]).forEach(c=>matches.push(norm(ev,g,c)))));
  return{evs:d.events||[],matches};}
const setsStr=m=>m.p.map(p=>p.sets.map(s=>s.v).join(" ")).join(" | ");
function item(m){const lose=i=>m.done&&!m.p[i].winner&&m.p[1-i]&&m.p[1-i].winner;
  return{id:"tennis:"+m.id,sport:"tennis",comp:m.tourn+(m.round?" · "+m.round:""),date:m.date,state:m.state,live:m.live,done:m.done,status:m.live?"LIVE":m.status,important:m.important,m,
    sig:setsStr(m)+"|"+m.state,
    lines:m.p.map((p,i)=>({n:(p.seed?"("+p.seed+") ":"")+p.name,img:p.flag,ita:p.ita,v:p.sets.map(s=>s.v).join(" "),lose:lose(i)})),
    foot:[m.cat.n,m.court].filter(Boolean).join(" · "),go:{sport:"tennis",t:m.tid,e:m.id}};}
M.homeFeed=async function(day,ttl){
  const key=day===0?"":SL.dayKey(SL.addDays(Date.now(),day));const tgt=SL.dayKey(SL.addDays(Date.now(),day));
  const {matches}=await week(key,ttl);
  return matches.filter(m=>(m.type==="S"||m.ita)&&(SL.dayKey(m.date)===tgt||(day===0&&m.live))).map(item);};
M.onChange=function(p,it){const a=p.m,b=it.m;const nm=b.p.map(x=>x.name).join(" – ");
  const score=b.p[0].sets.map((s,i)=>s.v+"-"+((b.p[1].sets[i]||{}).v||0)).join(" ");
  if(a.state!=="post"&&b.state==="post"){const w=b.p.find(x=>x.winner);return{id:"w:"+b.id,big:w&&w.ita?"🇮🇹 VINCE":"FINE",title:w?w.name+" vince":nm,text:score+" · "+b.tourn+" "+b.round,color:w&&w.ita?"var(--ita)":"var(--yellow)"};}
  const na=a.p[0].sets.length,nb=b.p[0].sets.length;
  if(nb>na&&na>0){const i=na-1,w=(b.p[0].sets[i]||{}).v>(b.p[1].sets[i]||{}).v?b.p[0]:b.p[1];return{id:"s:"+b.id+":"+na,big:"SET",title:w.name+" vince il "+na+"° set",text:score+" · "+b.tourn,color:"var(--yellow)"};}
  if(a.state==="pre"&&b.state==="in")return{id:"k:"+b.id,big:"VIA",title:nm,text:b.tourn+" · "+b.round+(b.court?" · "+b.court:""),color:"var(--cyan)"};
  return null;};

const DEFS=[
  {k:"match",n:"Partita",sz:2},
  {k:"today",n:"Partite",sz:2},
  {k:"ita",n:"Italiani",sz:2},
  {k:"draw",n:"Tabellone",sz:3,couch:false},
  {k:"rank",n:"Ranking ATP",sz:2},
  {k:"cal",n:"Calendario tornei",sz:2},
  {k:"tv",n:"Diretta TV",sz:2,couch:false}
];
M.mount=function(ctx){
  const st=ctx.st;const S={evs:[],matches:[],t:st.t||"",sel:st.e||"",f:st.f||"all",type:"S",rank:null};
  const r1=document.createElement("div");r1.className="row";const r2=document.createElement("div");r2.className="row";ctx.sub.append(r1,r2);
  const cards=UI.mount(ctx.main,DEFS);UI.tv(cards.tv,"tennis");
  UI.seg(cards.today,[["all","Tutti"],["ita","Italiani"],["fav","★"]],S.f,v=>{S.f=v;SL.setQuiet({f:v==="all"?"":v});drawToday();});
  UI.seg(cards.today,[["S","Singolare"],["D","Doppio"]],"S",v=>{S.type=v;drawToday();});
  const pick=id=>{S.sel=id;SL.setQuiet({e:id});drawToday();drawMatch();drawDraw();};
  ctx.main.addEventListener("click",e=>{if(e.target.closest(".star"))return;const b=e.target.closest(".tmatch[data-m]");if(b)pick(b.dataset.m);});
  const T=()=>S.evs.find(e=>String(e.id)===S.t);
  async function load(){
    const w=await week("",20000);S.evs=w.evs;S.matches=w.matches;
    if(!S.t||!T()){const live=S.matches.find(m=>m.live&&m.ita)||S.matches.find(m=>m.live);S.t=live?live.tid:(S.evs.find(e=>M.cat(e).k!=="250")||S.evs[0]||{}).id||"";S.t=String(S.t);}
    if(!S.sel||!S.matches.find(m=>m.id===S.sel)){const ms=S.matches.filter(m=>m.tid===S.t&&m.type==="S");const today=SL.dayKey(Date.now()),pre=ms.filter(m=>m.state==="pre").sort((a,b)=>new Date(a.date)-new Date(b.date));
      const p=ms.find(m=>m.live&&m.ita)||ms.find(m=>m.live)||ms.find(m=>m.ita&&!m.done)||pre.find(m=>SL.dayKey(m.date)===today)||ms.filter(m=>m.done).sort((a,b)=>new Date(b.date)-new Date(a.date))[0]||pre[0]||ms[0];S.sel=p?p.id:"";}
    r1.innerHTML="";
    r1.appendChild(UI.chips(S.evs.map(e=>{const c=M.cat(e);return{k:String(e.id),n:e.name.replace(/ presented by.*$/i,"")+" · "+c.n,live:S.matches.some(m=>m.tid===String(e.id)&&m.live)};}),S.t,v=>{S.t=v;S.sel="";SL.setQuiet({t:v,e:""});load();}));
    const ev=T();r2.innerHTML=ev?'<span class="tag'+(big(M.cat(ev))?" big":"")+'">'+h(M.cat(ev).n)+'</span><span class="muted">'+h([SL.fmtDay(ev.date)+(ev.endDate?" – "+SL.fmtDay(ev.endDate):""),ev.venue&&ev.venue.displayName].filter(Boolean).join(" · "))+'</span>':'<span class="muted">Nessun torneo ATP in corso questa settimana.</span>';
    drawToday();drawMatch();drawDraw();drawIta();}
  const tm=(m,selc)=>{const lose=i=>m.done&&!m.p[i].winner;const n=Math.max(...m.p.map(p=>p.sets.length),0);
    return'<div role="button" tabindex="0" class="tmatch'+(m.ita?" ita":"")+(m.id===S.sel?" sel":"")+'" data-m="'+m.id+'"><span class="hd">'+(m.live?'<span class="tag live">LIVE</span>':"")+'<span>'+h(m.round)+'</span><span>'+h(m.court)+'</span><span style="margin-left:auto">'+h(m.live?(m.period?m.period+"° set":""):m.status)+'</span></span>'+
      m.p.map((p,i)=>'<span class="pl '+(lose(i)?"l":"w")+'">'+(p.flag?'<img class="flag" src="'+h(p.flag)+'" alt="'+h(p.cc)+'" loading="lazy">':"")+'<span>'+(p.seed?'<span class="dim">('+p.seed+')</span> ':"")+h(p.name)+(p.winner?" ✓":"")+'</span>'+SL.star("tennis","player",p.id,p.name)+'</span><span class="sets">'+Array.from({length:n},(_,k)=>{const s=p.sets[k]||{};return'<b class="'+(s.w?"w":"l")+'">'+h(s.v==null?"":s.v)+(s.tb!=null?'<sup>'+h(s.tb)+'</sup>':"")+'</b>';}).join("")+'</span>').join("")+'</div>';};
  function drawToday(){const c=cards.today;const today=SL.dayKey(Date.now());
    let L=S.matches.filter(m=>m.type===S.type&&(m.live||SL.dayKey(m.date)===today));
    let note="Oggi";if(!L.length){L=S.matches.filter(m=>m.type===S.type&&m.tid===S.t).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,24);note="Ultime partite del torneo";}
    if(S.f==="ita")L=L.filter(m=>m.ita);if(S.f==="fav")L=L.filter(m=>m.fav);
    L.sort((a,b)=>(b.live-a.live)||(b.important-a.important)||(a.done-b.done)||(new Date(a.date)-new Date(b.date)));
    c.sub(note+" · "+L.length);
    c.body.innerHTML=L.length?'<div class="scroll" style="display:flex;flex-direction:column;gap:6px">'+L.map(m=>tm(m)).join("")+'</div>':UI.empty(S.f==="ita"?"Nessun italiano in campo oggi.":S.f==="fav"?"Nessun preferito in campo. Tocca ★ accanto a un tennista.":"Nessuna partita oggi.");}
  function drawMatch(){const c=cards.match,m=S.matches.find(x=>x.id===S.sel);
    if(!m){c.body.innerHTML=UI.empty("Scegli una partita.");c.sub("");return;}
    const n=Math.max(...m.p.map(p=>p.sets.length),1);
    const rk=id=>{const r=S.rank&&S.rank.find(x=>String(x.athlete&&x.athlete.id)===id);return r?"N. "+r.current+" ATP":"";};
    let s='<div class="row" style="justify-content:space-between;margin-bottom:10px"><span class="tag'+(m.big?" big":"")+'">'+h(m.cat.n)+'</span><span class="muted">'+h([m.tourn,m.round,m.court].filter(Boolean).join(" · "))+'</span>'+(m.live?'<span class="tag live">LIVE</span>':'<span class="tag">'+h(m.status)+'</span>')+'</div>';
    s+='<table class="tbl" style="font-size:1.2em"><thead><tr><th class="l">Giocatore</th>'+Array.from({length:n},(_,i)=>'<th>SET '+(i+1)+'</th>').join("")+'</tr></thead><tbody>'+
      m.p.map(p=>'<tr class="'+(p.ita?"ita":"")+'"><td class="l"><span class="tn" style="max-width:none">'+(p.flag?'<img class="flag" src="'+h(p.flag)+'" alt="">':"")+'<b>'+h(p.name)+'</b>'+(p.seed?' <span class="dim">('+p.seed+')</span>':"")+(p.winner?' <span class="tag ok">VINCE</span>':"")+' <span class="dim">'+h(rk(p.id))+'</span>'+SL.star("tennis","player",p.id,p.name)+'</span></td>'+
        Array.from({length:n},(_,i)=>{const s2=p.sets[i]||{};return'<td style="font:900 1.6em/1 var(--f-display);'+(s2.w?"":"color:var(--muted)")+'">'+h(s2.v==null?"":s2.v)+(s2.tb!=null?'<sup style="font-size:.5em">'+h(s2.tb)+'</sup>':"")+'</td>';}).join("")+'</tr>').join("")+'</tbody></table>';
    if(m.note)s+='<p class="note">'+h(m.note.replace(/\bbt\b/g,"batte").replace(/\bret\.?/gi,"ritiro"))+'</p>';
    if(m.state==="pre")s+='<p class="note">'+(m.timeValid?'Inizio previsto '+h(SL.when(m.date))+' · tra <b class="cdown">'+h(SL.countdown(new Date(m.date)-Date.now()))+'</b>':"Orario da definire: dipende dagli incontri precedenti sullo stesso campo.")+'</p>';
    s+='<p class="note">I dati gratuiti danno i giochi per set, non il punto per punto.</p>';
    c.body.innerHTML=s;c.sub(m.p.map(p=>p.short).join(" – "));}
  function drawDraw(){const c=cards.draw;if(!c.shown)return;const ms=S.matches.filter(m=>m.tid===S.t&&m.type==="S");
    if(!ms.length){c.body.innerHTML=UI.empty("Tabellone non disponibile.");return;}
    const R={};ms.forEach(m=>{(R[m.round]=R[m.round]||[]).push(m);});
    const order=Object.keys(R).sort((a,b)=>Math.min(...R[a].map(m=>+new Date(m.date)))-Math.min(...R[b].map(m=>+new Date(m.date))));
    c.body.innerHTML='<div class="rounds">'+order.map(r=>'<div class="col"><h4>'+h(r)+' · '+R[r].length+'</h4>'+R[r].sort((a,b)=>new Date(a.date)-new Date(b.date)).map(m=>tm(m)).join("")+'</div>').join("")+'</div>';
    const ev=T();c.sub(ev?ev.name.replace(/ presented by.*$/i,""):"");}
  async function loadRank(){const d=await SL.tryGet(BASE+"rankings",{ttl:36e5});const c=cards.rank;
    const R=d&&d.rankings&&d.rankings[0]&&d.rankings[0].ranks;if(!R){c.body.innerHTML=UI.empty("Ranking non disponibile.");return;}
    S.rank=R;drawIta();drawMatch();
    c.sub((d.rankings[0].headline||"").replace(/ATP: Week/,"settimana"));
    c.body.innerHTML='<div class="scroll"><table class="tbl"><thead><tr><th>#</th><th></th><th class="l">Giocatore</th><th>PUNTI</th><th>ETÀ</th></tr></thead><tbody>'+R.slice(0,100).map(r=>{const a=r.athlete||{},mv=(r.previous||r.current)-r.current;
      return'<tr class="'+(isIta(a)?"ita":"")+(SL.fav.has(SL.fav.key("tennis","player",String(a.id)))?" me":"")+'"><td>'+r.current+'</td><td>'+(mv?'<span class="'+(mv>0?"up":"dn")+'">'+(mv>0?"▲":"▼")+Math.abs(mv)+'</span>':'<span class="dim">–</span>')+'</td><td class="l"><span class="tn" style="max-width:none">'+(a.flag?'<img class="flag" src="'+h(a.flag.href)+'" alt="'+h(a.flag.alt||"")+'">':"")+h(a.displayName||"")+SL.star("tennis","player",String(a.id),a.displayName||"")+'</span></td><td>'+Number(r.points||0).toLocaleString("it-IT")+'</td><td>'+h(a.age||"")+'</td></tr>';}).join("")+'</tbody></table></div>';}
  function drawIta(){const c=cards.ita;if(!S.rank){c.body.innerHTML='<div class="loading">Carico</div>';return;}
    const I=S.rank.filter(r=>isIta(r.athlete));
    c.sub(I.length+" italiani nei primi "+S.rank.length);
    c.body.innerHTML='<div style="display:flex;flex-direction:column;gap:6px">'+I.map(r=>{const a=r.athlete,id=String(a.id);
      const ms=S.matches.filter(m=>m.p.some(p=>p.id===id)&&m.type==="S").sort((x,y)=>new Date(y.date)-new Date(x.date));const live=ms.find(m=>m.live),nx=ms.find(m=>m.state==="pre"),last=ms.find(m=>m.done);
      const opp=m=>{const o=m.p.find(p=>p.id!==id);return o?o.name:"";};
      const info=live?'<span class="tag live">IN CAMPO</span> vs '+h(opp(live)):nx?"Prossima: vs "+h(opp(nx))+" · "+h(nx.status):last?(last.p.find(p=>p.id===id).winner?"Ha battuto ":"Ha perso con ")+h(opp(last))+" · "+h(last.round):"";
      return'<div class="tmatch ita" style="grid-template-columns:auto 1fr auto"><b style="font:900 22px/1 var(--f-display);min-width:42px">'+r.current+'</b><span class="pl w"><span>'+h(a.displayName)+'</span>'+SL.star("tennis","player",id,a.displayName)+'</span><span class="muted">'+Number(r.points||0).toLocaleString("it-IT")+' pt</span>'+(info?'<span class="hd" style="grid-column:1/-1">'+info+'</span>':"")+'</div>';}).join("")+'</div>';}
  async function loadCal(){const c=cards.cal,y=new Date().getFullYear();
    const [a,b]=await Promise.all([SL.tryGet(BASE+"scoreboard?dates="+y,{ttl:864e5}),SL.tryGet(BASE+"scoreboard?dates="+(y+1),{ttl:864e5})]);
    const all=[].concat((a&&a.events)||[],(b&&b.events)||[]).filter(e=>new Date(e.endDate||e.date)>Date.now()-864e5);
    const seen=new Set(),L=all.filter(e=>{if(seen.has(e.id))return false;seen.add(e.id);return true;}).sort((x,z)=>new Date(x.date)-new Date(z.date)).slice(0,30);
    if(!L.length){c.body.innerHTML=UI.empty("Calendario non disponibile.");return;}
    c.body.innerHTML='<div class="scroll"><table class="tbl"><thead><tr><th class="l">Date</th><th class="l">Torneo</th><th class="l">Categoria</th><th class="l">Campione uscente</th></tr></thead><tbody>'+L.map(e=>{const k=M.cat(e),pw=(e.previousWinners||[]).find(w=>/singles/i.test(w.type||w.name||""))||(e.previousWinners||[])[0];
      const champ=pw&&(pw.athlete&&pw.athlete.displayName||pw.displayName||pw.name)||"";
      return'<tr class="'+(big(k)?"me":"")+'"><td class="l">'+h(SL.fmtDay(e.date))+'</td><td class="l">'+h(e.name.replace(/ presented by.*$/i,""))+'</td><td class="l"><span class="tag'+(big(k)?" big":"")+'">'+h(k.n)+'</span></td><td class="l">'+h(champ)+'</td></tr>';}).join("")+'</tbody></table></div>';
    c.sub("prossimi "+L.length+" tornei");}
  SL.every(load,()=>S.matches.some(m=>m.live)?20000:180000);
  SL.every(loadRank,36e5,{delay:800});
  SL.every(loadCal,864e5,{delay:1500});
  SL.onPage("fav",()=>{S.matches.forEach(m=>{m.fav=m.p.some(p=>SL.fav.has(SL.fav.key("tennis","player",p.id)));m.important=m.fav||(m.ita&&m.type==="S");});drawToday();});
};
})();
