/* Sport LIVE APP — MOTO (MotoGP + WorldSBK)
   Live timing, distacchi in pista, weekend e sessioni, risultati, classifiche, calendario.
   I siti ufficiali non permettono l'accesso da altre pagine: servono i dati sbloccati dall'estensione per PC. */
(function(){
"use strict";
const h=SL.h,UI=SL.ui;
const M=SL.sports.moto={name:"Moto",tab:"Moto",icon:"🏍",color:"#e5383b"};
const GP="https://api.motogp.pulselive.com/motogp/v1/",SBK="https://api.pulselive.worldsbk.com/";
const SES={FP:"Libere",PR:"Practice",Q:"Qualifica",SPR:"Sprint",WUP:"Warm up",RAC:"Gara"};
const sesName=s=>(SES[s.type]||s.type)+(s.number?" "+s.number:"");
const SBKN={RC1:"Gara 1",RC2:"Gara 2",SPRC:"Superpole Race",SP:"Superpole",FP1:"Libere 1",FP2:"Libere 2",FP3:"Libere 3",FP:"Libere",WUP:"Warm up",WUP1:"Warm up 1",WUP2:"Warm up 2"};
const ITA=c=>c==="ITA"||c==="IT";
const favR=(name)=>SL.fav.hasName("moto",name);
const parseLT=s=>{if(!s)return 0;const m=String(s).match(/(?:(\d+)')?(\d+)\.(\d+)/);if(!m)return 0;return(+(m[1]||0))*60+ +m[2]+ +("0."+m[3]);};

/* ---------- MotoGP: dati base ---------- */
async function season(){const L=await SL.get(GP+"results/seasons",{ttl:864e5});return L.find(s=>s.current)||L[0];}
async function events(){const s=await season();const L=await SL.get(GP+"results/events?seasonUuid="+s.id,{ttl:36e5});return L.filter(e=>!e.test).sort((a,b)=>new Date(a.date_start)-new Date(b.date_start));}
function currentEvent(evs){const now=Date.now();return evs.find(e=>new Date(e.date_start).getTime()-2*864e5<=now&&new Date(e.date_end).getTime()+864e5>=now)||evs.find(e=>new Date(e.date_end).getTime()+864e5>=now)||evs[evs.length-1];}
async function gpCat(evId){const C=await SL.get(GP+"results/categories?eventUuid="+evId,{ttl:36e5});return C.find(c=>/MotoGP/i.test(c.name))||C[0];}
async function gpSessions(evId,catId){return SL.get(GP+"results/sessions?eventUuid="+evId+"&categoryUuid="+catId,{ttl:120000});}
async function live(ttl){return SL.get(GP+"timing-gateway/livetiming-lite",{ttl:ttl||3000});}
/* i ritirati/non classificati hanno posizione 0 o -1: vanno in fondo */
const ltRiders=d=>Object.values(d&&d.rider||{}).sort((a,b)=>((a.pos>0?a.pos:900)-(b.pos>0?b.pos:900))||((b.num_lap||0)-(a.num_lap||0)));
const ltToday=d=>{const x=d&&d.head&&d.head.date;if(!x)return false;const [dd,mm,yy]=x.split("/");return yy+mm+dd===SL.dayKey(Date.now());};
const ltState=d=>{const st=d&&d.head&&d.head.session_status_id;if(st==="F")return"post";const R=ltRiders(d);return R.some(r=>r.num_lap>0||r.lap_time)?"in":"pre";};

/* ---------- home e avvisi ---------- */
M.homeFeed=async function(day,ttl){
  if(!SL.extData())return[];
  const out=[],tgt=SL.dayKey(SL.addDays(Date.now(),day));
  try{
    if(day===0){const d=await live(ttl<20000?5000:60000);if(d&&d.head&&ltToday(d)){const R=ltRiders(d),st=ltState(d),hd=d.head;
      out.push({id:"moto:gp:"+hd.event_id+":"+hd.session_id,sport:"moto",comp:"MotoGP · "+hd.event_tv_name,date:Date.now(),state:st,live:st==="in",done:st==="post",
        status:st==="in"?hd.session_name:st==="post"?"FINITA":hd.session_name,important:R.slice(0,1).some(r=>ITA(r.rider_nation)||favR(r.rider_name+" "+r.rider_surname)),R,head:hd,
        sig:(R[0]&&R[0].rider_number)+"|"+st,lines:R.slice(0,3).map(r=>({n:r.pos+". "+r.rider_name+" "+r.rider_surname,ita:ITA(r.rider_nation),v:r.pos===1?(st==="in"?"Giro "+r.num_lap+"/"+hd.num_laps:""):"+"+r.gap_first})),
        foot:hd.session_name+" · "+hd.circuit_name,go:{sport:"moto",s:"gp"}});}}
    const evs=await events(),ev=currentEvent(evs);if(ev){const cat=await gpCat(ev.id),S=await gpSessions(ev.id,cat.id);
      S.filter(s=>SL.dayKey(s.date)===tgt&&new Date(s.date)>Date.now()&&/SPR|RAC|Q/.test(s.type)).forEach(s=>out.push({id:"moto:gps:"+s.id,sport:"moto",comp:"MotoGP · "+(ev.sponsored_name||ev.name),date:s.date,state:"pre",live:false,done:false,status:SL.when(s.date),important:s.type==="RAC",
        sig:"pre",lines:[{n:sesName(s),ico:"🏁",v:SL.fmtTime(s.date)}],foot:(ev.circuit&&ev.circuit.name)||"",go:{sport:"moto",s:"gp"}}));}
  }catch(e){}
  return out;};
M.onChange=function(p,it){if(!it.R)return null;const a=p.R&&p.R[0],b=it.R[0];if(!b)return null;const nm=b.rider_name+" "+b.rider_surname;
  const imp=ITA(b.rider_nation)||favR(nm);
  if(p.state!=="post"&&it.state==="post")return{id:"w:"+it.id,big:ITA(b.rider_nation)?"🇮🇹 VINCE":"VINCE",title:nm,text:"MotoGP · "+it.head.session_name+" · "+it.head.event_tv_name,color:"var(--red)",important:imp};
  if(a&&a.rider_number!==b.rider_number&&it.state==="in")return{id:"l:"+it.id+":"+b.rider_number+":"+b.num_lap,big:"IN TESTA",title:nm,text:"Giro "+b.num_lap+" · MotoGP "+it.head.session_name,color:"var(--yellow)",important:imp};
  return null;};

/* ---------- pagina ---------- */
const DEFS_GP=[
  {k:"timing",n:"Live timing",sz:2},
  {k:"gap",n:"Distacchi in pista",sz:2},
  {k:"weekend",n:"Weekend",sz:1},
  {k:"results",n:"Risultati sessione",sz:2},
  {k:"standings",n:"Classifica mondiale",sz:2},
  {k:"cal",n:"Calendario",sz:1,couch:false},
  {k:"tv",n:"Diretta TV",sz:2,couch:false}
];
const DEFS_SBK=[
  {k:"latest",n:"Ultima sessione",sz:2},
  {k:"round",n:"Round e sessioni",sz:2},
  {k:"standings",n:"Classifica mondiale",sz:2},
  {k:"cal",n:"Calendario",sz:2,couch:false},
  {k:"tv",n:"Diretta TV",sz:2,couch:false}
];
M.mount=function(ctx){
  const st=ctx.st,ser=st.s==="sbk"?"sbk":"gp";
  const r=document.createElement("div");r.className="row";
  r.appendChild(UI.chips([{k:"gp",n:"MotoGP"},{k:"sbk",n:"WorldSBK"}],ser,v=>SL.go({s:v==="gp"?"":v})));
  ctx.sub.appendChild(r);
  if(!SL.extData()){
    const cards=UI.mount(ctx.main,[{k:"need",n:"Dati moto",sz:2},{k:"tv",n:"Diretta TV",sz:2}]);UI.tv(cards.tv,"moto");
    const tvLike=SL.isTVLike();
    cards.need.body.innerHTML='<div class="empty" style="text-align:left;line-height:1.6"><b>MotoGP e Superbike non permettono ad altri siti di leggere i loro dati.</b><br>'+
      (tvLike?"Su Smart TV e tablet questa sezione non può mostrarli. Aprila da un PC con Chrome o Edge e l'estensione dell'app.":"Installa (o aggiorna) l'estensione per Chrome/Edge da <b>Impostazioni ⚙</b>: sblocca live timing, risultati e classifiche. È la stessa estensione della Diretta TV dell'app F1.")+
      '<br><br>'+(SL.ext()?'<span class="tag big">Hai la versione '+h(SL.ext())+': aggiornala con lo zip nuovo.</span>':"")+(!tvLike?' <button type="button" class="btn pri" id="motoSet">⚙ APRI IMPOSTAZIONI</button>':"")+'</div>';
    const b=cards.need.body.querySelector("#motoSet");if(b)b.onclick=()=>UI.openSettings();
    return;}
  if(ser==="gp")mountGP(ctx);else mountSBK(ctx);
};

function mountGP(ctx){
  const cards=UI.mount(ctx.main,DEFS_GP);UI.tv(cards.tv,"moto");
  const S={prevPos:{},evs:[],ev:null,cat:null,ses:[],resSel:"",lt:null};
  async function tick(){
    let d;try{d=await live(2500);}catch(e){cards.timing.body.innerHTML=UI.empty("Live timing non raggiungibile. Controlla che l'estensione sia attiva e ricarica.");return;}
    S.lt=d;drawTiming();drawGap();}
  function drawTiming(){const c=cards.timing,d=S.lt,hd=d&&d.head;if(!hd){c.body.innerHTML=UI.empty("Nessuna sessione.");return;}
    const R=ltRiders(d),st=ltState(d),lead=R[0]||{};
    c.sub((hd.category||"")+" · "+hd.session_name+" · "+hd.event_tv_name);
    const lapInfo=hd.num_laps&&+hd.num_laps>0?"Giro "+(lead.num_lap||0)+" / "+hd.num_laps:hd.remaining&&hd.remaining!=="0"?"Mancano "+hd.remaining:"";
    let s='<div class="row" style="justify-content:space-between;margin-bottom:8px">'+(st==="in"?'<span class="tag live">LIVE</span>':st==="post"?'<span class="tag">FINITA</span>':'<span class="tag">IN ATTESA</span>')+'<span class="muted">'+h(hd.circuit_name+" · "+hd.date)+'</span><b>'+h(lapInfo)+'</b></div>';
    s+='<div class="tower"><div class="trow h"><span>POS</span><span></span><span>N.</span><span>PILOTA</span><span style="text-align:right">DISTACCO</span><span style="text-align:right">PREC.</span><span class="lt2" style="text-align:right">ULTIMO GIRO</span></div>';
    R.forEach(r=>{const out=!(r.pos>0),prev=S.prevPos[r.rider_number],mv=prev&&!out?prev-r.pos:0;const nm=r.rider_name+" "+r.rider_surname;
      if(out){s+='<div class="trow out'+(ITA(r.rider_nation)?" ita":"")+'"><span class="p">RIT</span><span class="cbar" style="background:#'+h(r.color||"666")+'"></span><span class="no">'+h(r.rider_number)+'</span><span class="nm">'+h(r.rider_surname)+'<small>'+h(r.team_name||"")+'</small></span><span class="g">'+h(r.num_lap?r.num_lap+" giri":"")+'</span><span class="g"></span><span class="lt lt2"></span></div>';return;}
      s+='<div class="trow'+(ITA(r.rider_nation)?" ita":"")+(mv>0?" up":mv<0?" dn":"")+'"><span class="p">'+h(r.pos)+'</span><span class="cbar" style="background:#'+h(r.color||"666")+'"></span><span class="no">'+h(r.rider_number)+'</span><span class="nm">'+h(r.rider_surname)+'<small>'+h(r.team_name||"")+'</small>'+(r.on_pit?' <span class="tag">BOX</span>':"")+'</span>'+
        '<span class="g">'+(r.pos===1?h(r.num_lap?r.num_lap+" giri":""):"+"+h(r.gap_first))+'</span><span class="g">'+(r.pos===1?"":"+"+h(r.gap_prev))+'</span><span class="lt lt2">'+h(r.last_lap_time||"")+'</span></div>';});
    c.body.innerHTML=s+'</div>';
    if(st==="in")R.forEach(r=>{if(r.pos>0)S.prevPos[r.rider_number]=r.pos;});}
  function drawGap(){const c=cards.gap,d=S.lt;if(!c.shown||!d)return;const lead=(ltRiders(d)[0]||{}).num_lap||0;
    /* solo piloti in gara e a pieni giri: i doppiati falserebbero la scala */
    const R=ltRiders(d).filter(r=>r.pos>0&&(!lead||(r.num_lap||0)>=lead-1)&&!/lap/i.test(r.gap_first||""));if(!R.length){c.body.innerHTML=UI.empty("Nessun dato.");return;}
    const gaps=R.map(r=>r.pos===1?0:parseLT(r.gap_first)).map(g=>isFinite(g)?g:0);const mx=Math.max(5,...gaps);
    const W=1;let s='<div class="gapstrip">';
    R.forEach((r,i)=>{const x=96-(gaps[i]/mx)*90,y=22+(i%4)*19;s+='<div class="dot" title="'+h(r.pos+". "+r.rider_surname+(r.pos>1?" +"+r.gap_first:""))+'" style="left:'+x.toFixed(2)+'%;top:'+y+'%;background:#'+h(r.color||"666")+(ITA(r.rider_nation)?";box-shadow:0 0 0 3px var(--ita)":"")+'">'+h(r.rider_number)+'</div>';});
    s+='<span class="ax" style="right:2%">LEADER</span><span class="ax" style="left:2%">+'+mx.toFixed(1)+'s</span></div><p class="note">Ogni pallino è un pilota, messo in base al distacco dal primo. Contorno verde: piloti italiani.</p>';
    c.body.innerHTML=s;c.sub("scala "+mx.toFixed(1)+" s");}
  async function loadWeekend(){
    try{S.evs=await events();}catch(e){cards.weekend.body.innerHTML=UI.empty("Calendario non raggiungibile.");return;}
    S.ev=currentEvent(S.evs);if(!S.ev)return;S.cat=await gpCat(S.ev.id);S.ses=(await gpSessions(S.ev.id,S.cat.id)).sort((a,b)=>new Date(a.date)-new Date(b.date));
    const c=cards.weekend,now=Date.now(),next=S.ses.find(s=>new Date(s.date)>now);
    c.sub(S.ev.sponsored_name||S.ev.name);
    c.body.innerHTML=(next?'<p class="muted">Prossima: <b>'+h(sesName(next))+'</b> '+h(SL.when(next.date))+'</p><div class="cd" data-cd="'+h(next.date)+'">'+h(SL.countdown(new Date(next.date)-now))+'</div>':"")+
      '<ul class="feed" style="margin-top:8px">'+S.ses.map(s=>'<li class="'+(next&&s.id===next.id?"goal":"")+'"><span class="t">'+h(SL.fmtDay(s.date).split(" ")[0])+'</span><span>'+(/RAC|SPR/.test(s.type)?"🏁":"⏱")+'</span><span class="x"><b>'+h(sesName(s))+'</b> '+h(SL.fmtTime(s.date))+'<small>'+h(s.status==="FINISHED"?"conclusa":new Date(s.date)<now?"":"")+'</small></span></li>').join("")+'</ul>'+
      '<p class="note">'+h([(S.ev.circuit&&S.ev.circuit.name),(S.ev.country&&SL.tr.country(S.ev.country.iso))].filter(Boolean).join(" · "))+' · orari italiani</p>';
    drawResultsPicker();drawCal();}
  async function drawResultsPicker(){const c=cards.results;
    /* sessioni con risultati: quelle di questo evento già iniziate, altrimenti l'evento precedente */
    let ev=S.ev,ses=S.ses.filter(s=>new Date(s.date)<Date.now());
    if(!ses.length){const i=S.evs.indexOf(S.ev);ev=S.evs[i-1];if(!ev){c.body.innerHTML=UI.empty("Nessun risultato.");return;}const cat=await gpCat(ev.id);ses=(await gpSessions(ev.id,cat.id)).sort((a,b)=>new Date(a.date)-new Date(b.date));}
    ses=ses.slice().reverse();if(!S.resSel||!ses.find(s=>s.id===S.resSel))S.resSel=(ses.find(s=>/RAC|SPR/.test(s.type))||ses[0]||{}).id;
    c.tools.querySelectorAll("select").forEach(x=>x.remove());
    const sl=document.createElement("select");sl.className="mbtn";sl.style.background="var(--panel2)";sl.setAttribute("aria-label","Sessione");
    sl.innerHTML=ses.map(s=>'<option value="'+s.id+'"'+(s.id===S.resSel?" selected":"")+'>'+h(sesName(s))+'</option>').join("");sl.onchange=()=>{S.resSel=sl.value;drawResults(ev);};c.tools.prepend(sl);
    drawResults(ev);}
  async function drawResults(ev){const c=cards.results;c.sub(ev.sponsored_name||ev.name);
    const d=await SL.tryGet(GP+"results/session/"+S.resSel+"/classification?test=false",{ttl:60000});const C=(d&&d.classification)||[];
    if(!C.length){c.body.innerHTML=UI.empty("Risultati non ancora pubblicati per questa sessione: durante la sessione usa il live timing.");return;}
    c.body.innerHTML='<div class="scroll"><table class="tbl"><thead><tr><th>#</th><th class="l">Pilota</th><th class="l">Squadra</th><th>TEMPO / DIST.</th><th>PT</th></tr></thead><tbody>'+C.map(x=>{const rd=x.rider||{},it=ITA(rd.country&&rd.country.iso),nm=rd.full_name||"";
      return'<tr class="'+(it?"ita":"")+(favR(nm)?" me":"")+'"><td>'+h(x.position||"–")+'</td><td class="l"><span class="tn" style="max-width:none"><b>'+h(rd.number||"")+'</b> '+h(nm)+SL.star("moto","rider",rd.id||nm,nm)+'</span></td><td class="l">'+h((x.team||{}).name||"")+'</td><td>'+h(x.position===1?(x.time||x.best_lap&&x.best_lap.time||""):(x.gap&&(x.gap.first||x.gap.prev))?"+"+(x.gap.first||x.gap.prev):x.best_lap&&x.best_lap.time||x.status||"")+'</td><td>'+h(x.points||"")+'</td></tr>';}).join("")+'</tbody></table></div>';}
  async function loadStandings(){const c=cards.standings;try{const s=await season(),ev=S.ev||currentEvent(await events()),cat=S.cat||await gpCat(ev.id);
      const d=await SL.get(GP+"results/standings?seasonUuid="+s.id+"&categoryUuid="+cat.id,{ttl:600000});const C=d.classification||[];
      c.sub("MotoGP "+s.year);
      c.body.innerHTML='<div class="scroll"><table class="tbl"><thead><tr><th>#</th><th class="l">Pilota</th><th class="l">Squadra</th><th>VITT.</th><th>PODI</th><th>PUNTI</th></tr></thead><tbody>'+C.map(x=>{const rd=x.rider||{},nm=rd.full_name||"",it=ITA(rd.country&&rd.country.iso);
        return'<tr class="'+(it?"ita":"")+(favR(nm)?" me":"")+'"><td>'+h(x.position)+'</td><td class="l"><span class="tn" style="max-width:none">'+h(nm)+(it?' <span class="tag ita" style="padding:1px 4px;font-size:9px">ITA</span>':"")+SL.star("moto","rider",rd.id||nm,nm)+'</span></td><td class="l">'+h((x.team||{}).name||"")+'</td><td>'+h(x.race_wins||0)+'</td><td>'+h(x.podiums||0)+'</td><td><b>'+h(x.points)+'</b></td></tr>';}).join("")+'</tbody></table></div>';
    }catch(e){c.body.innerHTML=UI.empty("Classifica non raggiungibile.");}}
  function drawCal(){const c=cards.cal;if(!S.evs.length)return;const now=Date.now();
    c.body.innerHTML='<ul class="feed">'+S.evs.map(e=>{const done=new Date(e.date_end).getTime()+864e5<now,cur=e===S.ev;return'<li class="'+(cur?"goal":"")+'" style="'+(done?"opacity:.55":"")+'"><span class="t">'+h(SL.fmtDay(e.date_start).replace(/^\w+ /,""))+'</span><span>'+(cur?"▶":done?"✓":"•")+'</span><span class="x">'+h(e.sponsored_name||e.name)+'<small>'+h((e.circuit&&e.circuit.name)||"")+'</small></span></li>';}).join("")+'</ul>';
    c.sub(S.evs.length+" GP");}
  SL.every(tick,()=>S.lt&&ltState(S.lt)==="in"?3000:30000);
  SL.every(loadWeekend,300000,{delay:300});
  SL.every(loadStandings,600000,{delay:1200});
  SL.every(()=>{const el=cards.weekend.body.querySelector("[data-cd]");if(el)el.textContent=SL.countdown(new Date(el.dataset.cd)-Date.now());},1000,{delay:1000});
}

/* ---------- WorldSBK ---------- */
function mountSBK(ctx){
  const cards=UI.mount(ctx.main,DEFS_SBK);UI.tv(cards.tv,"moto");
  const y=new Date().getFullYear(),S={rounds:[],round:null,ses:"",cat:"SBK"};
  const inc=d=>{const o={};(d.included||[]).forEach(i=>{o[i.type+":"+i.id]=i.attributes||{};});return o;};
  const fmtMs=ms=>{if(!ms&&ms!==0)return"";const m=Math.floor(ms/60000),s=(ms%60000)/1000;return(m?m+"'":"")+s.toFixed(3).padStart(m?6:1,"0");};
  function table(d,cls){const I=inc(d),R=(d.data||[]).slice().sort((a,b)=>(a.attributes.position||99)-(b.attributes.position||99));if(!R.length)return UI.empty("Risultati non disponibili.");
    const win=R[0].attributes;
    return'<div class="scroll"><table class="tbl"><thead><tr><th>#</th><th class="l">Pilota</th><th class="l">Squadra</th><th>TEMPO / DIST.</th><th>GIRO VELOCE</th></tr></thead><tbody>'+R.map(x=>{const a=x.attributes,rid=x.relationships.rider&&x.relationships.rider.data.id,rd=I["rider:"+rid]||I["riders:"+rid]||{},tm=I["team:"+(x.relationships.team&&x.relationships.team.data.id)]||{};
      const nm=((rd.name||"")+" "+(rd.surname||"")).trim(),it=ITA(rd.country_iso);
      const gap=a.position===1?fmtMs(a.time):a.laps<win.laps?"+"+(win.laps-a.laps)+" giri":a.time?"+"+((a.time-win.time)/1000).toFixed(3):a.status||"";
      return'<tr class="'+(it?"ita":"")+(favR(nm)?" me":"")+'"><td>'+h(a.position||"–")+'</td><td class="l"><span class="tn" style="max-width:none"><b>'+h(a.number||"")+'</b> '+h(nm)+(it?' <span class="tag ita" style="padding:1px 4px;font-size:9px">ITA</span>':"")+SL.star("moto","rider",rid,nm)+'</span></td><td class="l">'+h(tm.name||"")+'</td><td>'+h(gap)+'</td><td>'+h(fmtMs(a.fastest_lap_time))+'</td></tr>';}).join("")+'</tbody></table></div>';}
  async function latest(){const c=cards.latest;try{const d=await SL.get(SBK+"wsbk-results/v1/sessions/latest",{ttl:20000});const s=d.data,a=s.attributes||{};
      const round=(s.relationships.round.data.id||"").split("-").pop(),cat=s.relationships.category.data.id,src=a.source_id;
      const res=await SL.get(SBK+"wsbk-results/v1/seasons/"+y+"/categories/"+cat+"/rounds/"+round+"/sessions/"+src+"/results",{ttl:a.effective_end_date?600000:10000});
      const live=!a.effective_end_date;
      c.sub((cat==="SBK"?"WorldSBK":cat)+" · "+(SBKN[a.short_name]||a.short_name)+" · "+round);
      c.body.innerHTML='<div class="row" style="justify-content:space-between;margin-bottom:8px">'+(live?'<span class="tag live">IN CORSO</span>':'<span class="tag">'+h(SL.when(a.effective_end_date))+'</span>')+'<span class="muted">'+h([a.air_temperature!=null?"Aria "+a.air_temperature+"°":"",a.track_temperature!=null?"Pista "+a.track_temperature+"°":""].filter(Boolean).join(" · "))+'</span></div>'+table(res);
    }catch(e){c.body.innerHTML=UI.empty("Dati WorldSBK non raggiungibili. Controlla l'estensione e ricarica.");}}
  async function rounds(){try{const d=await SL.get(SBK+"wsbk-events/v1/seasons/"+y+"/rounds",{ttl:36e5});S.rounds=(d.data||[]).sort((a,b)=>new Date(a.attributes.start_date)-new Date(b.attributes.start_date));
      const now=Date.now();if(!S.round)S.round=(S.rounds.filter(r=>new Date(r.attributes.start_date)<=now).pop()||S.rounds[0]);drawCal();drawRound();}catch(e){cards.cal.body.innerHTML=UI.empty("Calendario non raggiungibile.");}}
  function drawCal(){const c=cards.cal,now=Date.now();c.body.innerHTML='<ul class="feed">'+S.rounds.map(r=>{const a=r.attributes,done=a.status==="FINISHED",cur=r===S.round;
      return'<li class="'+(cur?"goal":"")+'" style="cursor:pointer;'+(done?"opacity:.6":"")+'" data-r="'+h(r.id)+'"><span class="t">'+h(SL.fmtDay(a.start_date).replace(/^\w+ /,""))+'</span><span>'+(done?"✓":"•")+'</span><span class="x">'+h(a.description||a.name)+'<small>'+h(a.name)+'</small></span></li>';}).join("")+'</ul>';
    c.sub(S.rounds.length+" round "+y);}
  cards.cal.body.addEventListener("click",e=>{const li=e.target.closest("[data-r]");if(!li)return;S.round=S.rounds.find(r=>r.id===li.dataset.r);S.ses="";drawCal();drawRound();});
  async function drawRound(){const c=cards.round,r=S.round;if(!r)return;const src=r.attributes.source_id;
    const d=await SL.tryGet(SBK+"wsbk-events/v1/seasons/"+y+"/rounds/"+src+"/sessions",{ttl:600000});
    const L=((d&&d.data)||[]).filter(s=>s.id.indexOf("-"+S.cat+"-")>0).sort((a,b)=>new Date(a.attributes.start_date_utc)-new Date(b.attributes.start_date_utc));
    c.sub(r.attributes.description||r.attributes.name);
    if(!L.length){c.body.innerHTML=UI.empty("Sessioni non disponibili.");return;}
    if(!S.ses||!L.find(s=>s.attributes.source_id===S.ses))S.ses=(L.filter(s=>/^RC|SPRC/.test(s.attributes.short_name)&&new Date(s.attributes.start_date_utc)<Date.now()).pop()||L[L.length-1]).attributes.source_id;
    const res=await SL.tryGet(SBK+"wsbk-results/v1/seasons/"+y+"/categories/"+S.cat+"/rounds/"+src+"/sessions/"+S.ses+"/results",{ttl:120000});
    c.body.innerHTML='<div class="chips" style="margin-bottom:10px">'+L.map(s=>{const a=s.attributes;return'<button type="button" class="chip" data-s="'+h(a.source_id)+'" aria-pressed="'+(a.source_id===S.ses)+'">'+h((SBKN[a.short_name.trim()]||a.short_name)+" · "+SL.fmtDay(a.start_date_utc).split(" ")[0]+" "+SL.fmtTime(a.start_date_utc))+'</button>';}).join("")+'</div>'+(res?table(res):UI.empty("Risultati non ancora disponibili."));}
  cards.round.body.addEventListener("click",e=>{const b=e.target.closest("[data-s]");if(!b)return;S.ses=b.dataset.s;drawRound();});
  async function standings(){const c=cards.standings;try{const d=await SL.get(SBK+"wsbk-results/v1/seasons/"+y+"/categories/"+S.cat+"/riders/standings",{ttl:600000});const I=inc(d);
      c.sub("WorldSBK "+y);
      c.body.innerHTML='<div class="scroll"><table class="tbl"><thead><tr><th>#</th><th class="l">Pilota</th><th class="l">Squadra</th><th>PUNTI</th></tr></thead><tbody>'+(d.data||[]).sort((a,b)=>a.attributes.position-b.attributes.position).map(x=>{const a=x.attributes,rid=x.relationships.rider.data.id,rd=I["riders:"+rid]||{},tm=I["teams:"+(x.relationships.team&&x.relationships.team.data&&x.relationships.team.data.id)]||{};const nm=((rd.name||"")+" "+(rd.surname||"")).trim(),it=ITA(rd.country_iso);
        return'<tr class="'+(it?"ita":"")+(favR(nm)?" me":"")+'"><td>'+a.position+'</td><td class="l"><span class="tn" style="max-width:none"><b>'+h(a.number||"")+'</b> '+h(nm)+(it?' <span class="tag ita" style="padding:1px 4px;font-size:9px">ITA</span>':"")+SL.star("moto","rider",rid,nm)+'</span></td><td class="l">'+h(tm.name||"")+'</td><td><b>'+a.points+'</b></td></tr>';}).join("")+'</tbody></table></div>';
    }catch(e){c.body.innerHTML=UI.empty("Classifica non raggiungibile.");}}
  SL.every(latest,30000);SL.every(rounds,36e5,{delay:400});SL.every(standings,600000,{delay:900});
}
})();
