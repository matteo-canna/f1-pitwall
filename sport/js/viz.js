/* Sport LIVE APP — grafica condivisa: grafici SVG, campi, parquet, 3D (three.js caricato solo quando serve) */
(function(){
"use strict";
const V=SL.viz={};
const h=SL.h;
V.hex=c=>{c=String(c||"").replace("#","");return/^[0-9a-f]{6}$/i.test(c)?"#"+c:null;};
/* colore leggibile su sfondo scuro: schiarisce i colori troppo scuri */
V.vivid=(c,fb)=>{const x=V.hex(c);if(!x)return fb||"#8792aa";const n=parseInt(x.slice(1),16),r=n>>16,g=n>>8&255,b=n&255,l=(.299*r+.587*g+.114*b);
  if(l>=70)return x;const k=(110-l)/110;const m=v=>Math.round(v+(255-v)*k*.85);return"#"+[m(r),m(g),m(b)].map(v=>v.toString(16).padStart(2,"0")).join("");};
/* due colori squadra distinguibili */
V.pair=(a,b,fa,fb)=>{let ca=V.vivid(a,fa||"#4f8ef7"),cb=V.vivid(b,fb||"#f59b42");
  const d=(x,y)=>{const p=parseInt(x.slice(1),16),q=parseInt(y.slice(1),16);return Math.abs((p>>16)-(q>>16))+Math.abs((p>>8&255)-(q>>8&255))+Math.abs((p&255)-(q&255));};
  if(d(ca,cb)<120)cb=ca.toLowerCase()==="#ffffff"?"#f59b42":"#f2f4f8";return[ca,cb];};

/* ---------- grafico a linee ---------- */
V.line=function(o){
  /* o: {w,h,series:[{pts:[[x,y]],color,fill,width,dash}],xmin,xmax,ymin,ymax,yticks:[v],xticks:[[v,label]],marks:[{x,label,color}],mid} */
  const W=o.w||600,H=o.h||200,L=o.padL==null?34:o.padL,R=8,T=10,B=20;
  const xs=(o.xmax-o.xmin)||1,ys=(o.ymax-o.ymin)||1;
  const X=x=>L+(x-o.xmin)/xs*(W-L-R),Y=y=>T+(1-(y-o.ymin)/ys)*(H-T-B);
  let s='<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="'+h(o.label||"grafico")+'" preserveAspectRatio="none" style="height:auto">';
  (o.yticks||[]).forEach(v=>{s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)" stroke-width="1"'+(v===o.mid?'':' stroke-dasharray="2 4"')+'/><text x="'+(L-5)+'" y="'+(Y(v)+3.5)+'" fill="var(--dim)" font-size="10" text-anchor="end" class="svgtxt">'+h(o.yfmt?o.yfmt(v):v)+'</text>';});
  (o.xticks||[]).forEach(([v,lab])=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--line)" stroke-width="1" stroke-dasharray="2 4"/><text x="'+X(v)+'" y="'+(H-6)+'" fill="var(--dim)" font-size="10" text-anchor="middle" class="svgtxt">'+h(lab)+'</text>';});
  (o.series||[]).forEach(se=>{if(!se.pts.length)return;const d=se.pts.map((p,i)=>(i?"L":"M")+X(p[0]).toFixed(1)+","+Y(p[1]).toFixed(1)).join("");
    if(se.fill){const base=Y(se.base==null?o.ymin:se.base);s+='<path d="'+d+"L"+X(se.pts[se.pts.length-1][0]).toFixed(1)+","+base+"L"+X(se.pts[0][0]).toFixed(1)+","+base+'Z" fill="'+se.fill+'" stroke="none"/>';}
    s+='<path d="'+d+'" fill="none" stroke="'+se.color+'" stroke-width="'+(se.width||2)+'" stroke-linejoin="round" stroke-linecap="round"'+(se.dash?' stroke-dasharray="'+se.dash+'"':"")+' vector-effect="non-scaling-stroke"/>';});
  (o.marks||[]).forEach(m=>{s+='<line x1="'+X(m.x)+'" x2="'+X(m.x)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="'+(m.color||"var(--muted)")+'" stroke-width="1.5" vector-effect="non-scaling-stroke"/>'+(m.label?'<text x="'+(X(m.x)+3)+'" y="'+(T+10+(m.dy||0))+'" fill="'+(m.color||"var(--muted)")+'" font-size="10" class="svgtxt">'+h(m.label)+'</text>':"");});
  return s+"</svg>";
};

/* ---------- campo da calcio orizzontale: coordinate 105 x 68 ---------- */
V.pitch=function(inner,o){o=o||{};const st='stroke="'+(o.line||"rgba(255,255,255,.55)")+'" stroke-width=".35" fill="none"';
  let stripes="";for(let i=0;i<10;i++)stripes+='<rect x="'+(i*10.5)+'" y="0" width="10.5" height="68" fill="'+(i%2?"#1d6b3c":"#22773f")+'"/>';
  return'<svg viewBox="-2 -2 109 72" width="100%" role="img" aria-label="'+h(o.label||"campo")+'" style="height:auto;border-radius:10px;background:#1d6b3c">'+(o.plain?'<rect x="-2" y="-2" width="109" height="72" fill="#15301f"/>':stripes)+
  '<rect x="0" y="0" width="105" height="68" '+st+'/><line x1="52.5" y1="0" x2="52.5" y2="68" '+st+'/><circle cx="52.5" cy="34" r="9.15" '+st+'/><circle cx="52.5" cy="34" r=".5" fill="rgba(255,255,255,.7)"/>'+
  '<rect x="0" y="13.84" width="16.5" height="40.32" '+st+'/><rect x="88.5" y="13.84" width="16.5" height="40.32" '+st+'/><rect x="0" y="24.84" width="5.5" height="18.32" '+st+'/><rect x="99.5" y="24.84" width="5.5" height="18.32" '+st+'/>'+
  '<circle cx="11" cy="34" r=".45" fill="rgba(255,255,255,.7)"/><circle cx="94" cy="34" r=".45" fill="rgba(255,255,255,.7)"/>'+
  '<path d="M16.5 26.7 A9.15 9.15 0 0 1 16.5 41.3" '+st+'/><path d="M88.5 26.7 A9.15 9.15 0 0 0 88.5 41.3" '+st+'/>'+
  '<rect x="-1.6" y="30.34" width="1.6" height="7.32" '+st+'/><rect x="105" y="30.34" width="1.6" height="7.32" '+st+'/>'+inner+'</svg>';
};

/* ---------- metà campo NBA: coordinate in piedi, x 0..50, y 0..47 (canestro in alto) ---------- */
/* metà campo in piedi, canestro a (25, 5.25). fiba: linea da tre a 6,75 m (6,60 m negli angoli) invece di quella NBA */
V.court=function(inner,fiba){const st='stroke="rgba(255,255,255,.55)" stroke-width=".25" fill="none"';
  return'<svg viewBox="-1 -1 52 49" width="100%" role="img" aria-label="Mappa dei tiri" style="height:auto;border-radius:10px;background:linear-gradient(180deg,#5b3a22,#6d4528)">'+
  '<rect x="0" y="0" width="50" height="47" '+st+'/><rect x="17" y="0" width="16" height="19" '+st+' fill="rgba(0,0,0,.12)"/><circle cx="25" cy="19" r="6" '+st+'/>'+
  (fiba?'<line x1="3.35" y1="0" x2="3.35" y2="9.93" '+st+'/><line x1="46.65" y1="0" x2="46.65" y2="9.93" '+st+'/><path d="M3.35 9.93 A22.15 22.15 0 0 0 46.65 9.93" '+st+'/>'
    :'<line x1="3" y1="0" x2="3" y2="14" '+st+'/><line x1="47" y1="0" x2="47" y2="14" '+st+'/><path d="M3 14 A23.75 23.75 0 0 0 47 14" '+st+'/>')+
  '<path d="M21 5.25 A4 4 0 0 0 29 5.25" '+st+'/><line x1="22" y1="4" x2="28" y2="4" stroke="#fff" stroke-width=".35"/><circle cx="25" cy="5.25" r=".75" stroke="#f59b42" stroke-width=".3" fill="none"/>'+
  '<path d="M19 47 A6 6 0 0 1 31 47" '+st+'/>'+inner+'</svg>';
};

/* ---------- campo da rugby orizzontale: 100 x 70 + aree di meta ---------- */
V.rugby=function(inner){const st='stroke="rgba(255,255,255,.6)" stroke-width=".35" fill="none"',d='stroke="rgba(255,255,255,.45)" stroke-width=".3" stroke-dasharray="1.5 1.5" fill="none"';
  let s='<svg viewBox="-12 -2 124 74" width="100%" role="img" aria-label="Campo da rugby" style="height:auto;border-radius:10px;background:#1f6b3a">';
  s+='<rect x="-10" y="0" width="10" height="70" fill="#1a5d33"/><rect x="100" y="0" width="10" height="70" fill="#1a5d33"/>';
  s+='<rect x="-10" y="0" width="120" height="70" '+st+'/><line x1="0" y1="0" x2="0" y2="70" '+st+'/><line x1="100" y1="0" x2="100" y2="70" '+st+'/><line x1="50" y1="0" x2="50" y2="70" '+st+'/>';
  s+='<line x1="22" y1="0" x2="22" y2="70" '+st+'/><line x1="78" y1="0" x2="78" y2="70" '+st+'/><line x1="40" y1="0" x2="40" y2="70" '+d+'/><line x1="60" y1="0" x2="60" y2="70" '+d+'/>';
  s+='<line x1="5" y1="0" x2="5" y2="70" '+d+'/><line x1="95" y1="0" x2="95" y2="70" '+d+'/>';
  s+='<path d="M0 32 L-1.5 32 M0 38 L-1.5 38 M-1.5 31 L-1.5 39" stroke="#fff" stroke-width=".4"/><path d="M100 32 L101.5 32 M100 38 L101.5 38 M101.5 31 L101.5 39" stroke="#fff" stroke-width=".4"/>';
  return s+inner+'</svg>';
};

/* ---------- 3D con three.js (stessa versione dell'app F1) ---------- */
let threeP=null;
V.three=function(){if(!threeP)threeP=import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js").catch(e=>{threeP=null;throw e;});return threeP;};
V.can3D=()=>{try{const c=document.createElement("canvas");return!!(window.WebGLRenderingContext&&(c.getContext("webgl2")||c.getContext("webgl")));}catch(e){return false;}};
/* scena con camera orbitante: trascina per ruotare, rotella/pizzico per zoom */
V.scene=async function(box,opt){
  opt=opt||{};const T=await V.three();
  box.innerHTML='<div class="three"><div class="hud">'+h(opt.hud||"Trascina per ruotare · rotella per zoom")+'</div></div>';
  const wrap=box.querySelector(".three");
  const lowPower=SL.isTVLike();
  const renderer=new T.WebGLRenderer({antialias:!lowPower,alpha:true,powerPreference:lowPower?"low-power":"high-performance"});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,lowPower?1:2));
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=!lowPower;renderer.shadowMap.type=T.PCFSoftShadowMap;
  wrap.prepend(renderer.domElement);
  const scene=new T.Scene();scene.fog=new T.Fog(0x05070d,opt.fog||140,opt.fog?opt.fog*2.4:330);
  const cam=new T.PerspectiveCamera(opt.fov||42,1,.5,1000);
  scene.add(new T.HemisphereLight(0xcfe3ff,0x10202a,.85));
  const sun=new T.DirectionalLight(0xffffff,1.6);sun.position.set(opt.sunX||-40,opt.sunY||80,opt.sunZ||30);sun.castShadow=!lowPower;
  sun.shadow.mapSize.set(1024,1024);const sc=opt.shadow||70;Object.assign(sun.shadow.camera,{left:-sc,right:sc,top:sc,bottom:-sc,near:1,far:300});scene.add(sun);
  const orb={th:opt.th==null?-.55:opt.th,ph:opt.ph||.95,r:opt.r||110,tx:opt.tx||0,ty:opt.ty||0,tz:opt.tz||0,auto:opt.auto!==false};
  const place=()=>{cam.position.set(orb.tx+orb.r*Math.sin(orb.ph)*Math.sin(orb.th),orb.ty+orb.r*Math.cos(orb.ph),orb.tz+orb.r*Math.sin(orb.ph)*Math.cos(orb.th));cam.lookAt(orb.tx,orb.ty,orb.tz);};
  let drag=null;
  renderer.domElement.addEventListener("pointerdown",e=>{drag={x:e.clientX,y:e.clientY};orb.auto=false;renderer.domElement.setPointerCapture(e.pointerId);});
  renderer.domElement.addEventListener("pointermove",e=>{if(!drag)return;orb.th-=(e.clientX-drag.x)*.006;orb.ph=Math.max(.18,Math.min(1.45,orb.ph-(e.clientY-drag.y)*.005));drag={x:e.clientX,y:e.clientY};});
  renderer.domElement.addEventListener("pointerup",()=>{drag=null;});
  renderer.domElement.addEventListener("wheel",e=>{e.preventDefault();orb.r=Math.max(opt.rmin||40,Math.min(opt.rmax||220,orb.r*(e.deltaY>0?1.08:.93)));},{passive:false});
  const size=()=>{const w=wrap.clientWidth,hh=wrap.clientHeight;if(!w||!hh)return;renderer.setSize(w,hh,false);cam.aspect=w/hh;cam.updateProjectionMatrix();};
  const ro=new ResizeObserver(size);ro.observe(wrap);size();
  let raf=0,alive=true,last=performance.now();const ticks=[];
  const loop=t=>{if(!alive)return;raf=requestAnimationFrame(loop);const dt=Math.min(.05,(t-last)/1000);last=t;
    if(document.hidden)return;if(orb.auto)orb.th+=dt*(opt.spin||.08);place();ticks.forEach(f=>f(dt,t));renderer.render(scene,cam);};
  raf=requestAnimationFrame(loop);
  const dispose=()=>{alive=false;cancelAnimationFrame(raf);ro.disconnect();scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.map&&m.map.dispose();m.dispose();});}});renderer.dispose();try{renderer.forceContextLoss();}catch(e){}};
  SL.onCleanup(dispose);
  return{T,scene,cam,renderer,orb,ticks,dispose,wrap};
};
/* etichetta (numero di maglia, nome) come sprite */
V.label=function(T,text,o){o=o||{};const c=document.createElement("canvas"),W=o.w||256,H=o.h||128;c.width=W;c.height=H;const g=c.getContext("2d");
  if(o.bg){g.fillStyle=o.bg;const r=24;g.beginPath();g.moveTo(r,0);g.arcTo(W,0,W,H,r);g.arcTo(W,H,0,H,r);g.arcTo(0,H,0,0,r);g.arcTo(0,0,W,0,r);g.fill();}
  g.fillStyle=o.color||"#fff";g.font=(o.weight||800)+" "+(o.size||64)+"px Archivo, Arial, sans-serif";g.textAlign="center";g.textBaseline="middle";g.fillText(text,W/2,H/2+2);
  const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;const sp=new T.Sprite(new T.SpriteMaterial({map:tx,transparent:true,depthTest:o.depthTest!==false}));sp.scale.set(o.sx||8,o.sy||4,1);return sp;};
/* texture del campo disegnata su canvas */
V.pitchTexture=function(T,kind){const c=document.createElement("canvas");c.width=2048;c.height=1326;const g=c.getContext("2d"),W=c.width,H=c.height,sx=W/105,sy=H/68;
  for(let i=0;i<14;i++){g.fillStyle=i%2?"#1e7240":"#237d46";g.fillRect(i*W/14,0,W/14+1,H);}
  g.strokeStyle="rgba(255,255,255,.85)";g.lineWidth=5;const R=(x,y,w,hh)=>g.strokeRect(x*sx,y*sy,w*sx,hh*sy);
  R(1,1,103,66);g.beginPath();g.moveTo(52.5*sx,sy);g.lineTo(52.5*sx,67*sy);g.stroke();g.beginPath();g.ellipse(52.5*sx,34*sy,9.15*sx,9.15*sy,0,0,7);g.stroke();
  R(1,13.84,16.5,40.32);R(87.5,13.84,16.5,40.32);R(1,24.84,5.5,18.32);R(98.5,24.84,5.5,18.32);
  g.beginPath();g.ellipse(17.5*sx,34*sy,9.15*sx,9.15*sy,0,-.93,.93);g.stroke();g.beginPath();g.ellipse(87.5*sx,34*sy,9.15*sx,9.15*sy,0,Math.PI-.93,Math.PI+.93);g.stroke();
  const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=8;return tx;};
V.courtTexture=function(T){const c=document.createElement("canvas");c.width=1600;c.height=1504;const g=c.getContext("2d"),W=c.width,H=c.height,s=W/50;
  const gr=g.createLinearGradient(0,0,W,0);for(let i=0;i<=20;i++)gr.addColorStop(i/20,i%2?"#b77a45":"#c4884f");g.fillStyle=gr;g.fillRect(0,0,W,H);
  g.fillStyle="rgba(120,40,20,.35)";g.fillRect(17*s,0,16*s,19*s);
  g.strokeStyle="rgba(255,255,255,.95)";g.lineWidth=6;g.strokeRect(3,3,W-6,H-6);g.strokeRect(17*s,0,16*s,19*s);
  g.beginPath();g.arc(25*s,19*s,6*s,0,7);g.stroke();g.beginPath();g.moveTo(3*s,0);g.lineTo(3*s,14*s);g.stroke();g.beginPath();g.moveTo(47*s,0);g.lineTo(47*s,14*s);g.stroke();
  g.beginPath();g.arc(25*s,5.25*s,23.75*s,Math.asin(8.75/23.75)*0+.38,Math.PI-.38);g.stroke();
  g.beginPath();g.arc(25*s,5.25*s,4*s,0,Math.PI);g.stroke();
  const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=8;return tx;};

/* piccola utilità: numero con segno */
V.sgn=n=>(n>0?"+":"")+n;
})();
