/* Sport LIVE APP — dati FORMULA 1 per home, striscia, avvisi e testata della pagina "F1 e MotorSport".
   La pagina F1 vera e propria è l'app F1 Pit Wall, aperta dentro la sezione (moto.js).
   Dati: OpenF1 (calendario, sessioni, risultati) e Jolpica/Ergast (classifica, ultimo GP). Entrambi aperti, nessuna estensione. */
(function(){
"use strict";
const F1=SL.f1={};
const OF="https://api.openf1.org/v1/",JO="https://api.jolpi.ca/ergast/f1/";
const SES={"Practice 1":"Libere 1","Practice 2":"Libere 2","Practice 3":"Libere 3","Qualifying":"Qualifiche","Sprint Qualifying":"Qualifiche Sprint","Sprint Shootout":"Qualifiche Sprint","Sprint":"Sprint","Race":"Gara"};
F1.sesName=s=>SES[s.session_name]||(/^Day (\d)/.test(s.session_name)?"Test · giorno "+s.session_name.slice(4):s.session_name);
F1.gpName=m=>{const n=(m&&m.meeting_name)||"";return/Grand Prix$/i.test(n)?"GP "+n.replace(/\s*Grand Prix$/i,""):n.replace(/Pre-Season Testing/i,"Test invernali");};
const ITA=d=>d&&(d.country_code==="ITA"||/^antonelli$/i.test(d.last_name||""));
const favD=n=>SL.fav.hasName("moto",n);

/* calendario dell'anno (e del prossimo, quando c'è) */
F1.sessions=async function(ttl){const y=new Date().getFullYear();
  const [a,b]=await Promise.all([SL.tryGet(OF+"sessions?year="+y,{ttl:ttl||36e5}),SL.tryGet(OF+"sessions?year="+(y+1),{ttl:216e5})]);
  return[].concat(Array.isArray(a)?a:[],Array.isArray(b)?b:[]).sort((x,z)=>new Date(x.date_start)-new Date(z.date_start));};
F1.meetings=async function(){const y=new Date().getFullYear();
  const [a,b]=await Promise.all([SL.tryGet(OF+"meetings?year="+y,{ttl:216e5}),SL.tryGet(OF+"meetings?year="+(y+1),{ttl:216e5})]);
  const map={};[].concat(Array.isArray(a)?a:[],Array.isArray(b)?b:[]).forEach(m=>{map[m.meeting_key]=m;});return map;};
F1.state=s=>{const now=Date.now(),a=new Date(s.date_start).getTime(),b=new Date(s.date_end||s.date_start).getTime()+5*60000;return now<a?"pre":now<=b?"in":"post";};
/* ordine d'arrivo di una sessione finita, con i nomi dei piloti */
F1.result=async function(key){
  const [r,d]=await Promise.all([SL.tryGet(OF+"session_result?session_key="+key,{ttl:18e5}),SL.tryGet(OF+"drivers?session_key="+key,{ttl:216e5})]);
  if(!Array.isArray(r)||!r.length)return[];const D={};(Array.isArray(d)?d:[]).forEach(x=>{D[x.driver_number]=x;});
  return r.filter(x=>x.position).sort((x,z)=>x.position-z.position).map(x=>{const p=D[x.driver_number]||{};const name=p.first_name&&p.last_name?p.first_name+" "+p.last_name.charAt(0)+p.last_name.slice(1).toLowerCase():(p.full_name||"#"+x.driver_number);
    const g=x.gap_to_leader,gap=Array.isArray(g)?g.filter(v=>v!=null).pop():g;
    return{pos:x.position,num:x.driver_number,name,acr:p.name_acronym||"",team:p.team_name||"",color:p.team_colour?"#"+p.team_colour:"",ita:ITA(p),gap:typeof gap==="number"&&gap>0?"+"+gap.toFixed(3):typeof gap==="string"?gap:""};});};

/* ---------- caselle per la home (sport "moto") ---------- */
F1.items=async function(day,ttl){
  const key=SL.dayKey(SL.addDays(Date.now(),day)),[S,M]=await Promise.all([F1.sessions(ttl&&ttl<60000?60000:36e5),F1.meetings()]);
  const L=S.filter(s=>SL.dayKey(s.date_start)===key||(day===0&&F1.state(s)==="in"));
  return Promise.all(L.map(async s=>{const st=F1.state(s),m=M[s.meeting_key],sn=F1.sesName(s),gp=F1.gpName(m)||s.location;
    const all=st==="post"?await F1.result(s.session_key).catch(()=>[]):[],ib=all.slice(3).find(r=>r.ita),top=all.slice(0,3).concat(ib?[ib]:[]);
    const won=/Gara|Sprint$/.test(sn)?"vince":/Qualifiche/.test(sn)?"pole":"";
    return{id:"moto:f1:"+s.session_key,sport:"moto",comp:"F1 · "+gp,date:s.date_start,state:st,live:st==="in",done:st==="post",
      status:st==="in"?sn.toUpperCase():st==="post"?(top.length?sn.toUpperCase():"FINITA"):SL.when(s.date_start),
      important:top.some(r=>r.ita||favD(r.name)),f1:{ses:sn,gp,top},
      sig:st+"|"+(top[0]&&top[0].num),
      lines:top.length?top.map((r,i)=>({pos:r.pos,n:r.name,ita:r.ita,v:i===0?won:r.gap})):[{n:sn+(st==="in"?" in corso":""),ico:/Gara|Sprint$/.test(sn)?"flag":"stopwatch",v:st==="pre"?SL.fmtTime(s.date_start):""}],
      foot:sn+" · "+(s.circuit_short_name||s.location||""),go:{sport:"moto",s:"f1"}};}));};
F1.onChange=function(p,it){const f=it.f1;if(!f)return null;
  if(p.state==="pre"&&it.state==="in")return{id:"k:"+it.id,big:"VIA",icon:"flag",title:"F1 · "+f.ses,text:f.gp,color:"var(--red)"};
  const w=f.top[0];if(w&&p.state!=="post"&&it.state==="post"){const big=/Gara|Sprint$/.test(f.ses)?"VINCE":/Qualifiche/.test(f.ses)?"POLE":"P1";
    return{id:"w:"+it.id,big,icon:w.ita?"ita":"flag",title:w.name,text:"F1 · "+f.ses+" · "+f.gp,color:"var(--red)",important:w.ita||favD(w.name)};}
  return null;};

/* ---------- fatti: ultimo GP, leader del mondiale, prossimo GP ---------- */
F1.facts=async function(){const out=[];
  try{const d=await SL.tryGet(JO+"current/last/results.json",{ttl:18e5});const r=d&&d.MRData.RaceTable.Races[0];const w=r&&r.Results&&r.Results[0];
    if(w)out.push({l:"Ultimo GP F1 · "+r.raceName.replace(/\s*Grand Prix$/i,""),v:"vince "+w.Driver.givenName+" "+w.Driver.familyName,go:{sport:"moto",s:"f1"}});}catch(e){}
  try{const d=await SL.tryGet(JO+"current/driverstandings.json",{ttl:18e5});const L=d&&d.MRData.StandingsTable.StandingsLists[0];const t=L&&L.DriverStandings[0];
    if(t){const S=await F1.sessions().catch(()=>[]),over=!S.some(s=>s.session_name==="Race"&&new Date(s.date_start)>Date.now());
      out.push({l:(over?"Campione":"Leader")+" F1 "+L.season,v:t.Driver.givenName+" "+t.Driver.familyName+" · "+t.points+" pt",go:{sport:"moto",s:"f1"}});}}catch(e){}
  try{const [S,M]=await Promise.all([F1.sessions(),F1.meetings()]),now=Date.now();
    const n=S.find(s=>new Date(s.date_start)>now&&!/^Day/.test(s.session_name));
    if(n){const m=M[n.meeting_key],first=S.find(s=>s.meeting_key===n.meeting_key);
      out.push(first&&new Date(first.date_start)>now?{l:"Prossimo GP F1",v:F1.gpName(m)+" · dal "+SL.fmtDay(first.date_start),go:{sport:"moto",s:"f1"}}:{l:"Prossima sessione F1",v:F1.sesName(n)+" · "+F1.gpName(m)+" · "+SL.when(n.date_start),go:{sport:"moto",s:"f1"}});}}catch(e){}
  return out;};
})();
