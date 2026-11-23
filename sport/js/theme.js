/* Sport LIVE APP — personalità di ogni sport: icone disegnate a mano, sfondi illustrati, testata con motto.
   Le icone esistono una volta sola qui: diventano simboli SVG (per l'HTML) e maschere CSS (per pallini, caricamento, filigrana). */
(function(){
"use strict";
const I=SL.icons={};
/* 24x24, tratto 1.8, angoli arrotondati: stessa famiglia per tutte */
const ICONS={
  /* pallone classico: pentagono centrale, cuciture e cinque toppe sul bordo */
  calcio:'<circle cx="12" cy="12" r="9.5"/><path d="M12 8.4l3.42 2.49-1.3 4.02H9.88l-1.3-4.02z" fill="currentColor"/><path d="M12 8.4V5.1M15.42 10.89l3.14-1.02M14.12 14.91l1.94 2.67M9.88 14.91l-1.94 2.67M8.58 10.89l-3.14-1.02"/><path d="M12 5.1L9.38 2.87A9.5 9.5 0 0 1 14.62 2.87zM18.56 9.87l1.32-3.18a9.5 9.5 0 0 1 1.61 4.98zM16.06 17.58l3.43.27a9.5 9.5 0 0 1-4.24 3.08zM7.94 17.58l.81 3.35a9.5 9.5 0 0 1-4.24-3.08zM5.44 9.87l-2.93 1.8a9.5 9.5 0 0 1 1.61-4.98z" fill="currentColor"/>',
  basket:'<circle cx="12" cy="12" r="9.5"/><path d="M12 2.5v19M2.5 12h19M5.3 5.3c3.1 3.3 3.1 10.1 0 13.4M18.7 5.3c-3.1 3.3-3.1 10.1 0 13.4"/>',
  tennis:'<circle cx="12" cy="12" r="9.5" fill="currentColor" fill-opacity=".2"/><path d="M4.3 6.4c4 2.6 5.1 7.6 2.3 13.1M19.7 17.6c-4-2.6-5.1-7.6-2.3-13.1"/>',
  rugby:'<g transform="rotate(-38 12 12)"><ellipse cx="12" cy="12" rx="10" ry="6.2"/><path d="M7.5 12h9M9.3 10.4v3.2M12 10.4v3.2M14.7 10.4v3.2"/></g>',
  moto:'<path d="M3.5 15.5C3.5 9 7.6 4.5 13.2 4.5c4.7 0 7.8 3.5 7.8 8.1v3.6c0 1.3-1 2.3-2.3 2.3H6c-1.4 0-2.5-1.1-2.5-2.5z"/><path d="M12.4 9.2h8.4v4.1h-6.9c-.8 0-1.5-.7-1.5-1.5z" fill="currentColor"/><path d="M6 14.6h7"/>',
  /* golf: bandierina sulla buca e pallina sul green */
  golf:'<path d="M8.5 19.5V2.8"/><path d="M8.5 3.2l9.5 3.4-9.5 3.4z" fill="currentColor"/><ellipse cx="11" cy="19.6" rx="8.5" ry="2.1"/><circle cx="17.6" cy="16.2" r="1.7" fill="currentColor"/>',
  golfball:'<circle cx="12" cy="12" r="9.5"/><g fill="currentColor" stroke="none"><circle cx="9" cy="8" r="1.1"/><circle cx="13.2" cy="7" r="1.1"/><circle cx="16.4" cy="10.6" r="1.1"/><circle cx="11.6" cy="11.4" r="1.1"/><circle cx="7.6" cy="12.6" r="1.1"/><circle cx="14.6" cy="15" r="1.1"/><circle cx="10" cy="16" r="1.1"/></g>',
  home:'<circle cx="12" cy="12" r="2.4" fill="currentColor"/><path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.3 5.3a9.5 9.5 0 0 0 0 13.4M18.7 5.3a9.5 9.5 0 0 1 0 13.4"/>',
  flag:'<path d="M5 21.5V3M5 4h14v9H5z"/><path d="M5 4h3.5v3H5zM12 4h3.5v3H12zM8.5 7H12v3H8.5zM15.5 7H19v3h-3.5zM5 10h3.5v3H5zM12 10h3.5v3H12z" fill="currentColor" stroke="none"/>',
  card:'<rect x="7" y="3.5" width="10" height="17" rx="1.8" fill="currentColor" transform="rotate(8 12 12)"/>',
  sub:'<path d="M8 3.5v15M4.5 15L8 18.5l3.5-3.5M16 20.5v-15M12.5 9L16 5.5 19.5 9"/>',
  whistle:'<circle cx="9" cy="14.5" r="5.5"/><path d="M9 9h11.5v3.6h-6.2M14 9l-1.5-2.5"/><circle cx="9" cy="14.5" r="1.6" fill="currentColor"/>',
  var:'<rect x="2.5" y="4" width="19" height="12.5" rx="2"/><path d="M9 21h6M12 16.5V21"/><path d="M10 7.8v5l4.2-2.5z" fill="currentColor"/>',
  goal:'<path d="M2.5 19.5v-13h19v13"/><path d="M2.5 10h19M2.5 14h19M7 6.5v13M12 6.5v13M17 6.5v13" stroke-opacity=".4"/><circle cx="15.5" cy="16" r="3.4" fill="currentColor" stroke="none"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
  clock:'<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.8 2.4"/>',
  posts:'<path d="M7 21.5V2.5M17 21.5V2.5M7 13h10"/><path d="M4 21.5h6M14 21.5h6" stroke-opacity=".5"/>',
  trophy:'<path d="M7.5 3.5h9v5a4.5 4.5 0 0 1-9 0zM7.5 5.5h-3a3 3 0 0 0 3 4M16.5 5.5h3a3 3 0 0 1-3 4M12 13v4M8.5 20.5h7M9.5 17h5v3.5h-5z"/>',
  stopwatch:'<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5v-4M10 2.5h4M18.5 6.5L20 5"/>',
  racket:'<ellipse cx="9.5" cy="9.5" rx="6" ry="6.6" transform="rotate(-45 9.5 9.5)"/><path d="M13.8 13.8l6.7 6.7"/><path d="M6.5 7.5l6 6M9 5.5l4.5 4.5M5 10l4 4" stroke-opacity=".5"/>',
  wheel:'<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><path d="M12 2.5v7.3M12 14.2v7.3M2.5 12h7.3M14.2 12h7.3M5.3 5.3l5.2 5.2M13.5 13.5l5.2 5.2M18.7 5.3l-5.2 5.2M10.5 13.5l-5.2 5.2" stroke-opacity=".6"/>',
  star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/>',
  /* tricolore: colori fissi (le emoji bandiera su Windows diventano "IT") */
  ita:'<rect x="2" y="5.5" width="20" height="13" rx="2.2" fill="#ce2b37" stroke="none"/><rect x="2" y="5.5" width="13.4" height="13" rx="2.2" fill="#f1f2f1" stroke="none"/><rect x="2" y="5.5" width="6.7" height="13" rx="2.2" fill="#009246" stroke="none"/><rect x="6" y="5.5" width="2.7" height="13" fill="#009246" stroke="none"/>'
};
I.list=ICONS;
const wrap=(inner,col)=>'<g fill="none" stroke="'+col+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+inner.replace(/currentColor/g,col)+'</g>';
SL.ico=(name,cls)=>'<svg class="ico'+(cls?" "+cls:"")+'" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-'+name+'"/></svg>';
const svgUrl=s=>'url("data:image/svg+xml,'+encodeURIComponent(s)+'")';

/* ---------- sfondi illustrati (tratti chiarissimi, restano dietro ai dati) ---------- */
const X='xmlns="http://www.w3.org/2000/svg"';
const BG={
  calcio:'<svg '+X+' viewBox="0 0 1050 680" fill="none" stroke="#fff" stroke-opacity=".075" stroke-width="3"><rect x="5" y="5" width="1040" height="670" rx="4"/><path d="M525 5v670"/><circle cx="525" cy="340" r="91.5"/><circle cx="525" cy="340" r="5" fill="#fff" fill-opacity=".12"/><rect x="5" y="138" width="165" height="403"/><rect x="880" y="138" width="165" height="403"/><rect x="5" y="248" width="55" height="183"/><rect x="990" y="248" width="55" height="183"/><path d="M170 268a91.5 91.5 0 0 1 0 144M880 268a91.5 91.5 0 0 0 0 144"/><path d="M5 25a20 20 0 0 0 20-20M1025 5a20 20 0 0 0 20 20M5 655a20 20 0 0 1 20 20M1045 655a20 20 0 0 0-20 20"/></svg>',
  basket:'<svg '+X+' viewBox="0 0 500 470" fill="none" stroke="#fff" stroke-opacity=".085" stroke-width="3"><rect x="170" y="280" width="160" height="190"/><circle cx="250" cy="280" r="60"/><path d="M30 470V330a237.5 237.5 0 0 1 440 0v140"/><path d="M220 430h60"/><circle cx="250" cy="417" r="9" stroke="#f5803e" stroke-opacity=".35"/><path d="M0 2h500" stroke-opacity=".05"/><path d="M190 2a60 60 0 0 0 120 0"/></svg>',
  tennis:'<svg '+X+' viewBox="0 0 2377 1097" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="9"><rect x="5" y="5" width="2367" height="1087"/><path d="M5 141h2367M5 956h2367M548 141v815M1829 141v815M548 548h1281M30 548h30M2317 548h30"/><path d="M1188 0v1097" stroke-dasharray="16 12" stroke-opacity=".14" stroke-width="12"/></svg>',
  rugby:'<svg '+X+' viewBox="0 0 1200 700" fill="none" stroke="#fff" stroke-opacity=".07" stroke-width="4"><path d="M100 0v700M1100 0v700M600 0v700M320 0v700M880 0v700"/><path d="M200 0v700M1000 0v700M480 0v700M720 0v700" stroke-dasharray="22 18" stroke-opacity=".05"/><path d="M100 300l-30-0M100 400h-30" stroke-opacity=".2" stroke-width="6"/><path d="M1100 300h30M1100 400h30" stroke-opacity=".2" stroke-width="6"/></svg>',
  moto:'<svg '+X+' viewBox="0 0 220 220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .06 0"/></filter><rect width="220" height="220" filter="url(#n)"/></svg>'
};
/* home: coriandoli di sport */
function confetti(){const spots=[["calcio",30,30,1.5,-12],["basket",190,60,1.3,18],["tennis",110,150,1.1,0],["rugby",250,200,1.4,-20],["moto",40,230,1.3,8],["golf",120,260,1.1,-6],["flag",180,250,1,12],["trophy",250,110,1,-8]];
  return'<svg '+X+' viewBox="0 0 300 300">'+spots.map(([n,x,y,s,r])=>'<g transform="translate('+x+' '+y+') scale('+s+') rotate('+r+' 12 12)" opacity=".06">'+wrap(ICONS[n],"#fff")+'</g>').join("")+'</svg>';}

I.init=function(){
  /* simboli per <use> */
  const sp=document.createElement("div");sp.setAttribute("aria-hidden","true");sp.style.cssText="position:absolute;width:0;height:0;overflow:hidden";
  sp.innerHTML='<svg xmlns="http://www.w3.org/2000/svg">'+Object.keys(ICONS).map(k=>'<symbol id="i-'+k+'" viewBox="0 0 24 24">'+wrap(ICONS[k],"currentColor")+'</symbol>').join("")+'</svg>';
  document.body.prepend(sp);
  /* maschere e sfondi come variabili CSS */
  const st=document.documentElement.style;
  Object.keys(ICONS).forEach(k=>st.setProperty("--ic-"+k,svgUrl('<svg '+X+' viewBox="0 0 24 24">'+wrap(ICONS[k],"#000")+'</svg>')));
  Object.keys(BG).forEach(k=>st.setProperty("--art-"+k,svgUrl(BG[k])));
  st.setProperty("--art-home",svgUrl(confetti()));
};

/* ---------- testata di ogni sport: nome + informazioni utili che cambiano (capolista, ultimo vincitore, prossimo evento…) ---------- */
I.head=function(sport){if(sport==="home"||window.isFollower())return null;const m=SL.sports[sport],h=SL.h;
  const el=document.createElement("div");el.className="sporthead";
  el.innerHTML='<span class="shicon">'+SL.ico(sport)+'</span><div class="shtxt"><h1>'+h(m.name)+'</h1><div class="facts" aria-live="polite"><span class="fact load"><small>Carico le ultime notizie…</small></span></div></div>';
  const st=Object.assign({},SL.state),rid=SL.routeId;
  SL.ticker.facts(sport,st).then(F=>{if(rid!==SL.routeId)return;const box=el.querySelector(".facts");
    box.innerHTML=F.length?F.map(f=>f.go?'<button type="button" class="fact" data-go="'+h(JSON.stringify(f.go))+'"><small>'+h(f.l)+'</small><b>'+h(f.v)+'</b></button>':'<span class="fact"><small>'+h(f.l)+'</small><b>'+h(f.v)+'</b></span>').join(""):"";});
  el.addEventListener("click",e=>{const b=e.target.closest(".fact[data-go]");if(b)try{SL.go(JSON.parse(b.dataset.go));}catch(x){}});
  return el;};
/* ---------- credito della foto di sfondo ---------- */
const CRED={calcio:["Foto: Unsplash","https://unsplash.com/license"],basket:["Foto: Unsplash","https://unsplash.com/license"],tennis:["Foto: Unsplash","https://unsplash.com/license"],
  rugby:["Foto: David Roberts · CC BY 2.0","https://commons.wikimedia.org/wiki/File:2015_Rugby_World_Cup,_France_vs._Romania_(21048401024).jpg"],
  golf:["Foto: Unsplash","https://unsplash.com/license"],
  moto:["Foto: TeamEG00 · pubblico dominio","https://commons.wikimedia.org/wiki/File:Marc_M%C3%A1rquez_leading_the_pack_during_the_2025_Aragon_motorcycle_Grand_Prix.jpg"]};
I.credit=function(sport){const a=document.getElementById("photoCredit");if(!a)return;const c=CRED[sport];if(!c){a.hidden=true;return;}a.textContent=c[0];a.href=c[1];a.hidden=window.isFollower();}; /* la home non ha foto */
})();
