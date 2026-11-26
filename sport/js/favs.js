/* Sport LIVE APP — finestra "★ Preferiti" (pulsante in alto)
   Mostra chi segui con il suo evento più vicino (in diretta, prossimo o ultimo risultato), lo toglie con ✕,
   e permette di aggiungere squadre, tennisti, golfisti e piloti cercandoli tra gli eventi da ieri a dopodomani. */
(function(){
"use strict";
const h=SL.h,$=id=>document.getElementById(id);
const SPN={calcio:"Calcio",basket:"Basket",tennis:"Tennis",rugby:"Rugby",moto:"F1 e MotorSport",golf:"Golf"};
const COL={calcio:"#2fbf71",basket:"#f5803e",tennis:"#c9dc3c",rugby:"#3fa7d6",moto:"#e5383b",golf:"#d8b45a"};

/* tutti gli eventi conosciuti: oggi (raccoglitore in background) + gli altri giorni della home */
function allItems(){const L=SL.live,out=[];
  Object.values(L.bySport||{}).forEach(a=>(a||[]).forEach(x=>out.push(x)));
  Object.values(L.days||{}).forEach(d=>Object.values((d&&d.res)||{}).forEach(a=>(a||[]).forEach(x=>out.push(x))));
  return out;}
/* chi compare in un evento, con la stessa chiave che usano le ★ nelle pagine */
function people(it){const s=it.sport,out=[],ev=it.ev;
  if(ev&&ev.home&&ev.away){const eu=s==="basket"&&ev.league&&ev.league!=="nba";
    [ev.home,ev.away].forEach(t=>{const id=eu?"eu:"+(t.code||t.id):t.id;if(id&&t.name)out.push({k:SL.fav.key(s,"team",id),s,n:t.name,img:t.logo||"",ita:false});});}
  else if(it.m&&it.m.p)it.m.p.forEach(p=>{if(p.id&&p.name)out.push({k:SL.fav.key("tennis","player",p.id),s:"tennis",n:p.name,img:p.flag||"",ita:!!p.ita});});
  else if(it.T&&it.T.P)it.T.P.forEach(p=>{if(p.id&&p.name)out.push({k:SL.fav.key("golf","player",p.id),s:"golf",n:p.name,img:p.flag||"",ita:!!p.ita});});
  else(it.lines||[]).forEach(l=>{if(l.pos!=null&&l.n)out.push({k:SL.fav.key(s,"rider",SL.norm(l.n).replace(/\s+/g,"-")),s,n:l.n,img:l.img||"",ita:!!l.ita});});
  return out;}
const isFav=p=>SL.fav.has(p.k)||SL.fav.hasName(p.s,p.n);
/* l'evento più utile per un preferito: in diretta, poi il prossimo, poi l'ultimo finito */
function eventOf(f,items){const mine=items.filter(it=>it.sport===f.s&&people(it).some(p=>p.k===f.k||SL.norm(p.n)===SL.norm(f.n)));
  const now=Date.now();
  return mine.find(x=>x.live)||mine.filter(x=>x.state==="pre").sort((a,b)=>new Date(a.date)-new Date(b.date))[0]||mine.filter(x=>x.done).sort((a,b)=>new Date(b.date)-new Date(a.date))[0]||null;}
const summary=it=>{const L=it.lines||[];if(L.length>=2&&L.every(l=>l.pos==null))return L.slice(0,2).map(l=>l.n+(l.v!==""&&l.v!=null&&it.state!=="pre"?" "+l.v:"")).join(" – ");
  return(it.comp||"").split(" · ").slice(-1)[0];};

function drawMine(){const L=SL.fav.list,box=$("favMine"),items=allItems();
  $("favN").textContent=L.length?"("+L.length+")":"";
  if(!L.length){box.innerHTML='<div class="favempty">★ Non segui ancora nessuno. Cerca qui sotto o tocca la ★ accanto a un nome nelle pagine degli sport.</div>';return;}
  const order=Object.keys(SPN);
  box.innerHTML=L.slice().sort((a,b)=>(order.indexOf(a.s)-order.indexOf(b.s))||a.n.localeCompare(b.n)).map(f=>{const ev=eventOf(f,items);
    const st=!ev?'<span class="fv-st muted">Nessun evento da ieri a dopodomani</span>':
      '<span class="fv-st'+(ev.live?" live":"")+'">'+(ev.live?'<i class="dot"></i>LIVE · ':ev.done?"Ultima: ":SL.when(ev.date)+" · ")+h(summary(ev))+(ev.done&&ev.status?" · "+h(ev.status):"")+'</span>';
    /* sotto: i marcatori della squadra preferita (calcio), le mete (rugby), il migliore (NBA) */
    let more="";if(ev&&ev.ev&&(ev.live||ev.done)){const e=ev.ev,id=f.k.split(":")[2],w=e.home&&String(e.home.id)===id?"home":e.away&&String(e.away.id)===id?"away":null;
      if(w&&f.s==="calcio"){const g=SL.espn.goalsText(e,w,true);more=g?"⚽ "+g:"";}
      else if(w&&f.s==="rugby"){const T=(e.plays||[]).filter(x=>x.side===w&&x.kind==="meta");more=T.length?"Mete: "+T.map(x=>x.n+" "+x.m).join(", "):"";}
      else if(w&&f.s==="basket"){const p=((e[w]||{}).lead||[]).find(x=>x.k==="points");more=p?"Migliore: "+p.n+" "+p.v+" pt":"";}}
    return'<div class="fv sp-'+h(f.s)+'" style="--tc:'+(COL[f.s]||"#888")+'">'+
      '<button type="button" class="fv-main"'+(ev?' data-go="'+h(JSON.stringify(ev.go||{sport:f.s}))+'"':' data-go="'+h(JSON.stringify({sport:f.s}))+'"')+' title="Apri">'+
        '<span class="fv-ic">'+SL.ico(f.s||"star")+'</span><span class="fv-tx"><b>'+h(f.n)+'</b><small>'+h(SPN[f.s]||"")+'</small>'+st+(more?'<span class="fv-more">'+h(more)+'</span>':"")+'</span></button>'+
      '<button type="button" class="fv-x" data-del="'+h(f.k)+'" aria-label="Togli '+h(f.n)+' dai preferiti" title="Togli dai preferiti">✕</button></div>';}).join("");}

let IDX=null,idxAsk=false;
function drawSug(){const q=SL.norm($("favQ").value),box=$("favSug"),seen=new Set(),C=[];
  allItems().forEach(it=>people(it).forEach(p=>{const id=p.s+"|"+SL.norm(p.n);if(seen.has(id))return;seen.add(id);if(!isFav(p))C.push(p);}));
  /* scrivendo un nome cerco anche tra squadre dei campionati principali, NBA, EuroLega, primi 200 del tennis, piloti di F1 */
  if(q&&q.length>=2&&SL.extra&&SL.extra.favIndex){if(!IDX&&!idxAsk){idxAsk=true;SL.extra.favIndex().then(L=>{IDX=L;if($("dlgFav").open)drawSug();}).catch(()=>{idxAsk=false;});}
    (IDX||[]).forEach(p=>{const id=p.s+"|"+SL.norm(p.n);if(seen.has(id))return;seen.add(id);if(!isFav(p))C.push(p);});}
  let L=q?C.filter(p=>SL.norm(p.n).indexOf(q)>=0):C.filter(p=>p.ita||/^(italia|italy)$/i.test(p.n)||(SL.espn.itaClubs&&p.s==="calcio"&&SL.espn.itaClubs.has(p.k.split(":")[2])));
  const order=Object.keys(SPN);L.sort((a,b)=>(order.indexOf(a.s)-order.indexOf(b.s))||a.n.localeCompare(b.n));
  const more=L.length>60;L=L.slice(0,60);
  if(!C.length){box.innerHTML='<div class="favempty">Carico gli eventi dei prossimi giorni…</div>';return;}
  box.innerHTML=(q?"":'<div class="favlab">Italiani in campo nei prossimi giorni</div>')+(q&&q.length>=2&&!IDX?'<div class="favlab">Cerco anche tra tutte le squadre e gli atleti…</div>':"")+(L.length?L.map(p=>'<button type="button" class="chip fvadd sp-'+h(p.s)+'" data-k="'+h(p.k)+'" data-n="'+h(p.n)+'" data-s="'+h(p.s)+'" style="--tc:'+COL[p.s]+'">'+
      (p.img?'<img src="'+h(p.img)+'" alt="" loading="lazy">':SL.ico(p.s))+'＋ '+h(p.n)+'</button>').join(""):'<div class="favempty">Nessun nome trovato'+(q?' per "'+h($("favQ").value)+'"':"")+(IDX?' tra eventi, squadre e atleti.':' tra gli eventi da ieri a dopodomani.')+'</div>')+
    (more?'<div class="favlab">…e altri: scrivi qualche lettera per restringere.</div>':"");}

function draw(){drawMine();drawSug();}
function badge(){const n=SL.fav.list.length,b=$("favBadge");if(!b)return;b.textContent=n||"";b.hidden=!n;}
async function open(){const d=$("dlgFav");if(!d)return;$("favQ").value="";draw();if(!d.open)d.showModal();
  /* se la home non ha ancora caricato gli altri giorni, li chiedo adesso */
  const L=SL.live;if(L.collect){const miss=[-1,1,2].filter(x=>!(L.days&&L.days[x]));
    for(const x of miss){try{const r=await L.collect(x);L.days[x]={t:Date.now(),res:r};if(d.open)draw();}catch(e){}}}}
SL.openFavs=open;

function init(){const d=$("dlgFav");if(!d)return;
  $("btnFav").addEventListener("click",open);
  const sf=$("setFav");if(sf)sf.addEventListener("click",()=>{$("dlgSettings").close();open();});
  $("favQ").addEventListener("input",drawSug);
  $("favQ").addEventListener("keydown",e=>{if(e.key==="Enter")e.preventDefault();}); /* Invio non deve chiudere la finestra */
  d.addEventListener("click",e=>{
    const del=e.target.closest("[data-del]");if(del){e.preventDefault();const f=SL.fav.list.find(x=>x.k===del.dataset.del);if(f)SL.fav.toggle(f);return;}
    const add=e.target.closest(".fvadd");if(add){e.preventDefault();SL.fav.toggle({k:add.dataset.k,n:add.dataset.n,s:add.dataset.s});return;}
    const go=e.target.closest(".fv-main[data-go]");if(go){e.preventDefault();d.close();try{SL.go(JSON.parse(go.dataset.go));}catch(x){}}});
  SL.on("fav",()=>{badge();if(d.open)draw();});
  SL.on("live",()=>{if(d.open)drawMine();});
  badge();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
