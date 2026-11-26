/* Sport LIVE APP — due pagine in più:
   #/agenda  "La mia settimana": preferiti e Italia nei prossimi 7 giorni, sovrapposizioni, esportazione nel calendario (.ics)
   #/multi   "Vista 2×2": fino a 4 eventi di sport diversi insieme, con evidenziati i momenti caldi */
(function(){
"use strict";
const h=SL.h,UI=SL.ui;
const SPORTS=["calcio","basket","tennis","rugby","moto","golf"];
const SPN={calcio:"Calcio",basket:"Basket",tennis:"Tennis",rugby:"Rugby",moto:"Motori",golf:"Golf"};
/* durata indicativa per trovare le sovrapposizioni e per il calendario (minuti) */
const COL={calcio:"#2fbf71",basket:"#f5803e",tennis:"#c9dc3c",rugby:"#3fa7d6",moto:"#e5383b",golf:"#d8b45a"};
const DUR={calcio:115,basket:150,tennis:120,rugby:110,moto:120,golf:300};

/* titolo leggibile di un evento: squadre o atleti, altrimenti torneo/gara */
const titleOf=it=>{const L=it.lines||[];if(L.length>=2&&L.every(l=>l.pos==null))return L.slice(0,2).map(l=>String(l.n||"").replace(/^\(\d+\)\s*/,"")).join(" – ");
  const c=String(it.comp||"").split(" · ");return c.length>1?c.slice(-2).join(" · "):(it.comp||SPN[it.sport]||"");};
const compOf=it=>{const L=it.lines||[];return L.length>=2&&L.every(l=>l.pos==null)?(it.comp||""):(SPN[it.sport]||"");};
const isMine=it=>SL.homeFav(it)||SL.homeIta(it);
/* eventi finiti o in corso: risultato e marcatori (o primi classificati) */
function resultOf(it){if(!(it.done||it.live))return"";const L=it.lines||[],num=v=>v!==""&&v!=null&&!isNaN(+v);let r="";
  if(L.length>=2&&L.every(l=>l.pos==null)&&num(L[0].v)&&num(L[1].v))r='<em class="agres">'+h(L[0].v)+' – '+h(L[1].v)+'</em>';
  else if(L.some(l=>l.pos!=null))r='<em class="agres">'+h(L.filter(l=>l.pos!=null).slice(0,3).map(l=>l.pos+". "+String(l.n).replace(/^\(\d+\)\s*/,"")).join(" · "))+'</em>';
  const sl=it.ev&&SL.espn.scoreLine?SL.espn.scoreLine(it.ev):"";
  return r+(sl?'<span class="agsc">'+sl+'</span>':"");}

/* ---------- calendario .ics ---------- */
const icsEsc=s=>String(s||"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");
const utc=d=>new Date(d).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
const fold=line=>{const out=[];let s=line;while(s.length>73){out.push(s.slice(0,73));s=" "+s.slice(73);}out.push(s);return out.join("\r\n");};
function ics(list){const now=utc(Date.now()),L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Sport LIVE APP//IT","CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:Sport LIVE"];
  list.forEach(it=>{const base=location.origin+location.pathname+SL.hashOf(it.go||{sport:it.sport});
    L.push("BEGIN:VEVENT","UID:"+String(it.id).replace(/[^\w.-]/g,"-")+"@sportlive","DTSTAMP:"+now);
    if(it.allDay||it.tbd){const k=SL.dayKey(it.date),n=SL.dayKey(SL.addDays(new Date(it.date),1));L.push("DTSTART;VALUE=DATE:"+k,"DTEND;VALUE=DATE:"+n);}
    else{const s=new Date(it.date);L.push("DTSTART:"+utc(s),"DTEND:"+utc(s.getTime()+(DUR[it.sport]||120)*60000));}
    L.push("SUMMARY:"+icsEsc((SL.homeFav(it)?"★ ":"")+titleOf(it)),"DESCRIPTION:"+icsEsc([compOf(it),it.foot,"Segui su Sport LIVE: "+base].filter(Boolean).join("\n")),"URL:"+base,"END:VEVENT");});
  L.push("END:VCALENDAR");return L.map(fold).join("\r\n")+"\r\n";}
function download(name,text){const b=new Blob([text],{type:"text/calendar;charset=utf-8"}),u=URL.createObjectURL(b),a=document.createElement("a");
  a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);}
SL.ics={make:ics,download};

/* ---------- dati della settimana: gli stessi della home, giorno per giorno ---------- */
const WEEK=[0,1,2,3,4,5,6];
async function dayRes(d,force){const L=SL.live,C=L.days||(L.days={});
  if(d===0&&SPORTS.some(s=>L.loaded[s]))return L.bySport;
  if(!force&&C[d]&&Date.now()-C[d].t<30*60000)return C[d].res;
  const r=await L.collect(d);C[d]={t:Date.now(),res:r};return r;}

/* =====================================================================
   LA MIA SETTIMANA
   ===================================================================== */
SL.sports.agenda={name:"La mia settimana",page:true,noHead:true,tickerAs:"home",mount(ctx){
  const main=ctx.main,st=ctx.st,mode=["mine","fav","all"].indexOf(st.f)>=0?st.f:"mine",sp=SPORTS.indexOf(st.s)>=0?st.s:"";
  main.innerHTML='<div class="vpage agenda">'+
    '<div class="vhead"><div><h1>'+SL.ico("cal")+'La mia settimana</h1><p class="muted">Oggi e i prossimi 6 giorni · orari italiani · <span id="agN">carico…</span></p></div>'+
      '<div class="vacts"><button type="button" class="btn pri" id="agIcs">'+SL.ico("cal")+' AGGIUNGI AL CALENDARIO</button><button type="button" class="btn" id="agHome">← HOME</button></div></div>'+
    '<div class="vtools"><div class="chips" id="agMode" role="group" aria-label="Quali eventi">'+
      [["mine","Preferiti e Italia"],["fav","Solo preferiti"],["all","Tutti"]].map(([k,n])=>'<button type="button" class="chip" data-m="'+k+'" aria-pressed="'+(k===mode)+'">'+(k==="fav"?"★ ":k==="mine"?SL.ico("ita")+" ":"")+h(n)+'</button>').join("")+'</div>'+
      '<div class="chips" id="agSp" role="group" aria-label="Sport"><button type="button" class="chip" data-s="" aria-pressed="'+(!sp)+'">Tutti gli sport</button>'+SPORTS.map(s=>'<button type="button" class="chip sp-'+s+'" data-s="'+s+'" aria-pressed="'+(s===sp)+'">'+SL.ico(s)+h(SPN[s])+'</button>').join("")+'</div></div>'+
    '<div class="agl" id="agList"><div class="loading">Carico la settimana</div></div></div>';
  const $=id=>main.querySelector("#"+id),RES={};let shown=[];
  const sel=it=>(mode==="all"||(mode==="fav"?SL.homeFav(it):isMine(it)))&&(!sp||it.sport===sp);
  function draw(){const box=$("agList"),days=WEEK.filter(d=>RES[d]);shown=[];
    let html="";
    WEEK.forEach(d=>{const r=RES[d];const dd=SL.addDays(Date.now(),d);
      const long=SL.fmtDayLong(dd),wd=long.split(" ")[0];
      const head='<header class="agd"><b>'+h(d===0?"Oggi":d===1?"Domani":wd.charAt(0).toUpperCase()+wd.slice(1))+'</b><span>'+h(d<2?long:long.split(" ").slice(1).join(" "))+'</span></header>';
      if(!r){html+='<section class="agday">'+head+'<div class="loading">Carico</div></section>';return;}
      let L=[].concat(...SPORTS.map(s=>r[s]||[])).filter(sel);
      /* stessa gara/partita può arrivare due volte (es. golf in più giorni): tengo la prima */
      const seen=new Set();L=L.filter(x=>{if(seen.has(x.id))return false;seen.add(x.id);return true;});
      L.sort((a,b)=>((a.allDay||a.tbd)-(b.allDay||b.tbd))||(new Date(a.date)-new Date(b.date)));
      /* sovrapposizioni tra eventi con orario */
      const T=L.filter(x=>!x.allDay&&!x.tbd).map(x=>({x,s:+new Date(x.date),e:+new Date(x.date)+(DUR[x.sport]||120)*60000}));
      const clash=new Set();T.forEach((a,i)=>T.slice(i+1).forEach(b=>{if(b.s<a.e&&a.s<b.e){clash.add(a.x.id);clash.add(b.x.id);}}));
      shown=shown.concat(L);
      html+='<section class="agday">'+head+(L.length?L.map(it=>{const fav=SL.homeFav(it),ita=SL.homeIta(it);
        return'<div class="agev sp-'+it.sport+(it.live?" live":"")+(clash.has(it.id)?" clash":"")+'" style="--tc:'+COL[it.sport]+'">'+
          '<span class="agt">'+(it.live?'<i class="dot"></i>LIVE':it.allDay?"tutto il giorno":it.tbd?"da definire":h(SL.fmtTime(it.date)))+'</span>'+
          '<button type="button" class="agmain" data-go="'+h(JSON.stringify(it.go||{sport:it.sport}))+'">'+SL.ico(it.sport)+'<span><b>'+(fav?'<em class="agfav">★</em>':"")+h(titleOf(it))+(ita?' '+SL.ico("ita"):"")+'</b><small>'+h(compOf(it))+(it.done?" · "+h(it.status||"finita"):"")+'</small>'+resultOf(it)+
          (clash.has(it.id)?'<em class="agclash" title="In contemporanea con un altro evento della lista">SI SOVRAPPONE</em>':"")+'</span></button>'+
          '<button type="button" class="btn agone" data-ics="'+h(it.id)+'" title="Aggiungi questo evento al calendario" aria-label="Aggiungi al calendario: '+h(titleOf(it))+'">'+SL.ico("cal")+'</button></div>';}).join(""):
        '<p class="muted agnone">'+(mode==="all"?"Nessun evento.":mode==="fav"?"Nessun evento dei tuoi preferiti.":"Nessun evento dei preferiti o dell'Italia.")+'</p>')+'</section>';});
    box.innerHTML=html;
    const n=shown.filter(x=>!x.done).length;$("agN").textContent=days.length<WEEK.length?"carico i giorni…":n+(n===1?" evento in arrivo":" eventi in arrivo");
    $("agIcs").disabled=!n;}
  /* carico i giorni uno alla volta, dal più vicino */
  (async()=>{const rid=SL.routeId;for(const d of WEEK){try{RES[d]=await dayRes(d);}catch(e){RES[d]={};}if(rid!==SL.routeId)return;draw();}})();
  SL.onPage("live",()=>{RES[0]=SL.live.bySport;draw();});
  SL.onPage("fav",draw);
  main.addEventListener("click",e=>{
    const m=e.target.closest("#agMode [data-m]");if(m){SL.go({sport:"agenda",f:m.dataset.m==="mine"?"":m.dataset.m,s:sp},true);return;}
    const s=e.target.closest("#agSp [data-s]");if(s){SL.go({sport:"agenda",f:mode==="mine"?"":mode,s:s.dataset.s},true);return;}
    const one=e.target.closest("[data-ics]");if(one){const it=shown.find(x=>String(x.id)===one.dataset.ics);if(it){download("sport-live-"+String(it.id).replace(/[^\w-]/g,"")+".ics",ics([it]));SL.toast("Apri il file scaricato per aggiungerlo al calendario.");}return;}
    if(e.target.closest("#agIcs")){const L=shown.filter(x=>!x.done);if(!L.length)return;download("sport-live-settimana.ics",ics(L));SL.toast(L.length+" eventi nel file: aprilo per aggiungerli a Google Calendar, Apple Calendario o Outlook.");return;}
    if(e.target.closest("#agHome")){SL.go({sport:"home"});return;}
    const g=e.target.closest("[data-go]");if(g){try{SL.go(JSON.parse(g.dataset.go));}catch(x){}}});
}};

/* =====================================================================
   VISTA 2×2: fino a 4 eventi insieme
   ===================================================================== */
const MVK="mv.sel";
const todayAll=()=>[].concat(...SPORTS.map(s=>SL.live.bySport[s]||[]));
/* momenti caldi: ultimi minuti, ultimo quarto, tie-break, ultimi giri */
function hotOf(it){if(!it.live)return"";const s=String(it.status||"")+" "+String(it.ev&&it.ev.clock||"");
  if(it.sport==="calcio"){const m=s.match(/(\d+)'/);if(m&&+m[1]>=85)return"ULTIMI MINUTI";if(/rigori|supplementar/i.test(s))return/rigori/i.test(s)?"RIGORI":"SUPPLEMENTARI";}
  if(it.sport==="rugby"){const m=s.match(/(\d+)'/);if(m&&+m[1]>=72)return"ULTIMI MINUTI";}
  if(it.sport==="basket"){const ev=it.ev||{};const m=s.match(/(\d+):(\d+)/);if((ev.period||0)>=4&&m&&+m[1]<2)return ev.period>4?"SUPPLEMENTARE":"ULTIMI 2 MINUTI";if((ev.period||0)>4)return"SUPPLEMENTARE";
    const a=+(ev.home&&ev.home.score),b=+(ev.away&&ev.away.score);if((ev.period||0)>=4&&Math.abs(a-b)<=5)return"PUNTO A PUNTO";}
  if(it.sport==="tennis"){const L=it.lines||[];const sets=L.map(l=>String(l.v||"").trim().split(/\s+/));if(sets.length===2){const i=Math.max(sets[0].length,sets[1].length)-1;
    if(i>=0&&/^6/.test(sets[0][i]||"")&&/^6/.test(sets[1][i]||""))return"TIE-BREAK";}}
  if(it.sport==="moto"){const m=s.match(/(\d+)\s*\/\s*(\d+)/);if(m&&+m[2]-+m[1]<=3)return"ULTIMI GIRI";if(/ultimo giro|last lap/i.test(s))return"ULTIMO GIRO";}
  return"";}
function autoPick(){const A=todayAll(),I=x=>x.important?1:0;
  const live=A.filter(x=>x.live).sort((a,b)=>(!!hotOf(b)-!!hotOf(a))||(I(b)-I(a))),pre=A.filter(x=>x.state==="pre"&&!x.allDay).sort((a,b)=>(I(b)-I(a))||(new Date(a.date)-new Date(b.date)));
  return live.concat(pre).slice(0,4).map(x=>x.id);}
SL.sports.multi={name:"Vista 2×2",page:true,noHead:true,tickerAs:"home",mount(ctx){
  const main=ctx.main,$=id=>main.querySelector("#"+id),last={},hot={};
  let sel=SL.store.get(MVK,[]),auto=!sel.length;
  main.innerHTML='<div class="vpage multi">'+
    '<div class="vhead"><div><h1>'+SL.ico("grid")+'Vista 2×2</h1><p class="muted" id="mvSub">Fino a 4 eventi insieme. Quando succede qualcosa il riquadro si accende.</p></div>'+
      '<div class="vacts"><div class="chips" role="group" aria-label="Scelta degli eventi"><button type="button" class="chip" id="mvAuto" aria-pressed="'+auto+'">AUTOMATICA</button><button type="button" class="chip" id="mvPick" aria-pressed="'+!auto+'">SCELGO IO</button></div><button type="button" class="btn" id="mvHome">← HOME</button></div></div>'+
    '<div class="mvpick" id="mvPicker" hidden></div>'+
    '<div class="mvgrid" id="mvGrid"></div></div>';
  function ids(){const A=todayAll(),have=new Set(A.map(x=>x.id));return auto?autoPick():sel.filter(id=>have.has(id)).slice(0,4);}
  function draw(){const A=todayAll(),by=new Map(A.map(x=>[x.id,x])),L=ids().map(id=>by.get(id)).filter(Boolean),now=Date.now();
    L.forEach(it=>{if(last[it.id]&&last[it.id]!==it.sig)hot[it.id]=now+25000;last[it.id]=it.sig;});
    $("mvSub").textContent=auto?"Scelta automatica: prima gli eventi in diretta e i momenti caldi, poi i prossimi. Quando succede qualcosa il riquadro si accende.":"Scelti da te ("+L.length+" di 4). Quando succede qualcosa il riquadro si accende.";
    const g=$("mvGrid");g.className="mvgrid n"+Math.max(1,L.length);
    if(!L.length){g.innerHTML='<div class="empty">'+(SPORTS.some(s=>SL.live.loaded[s])?"Nessun evento oggi da mettere qui. Prova più tardi o scegli tu dalla lista.":"Carico gli eventi di oggi…")+'</div>';return;}
    g.innerHTML=L.map(it=>{const hv=hotOf(it),flash=hot[it.id]&&hot[it.id]>now;
      return'<div class="mvcell sp-'+it.sport+(hv?" crit":"")+(flash?" flash":"")+'" style="--tc:'+COL[it.sport]+'"><div class="mvtag">'+(flash?'<b class="mvnow">ADESSO</b>':"")+(hv?'<b>'+h(hv)+'</b>':"")+
        (!auto?'<button type="button" class="mvx" data-rm="'+h(it.id)+'" aria-label="Togli dalla vista">✕</button>':"")+'</div>'+SL.homeTile(it,{big:true})+'</div>';}).join("");}
  function drawPicker(){const P=$("mvPicker"),A=todayAll().filter(x=>!x.done).sort((a,b)=>(b.live-a.live)||(new Date(a.date)-new Date(b.date)));
    P.innerHTML='<p class="muted">Tocca fino a 4 eventi di oggi ('+sel.length+'/4):</p><div class="mvlist">'+(A.length?A.map(it=>{const on=sel.indexOf(it.id)>=0;
      return'<button type="button" class="chip mvopt sp-'+it.sport+'" data-id="'+h(it.id)+'" aria-pressed="'+on+'"'+(!on&&sel.length>=4?" disabled":"")+'>'+SL.ico(it.sport)+(it.live?'<i class="dot"></i>':"<small>"+h(SL.fmtTime(it.date))+"</small> ")+h(titleOf(it))+'</button>';}).join(""):'<span class="muted">Nessun evento ancora da giocare oggi.</span>')+'</div>';}
  draw();if(!auto){$("mvPicker").hidden=false;drawPicker();}
  SL.onPage("live",()=>{draw();if(!$("mvPicker").hidden)drawPicker();});
  SL.every(draw,5000,{delay:5000}); /* i riquadri "accesi" si spengono da soli */
  main.addEventListener("click",e=>{
    if(e.target.closest("#mvAuto")){auto=true;sel=[];SL.store.set(MVK,sel);$("mvAuto").setAttribute("aria-pressed","true");$("mvPick").setAttribute("aria-pressed","false");$("mvPicker").hidden=true;draw();return;}
    if(e.target.closest("#mvPick")){const wasAuto=auto;if(auto){sel=autoPick();SL.store.set(MVK,sel);}auto=false;$("mvAuto").setAttribute("aria-pressed","false");$("mvPick").setAttribute("aria-pressed","true");const P=$("mvPicker");P.hidden=wasAuto?false:!P.hidden;drawPicker();draw();return;}
    const o=e.target.closest(".mvopt");if(o){const id=o.dataset.id,i=sel.indexOf(id);if(i>=0)sel.splice(i,1);else if(sel.length<4)sel.push(id);SL.store.set(MVK,sel);drawPicker();draw();return;}
    const rm=e.target.closest("[data-rm]");if(rm){sel=sel.filter(x=>x!==rm.dataset.rm);SL.store.set(MVK,sel);if(!$("mvPicker").hidden)drawPicker();draw();return;}
    if(e.target.closest("#mvHome")){SL.go({sport:"home"});return;}
    const t=e.target.closest(".htile[data-go]");if(t){try{SL.go(JSON.parse(t.dataset.go));}catch(x){}}});
}};
})();
