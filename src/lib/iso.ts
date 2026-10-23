// @ts-nocheck
// v10 isometric kit (Anatomy style) · title-bar glyphs · the exploded gacha machine · the capsule case.
// Ported from the approved design board (work/v10-2: iso.js, gacha.js, case.js). Colours come from CSS vars (styles/v10.css).
/* ── v10 isometric kit · Anatomy 风格：等距 30°、四阶明暗、实体前后遮挡、细墨线、半透明面板、阴影排线、纸纹 ── */
const ISO=(()=>{
const K=Math.cos(Math.PI/6);
let S='';const setSfx=v=>{S=v};
const P=(x,y,z)=>[(x-y)*K,(x+y)/2-z];
const f=n=>Math.round(n*100)/100;
const pt=p=>{const q=P(p[0],p[1],p[2]);return f(q[0])+','+f(q[1])};
const pts=a=>a.map(pt).join(' ');
const poly=(a,c,ex='')=>`<polygon class="${c}" points="${pts(a)}" ${ex}/>`;
const pline=(a,c,ex='')=>`<polyline class="${c}" points="${pts(a)}" ${ex}/>`;
const seg=(a,b,c='d1')=>{const p=P(...a),q=P(...b);return `<line class="${c}" x1="${f(p[0])}" y1="${f(p[1])}" x2="${f(q[0])}" y2="${f(q[1])}"/>`};
const dot=(p,r=.9,c='dt')=>{const q=P(...p);return `<circle class="${c}" cx="${f(q[0])}" cy="${f(q[1])}" r="${r}"/>`};
/* plane matrices: local (u,v) → world.  mY: u=+x v=−z (plane y=const) · mX: u=−y v=−z (plane x=const) · mZ: u=+x v=+y (plane z=const) */
const mX=(x,y,z)=>{const q=P(x,y,z);return `matrix(${f(K)},-0.5,0,1,${f(q[0])},${f(q[1])})`};
const mY=(x,y,z)=>{const q=P(x,y,z);return `matrix(${f(K)},0.5,0,1,${f(q[0])},${f(q[1])})`};
const mZ=(x,y,z)=>{const q=P(x,y,z);return `matrix(${f(K)},0.5,${f(-K)},0.5,${f(q[0])},${f(q[1])})`};
/* box: tone '' paper · 'k' charcoal · 'r' red · 'g' glass.  o.hatch → 排线覆盖暗面 */
function box(x,y,z,w,d,h,o={}){
  const t=o.tone||'';
  const top=[[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]];
  const fr=[[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]];
  const fl=[[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]];
  let s='';
  if(!o.noL)s+=poly(fl,`fl ${t}`);
  if(!o.noR){s+=poly(fr,`fr ${t}`);if(o.hatch)s+=poly(fr,'ht',`fill="url(#ht${S})"`)}
  if(!o.noT)s+=poly(top,`tp ${t}`);
  if(o.bevel){const b=o.bevel;s+=poly([[x+b,y+b,z+h],[x+w-b,y+b,z+h],[x+w-b,y+d-b,z+h],[x+b,y+d-b,z+h]],'d2 nf')}
  if(o.screws){const b=o.screws;[[x+b,y+b],[x+w-b,y+b],[x+w-b,y+d-b],[x+b,y+d-b]].forEach(([a,c])=>{s+=dot([a,c,z+h],.75)})}
  return s;
}
/* glass panel in a plane, as a thin slab outline with sheen strokes */
function glassY(x0,x1,y,z0,z1,o={}){ /* plane y=const */
  const q=[[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1]];
  let s=poly(q,'gl');const w=x1-x0,h=z1-z0;
  if(!o.plain){s+=seg([x0+w*.18,y,z1-h*.12],[x0+w*.42,y,z1-h*.62],'sh');s+=seg([x0+w*.27,y,z1-h*.12],[x0+w*.46,y,z1-h*.5],'sh')}
  s+=poly([[x0+1.6,y,z0+1.6],[x1-1.6,y,z0+1.6],[x1-1.6,y,z1-1.6],[x0+1.6,y,z1-1.6]],'d2 nf');
  return s;
}
function glassX(x,y0,y1,z0,z1,o={}){ /* plane x=const */
  const q=[[x,y0,z0],[x,y1,z0],[x,y1,z1],[x,y0,z1]];
  let s=poly(q,'gl');const w=y1-y0,h=z1-z0;
  if(!o.plain){s+=seg([x,y0+w*.2,z1-h*.12],[x,y0+w*.44,z1-h*.6],'sh');s+=seg([x,y0+w*.3,z1-h*.12],[x,y0+w*.48,z1-h*.48],'sh')}
  s+=poly([[x,y0+1.6,z0+1.6],[x,y1-1.6,z0+1.6],[x,y1-1.6,z1-1.6],[x,y0+1.6,z1-1.6]],'d2 nf');
  return s;
}
function ell(cx,cy,z,r){const q=P(cx,cy,z);return {X:q[0],Y:q[1],rx:r*1.2247,ry:r*.7071}}
/* vertical cylinder with smooth shading */
function cyl(cx,cy,z,r,h,tone=''){
  const b=ell(cx,cy,z,r),t=ell(cx,cy,z+h,r);
  const g=tone==='r'?`url(#cgr${S})`:tone==='k'?`url(#cgk${S})`:`url(#cg${S})`;
  return `<path class="cy" fill="${g}" d="M${f(b.X-b.rx)},${f(b.Y)} A${f(b.rx)},${f(b.ry)} 0 0 0 ${f(b.X+b.rx)},${f(b.Y)} L${f(t.X+t.rx)},${f(t.Y)} A${f(t.rx)},${f(t.ry)} 0 0 1 ${f(t.X-t.rx)},${f(t.Y)} Z"/>`+
    `<ellipse class="tp ${tone}" cx="${f(t.X)}" cy="${f(t.Y)}" rx="${f(t.rx)}" ry="${f(t.ry)}"/>`;
}
function halo(cx,cy,z,r,sc=1){const e=ell(cx,cy,z,r);return `<ellipse class="halo" cx="${f(e.X)}" cy="${f(e.Y+3)}" rx="${f(e.rx*sc)}" ry="${f(e.ry*sc)}"/>`}
function haloRect(x,y,z,w,d){return `<polygon class="halo" points="${pts([[x-3,y-3,z],[x+w+6,y-3,z],[x+w+6,y+d+6,z],[x-3,y+d+6,z]])}"/>`}
function gearPath(r,n,dp){let d='';for(let i=0;i<n;i++){const a=i/n*Math.PI*2,s=Math.PI*2/n;
  const q=[[r-dp,a-s*.5],[r-dp,a-s*.24],[r,a-s*.14],[r,a+s*.14],[r-dp,a+s*.24]];
  q.forEach(([rr,aa],j)=>{d+=(i==0&&j==0?'M':'L')+f(Math.cos(aa)*rr)+','+f(Math.sin(aa)*rr)})}
  return d+'Z'}
/* 2D capsule (screen space). top: 'w' white · 'm' grey · 'k' charcoal · 'r' red. tag: css colour for the small library band */
function capsule(r,top='m',tag='',cls=''){
  const sw=Math.max(.6,r*.07);
  return `<g class="cap ${cls}"><g class="cbot"><path class="cpb" d="M${-r},0 A${r},${r} 0 0 0 ${r},0 Z"/></g>`+
  `<g class="ctop"><path class="cpt ${top[0]==='#'?'':top}" ${top[0]==='#'?`style="fill:${top}"`:''} d="M${-r},0 A${r},${r} 0 0 1 ${r},0 Z"/>`+
  (tag?`<path d="M${f(-r*.62)},${f(-r*.08)} A${f(r)},${f(r)} 0 0 1 ${f(-r*.3)},${f(-r*.86)}" style="stroke:${tag};stroke-width:${f(r*.22)};fill:none;stroke-linecap:round"/>`:'')+
  `<path class="csh" style="stroke-width:${f(r*.14)}" d="M${f(r*.18)},${f(-r*.72)} A${f(r*.74)},${f(r*.74)} 0 0 1 ${f(r*.62)},${f(-r*.32)}"/></g>`+
  `<line class="cseam" x1="${-r}" y1="0" x2="${r}" y2="0" style="stroke-width:${f(sw)}"/></g>`}
function defs(){return `<defs>
<linearGradient id="cg${S}" x1="0" x2="1"><stop offset="0" style="stop-color:var(--i-s2)"/><stop offset=".38" style="stop-color:var(--i-top)"/><stop offset=".72" style="stop-color:var(--i-s1)"/><stop offset="1" style="stop-color:var(--i-s0)"/></linearGradient>
<linearGradient id="cgk${S}" x1="0" x2="1"><stop offset="0" style="stop-color:var(--k-s2)"/><stop offset=".38" style="stop-color:var(--k-top)"/><stop offset="1" style="stop-color:var(--k-s0)"/></linearGradient>
<linearGradient id="cgr${S}" x1="0" x2="1"><stop offset="0" stop-color="#e5484d"/><stop offset=".35" stop-color="#f27d81"/><stop offset=".72" stop-color="#cf3d42"/><stop offset="1" stop-color="#a92f34"/></linearGradient>
<pattern id="ht${S}" patternUnits="userSpaceOnUse" width="2.6" height="2.6" patternTransform="rotate(58)"><line x1="0" y1="0" x2="0" y2="2.6" style="stroke:var(--i-hatch);stroke-width:.55"/></pattern>
<pattern id="htf${S}" patternUnits="userSpaceOnUse" width="3.4" height="3.4" patternTransform="rotate(-32)"><line x1="0" y1="0" x2="0" y2="3.4" style="stroke:var(--i-hatch);stroke-width:.45"/></pattern>
</defs>`}
return {setSfx,get sfx(){return S},K,P,f,pt,pts,poly,pline,seg,dot,mX,mY,mZ,box,glassY,glassX,cyl,ell,halo,haloRect,gearPath,capsule,defs};
})();

/* ── motion helpers ── */
let FROZEN=false;window.freeze=()=>{FROZEN=true;document.getAnimations().forEach(a=>a.pause())};window.unfreeze=()=>{FROZEN=false;document.getAnimations().forEach(a=>{if(a.playState==='paused')a.play()})};
const RM=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function tween(dur,fn,ease=t=>1-Math.pow(1-t,3)){dur*=(window.SLOW||1);if(RM())dur=Math.min(dur,1);return new Promise(r=>{let el=0,last=performance.now();const step=n=>{if(!FROZEN)el+=n-last;last=n;const t=dur<=1?1:Math.min(1,el/dur);fn(ease(t),t);t<1?requestAnimationFrame(step):r()};requestAnimationFrame(step)})}
const easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const easeOut=t=>1-Math.pow(1-t,3);
const easeOutBack=t=>{const c1=1.5,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)};
const clamp01=v=>v<0?0:v>1?1:v;
const sleep=ms=>new Promise(r=>{ms*=(window.SLOW||1);if(RM())ms=Math.min(ms,30);let el=0,last=performance.now();const s=n=>{if(!FROZEN)el+=n-last;last=n;el>=ms?r():requestAnimationFrame(s)};requestAnimationFrame(s)});
/* WAAPI with reduced-motion fallback */
function anim(el,kf,o){o=Object.assign({},o);const k=window.SLOW||1;o.duration=(o.duration||0)*k;if(o.delay)o.delay*=k;if(RM()){o.duration=1;o.delay=0}return el.animate(kf,o)}


let GLYPH_GACHA='',GLYPH_CASE='';
/* ── v10.2 · 标题栏小图标：回到 v9 粗描边等距小模型（白面 + 深色粗描边 + 一处红色）── */
const GLYPH3=(()=>{const K=Math.cos(Math.PI/6);
  const mk=(s,ox,oy)=>{const P=(x,y,z)=>[(x-y)*K*s+ox,(x+y)/2*s-z*s+oy];const f=n=>Math.round(n*100)/100;
    const pp=a=>a.map(p=>{const q=P(...p);return f(q[0])+','+f(q[1])}).join(' ');
    const poly=(a,c)=>`<polygon class="${c}" points="${pp(a)}"/>`;
    const pl=(a,c='ln')=>`<polyline class="${c}" points="${pp(a)}"/>`;
    /* 只画看得见的三面：左前(y=d) · 右(x=w) · 顶 */
    const box=(x,y,z,w,d,h,t='')=>poly([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]],'fl '+t)+poly([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],'fr '+t)+poly([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]],'tp '+t);
    const circ=(x,y,z,r,c)=>{const q=P(x,y,z);return `<circle class="${c}" cx="${f(q[0])}" cy="${f(q[1])}" r="${r}"/>`};
    /* 贴在左前面(y=const)上的椭圆：用矩阵把单位圆斜切到等距平面 */
    const onFL=(x,y,z,r,c)=>{const q=P(x,y,z);return `<ellipse class="${c}" cx="0" cy="0" rx="${r}" ry="${r}" transform="matrix(${f(K*s)},${f(.5*s)},0,${f(s)},${f(q[0])},${f(q[1])})"/>`};
    return {P,poly,pl,box,circ,onFL,pp}};
  /* 迷你扭蛋机：白机身 + 透明玻璃仓（一枚空心胶囊）+ 顶盖 · 红色旋钮 */
  const g=mk(1.12,12,12.2),W=8.4;
  let a='';
  a+=g.box(0,0,0,W,W,4.8);
  a+=g.onFL(3.1,W,2.5,1.75,'red');
  a+=g.pl([[6,W,1.3],[7.4,W,1.3]],'ln thin');
  a+=g.circ(4.6,4.6,7.4,1.9,'cap');
  a+=g.poly([[0,W,4.8],[W,W,4.8],[W,W,10.6],[0,W,10.6]],'glass')+g.poly([[W,0,4.8],[W,W,4.8],[W,W,10.6],[W,0,10.6]],'glass');
  a+=g.box(-.4,-.4,10.6,W+.8,W+.8,1.7,'lid');
  const gacha=`<svg class="gly g9" viewBox="0 0 24 24">${a}</svg>`;
  /* 迷你收纳盒：矮宽的盒子 · 一道盒盖缝 + 一道托盘缝 · 红色搭扣 */
  const c=mk(1.06,12,12.6),B=11;
  let b='';
  b+=c.box(0,0,0,B,B,5);
  b+=`<g class="glid">${c.box(0,0,5,B,B,2.6,'lid')}</g>`;
  b+=`<polygon class="glatch red" points="${c.pp([[4,B,3],[7,B,3],[7,B,7.6],[4,B,7.6]])}"/>`;
  const box=`<svg class="gly g9 gcase" viewBox="0 0 24 24">${b}</svg>`;
  return {gacha,box};
})();
GLYPH_GACHA=GLYPH3.gacha;GLYPH_CASE=GLYPH3.box;

const TAGC=['#e5484d','#3e63dd','#30a46c','#f5a524','#8e4ec6','#12a594','#d6409f','#0090ff','#a18072'];
const CAPC=['r','o','b','g','p','w','t','r','b','o','w','g'];
const LAYC=['#e5484d','#3e63dd','#30a46c','#f5a524','#8e4ec6','#12a594'];
const CASE=(()=>{
const {P,f,poly,box,glassX,glassY,cyl,seg,dot,mX,mY,mZ,capsule}=ISO;
function geo(C){const caseTop=C.base+C.N*C.th;return {caseTop,home:j=>C.base+(C.N-j)*C.th,stashDX:C.W+(C.mini?8:16)}}
function pocketXY(C,j,i,dx=0){const rows=(C.K||9)/3,c=i%3,r=Math.floor(i/3),s=(C.W-6)/3,sy=(C.W-6)/rows;return [C.x0+dx+3+s*(c+.5),C.y0+3+sy*(r+.5)]}
function trayG(C,j,dx,z,caps,show,act){
  const W=C.W,x=C.x0+dx+3,y=C.y0+3,w=W-6,h=C.th-2,zt=z+h;
  let s=`<g class="tray ${act?'act':''}" data-t="${j}">`;
  s+=box(x,y,z,w,w,h,{hatch:!C.mini});
  s+=poly([[x+1.6,y+1.6,zt],[x+w-1.6,y+1.6,zt],[x+w-1.6,y+w-1.6,zt],[x+1.6,y+w-1.6,zt]],'d2 nf');
  if(!C.mini){ /* 前沿小铭牌：层号 */
    s+=`<g transform="${mY(x+w*.5-5,y+w,zt-2.2)}"><rect class="k-plate" style="fill:${LAYC[(j-1)%LAYC.length]}" x="0" y="0" width="10" height="${h-5}" rx=".8"/></g>`;
    s+=seg([x,y+w,z+2.2],[x+w,y+w,z+2.2],'d2');s+=seg([x+w,y,z+2.2],[x+w,y+w,z+2.2],'d2');
  }
  const pr=(w/3)*(C.K===6?.36:.33),order=[...Array(C.K||9).keys()].sort((a,b)=>(a%3+Math.floor(a/3))-(b%3+Math.floor(b/3)));
  order.forEach(i=>{const [px,py]=pocketXY(C,j,i,dx);const e=ISO.ell(px,py,zt,pr);
    s+=`<ellipse class="pk" cx="${f(e.X)}" cy="${f(e.Y)}" rx="${f(e.rx)}" ry="${f(e.ry)}"/>`;
    s+=`<path class="d2" d="M${f(e.X-e.rx*.8)},${f(e.Y+e.ry*.15)} A${f(e.rx*.8)},${f(e.ry*.8)} 0 0 0 ${f(e.X+e.rx*.8)},${f(e.Y+e.ry*.15)}"/>`;
    const cp=caps&&caps[i];
    if(cp&&show&&show[i]){const cr=pr*1.02;s+=`<g class="cpk" data-pk="${j}-${i}" transform="translate(${f(e.X)},${f(e.Y-cr*.52)}) rotate(${cp.rot||-18})">${capsule(cr,cp.top,cp.tag)}</g>`}
  });
  return s+'</g>';
}
function lidG(C,dx,z,latch){
  const W=C.W,x=C.x0+dx-1.5,y=C.y0-1.5,w=W+3,h=C.lidH;
  let s=`<g class="lid">`+box(x,y,z,w,w,h,{tone:'k',bevel:C.mini?1.6:3.2,screws:C.mini?0:2})+`</g>`;
  if(!C.mini){s+=`<g transform="${mZ(x+w-24,y+8,z+h)}"><rect class="k-badge" x="0" y="0" width="14" height="14" rx="3.4"/><rect x="5.6" y="6.2" width="2.8" height="5.4" rx="1.4" class="lgi"/><path d="M4.4 4.8 7 2.8 9.6 4.8" class="lgc"/></g>`}
  /* 红色搭扣：latch 0 = 扣上（向下挂）· 1 = 翻起 */
  const lw=C.mini?3.4:7,lh=(C.mini?4:8)*Math.cos(Math.PI*latch),xc=C.x0+dx+W/2-lw/2;
  s+=`<g transform="${mY(xc,y+w+.05,z+ (C.mini?0:1))}"><path class="latch" d="M0,0 L${lw},0 L${lw},${f(lh)} L0,${f(lh)} Z"/>${C.mini?'':`<circle class="lnub" cx="${lw/2}" cy="${f(lh*.62)}" r="1"/>`}</g>`;
  return s;
}
/* L: {lid:{dx,z}, trays:{j:{dx,z}}, latch, active, caps, show} */
function svg(C,L,o={}){
  const G=geo(C),W=C.W,x0=C.x0,y0=C.y0,ct=G.caseTop;
  let s='';
  s+=`<polygon class="halo" points="${ISO.pts([[x0-4,y0-4,0],[x0+W+5,y0-4,0],[x0+W+5,y0+W+6,0],[x0-4,y0+W+6,0]])}"/>`;
  /* stash shadow */
  const anyStash=Object.values(L.trays).some(t=>t.dx>W*.6)||L.lid.dx>W*.6;
  if(anyStash){const dx=G.stashDX;s+=`<polygon class="halo" points="${ISO.pts([[x0+dx-3,y0-3,0],[x0+dx+W+4,y0-3,0],[x0+dx+W+4,y0+W+5,0],[x0+dx-3,y0+W+5,0]])}"/>`;
}
  /* feet + plinth */
  [[x0+4,y0+4],[x0+W-4,y0+4],[x0+4,y0+W-4],[x0+W-4,y0+W-4]].forEach(([a,b])=>{s+=cyl(a,b,0,C.mini?1.4:2.6,2,'k')});
  s+=box(x0-2,y0-2,2,W+4,W+4,C.base-2,{tone:'k',bevel:C.mini?0:1.4});
  /* back walls + back post */
  s+=glassX(x0,y0,y0+W,C.base,ct,{plain:1})+glassY(x0,x0+W,y0,C.base,ct,{plain:1});
  s+=box(x0,y0,C.base,3,3,ct-C.base,{tone:'k'});
  /* trays: inside vs outside */
  const items=[];
  for(let j=1;j<=C.N;j++){const t=L.trays[j];const inside=t.dx<1&&t.z<ct-.5;items.push({j,t,inside})}
  const draw=it=>trayG(C,it.j,it.t.dx,it.t.z,L.caps&&L.caps[it.j],L.show&&L.show[it.j],L.active===it.j);
  items.filter(i=>i.inside).sort((a,b)=>a.t.z-b.t.z).forEach(it=>{s+=draw(it)});
  /* back rim */
  s+=box(x0,y0,ct,W,3,2.4,{tone:'k'})+box(x0,y0,ct,3,W,2.4,{tone:'k'});
  /* front walls */
  s+=glassX(x0+W,y0,y0+W,C.base,ct)+glassY(x0,x0+W,y0+W,C.base,ct);
  if(!C.mini){for(let j=1;j<C.N;j++){const z=G.home(j);s+=seg([x0+W,y0+3,z],[x0+W,y0+W-3,z],'d2');s+=seg([x0+3,y0+W,z],[x0+W-3,y0+W,z],'d2')}}
  /* posts + front rim */
  s+=box(x0,y0+W-3,C.base,3,3,ct-C.base,{tone:'k'})+box(x0+W-3,y0,C.base,3,3,ct-C.base,{tone:'k'});
  s+=box(x0,y0+W-3,ct,W,3,2.4,{tone:'k'})+box(x0+W-3,y0,ct,3,W,2.4,{tone:'k'});
  s+=box(x0+W-3,y0+W-3,C.base,3,3,ct-C.base+2.4,{tone:'k'});
  /* keeper for latch */
  s+=box(x0+W/2-(C.mini?1.6:3.2),y0+W,ct-(C.mini?3:6),C.mini?3.2:6.4,1,C.mini?2:3,{tone:'k'});
  /* side layer tabs */
  if(o.tabs){for(let j=1;j<=C.N;j++){const ty=y0+8+(j-1)*21,tw=17,zb=G.home(j)+1.6,th=C.th-3.4,on=L.active===j;
    s+=`<g class="ltab ${on?'on':''}" data-l="${j}">`+box(x0+W,ty,zb,6,tw,th,{tone:on?'k':''})+`</g>`}}
  /* outside things: sorted by z (lower first) */
  const out=items.filter(i=>!i.inside).map(it=>({z:it.t.z,s:()=>draw(it)}));
  out.push({z:L.lid.z,s:()=>lidG(C,L.lid.dx,L.lid.z,L.latch)});
  out.sort((a,b)=>a.z-b.z).forEach(o2=>{s+=o2.s()});
  return s;
}
function layout(C,page,open){
  const G=geo(C),L={trays:{},lid:{dx:0,z:G.caseTop},latch:0};
  for(let j=1;j<=C.N;j++)L.trays[j]={dx:0,z:G.home(j)};
  if(open){L.latch=1;L.lid={dx:G.stashDX,z:0};let zz=C.lidH;
    for(let j=1;j<page;j++){L.trays[j]={dx:G.stashDX,z:zz};zz+=C.th-2}}
  return L;
}
return {svg,layout,geo,pocketXY};
})();


const GACHA=(()=>{
const {P,f,poly,box,glassX,glassY,cyl,seg,dot,mX,mY,mZ,capsule}=ISO;
const MINI_C={x0:130,y0:38,W:36,N:2,th:8,base:4,lidH:5,mini:true};
/* capsule pile: deterministic heap */
function pile(){let r=7;const out=[];let seed=11;const rnd=()=>{seed=(seed*9301+49297)%233280;return seed/233280};
  for(let layer=0;layer<5;layer++){const step=13.4,off=layer%2?step/2:0;
    for(let gx=12+off;gx<=88;gx+=step)for(let gy=12+off;gy<=88;gy+=step){const d=Math.hypot(gx-50,gy-50);const hz=74+7+layer*10;if(d>46-layer*8.5)continue;if(layer>1&&rnd()<.15)continue;
      out.push({x:gx+(rnd()-.5)*2,y:gy+(rnd()-.5)*2,z:hz+(rnd()-.5)*1.5,top:CAPC[Math.floor(rnd()*CAPC.length)],tag:'',rot:Math.floor(rnd()*180)-90})}}
  return out.sort((a,b)=>(a.x+a.y+a.z*1.2)-(b.x+b.y+b.z*1.2))}
const PILE=pile();
/* parts — n: callout number, v: explode vector, a: landing order (higher lands first), side: callout column */
const PARTS=[
 {id:'base',n:8,nm:'底座',v:[0,0,-30],a:.55,anc:[54,108,8],side:'l'},
 {id:'gear',n:2,nm:'齿轮组',v:[34,0,0],a:.46,anc:[70,60,44],side:'r'},
 {id:'front',n:0,nm:'前面板',v:[0,28,0],a:.4,anc:[50,100,30]},
 {id:'glassL',n:0,nm:'下侧板',v:[48,0,0],a:.34,anc:[98,50,42]},
 {id:'glassU',n:6,nm:'玻璃侧板',v:[42,0,0],a:.28,anc:[98.5,16,118],side:'r'},
 {id:'glassF',n:0,nm:'前玻璃',v:[0,42,0],a:.24,anc:[40,98.5,102]},
 {id:'exit',n:4,nm:'出口',v:[0,50,0],a:.16,anc:[31,112,22],side:'l'},
 {id:'crank',n:1,nm:'摇杆',v:[0,66,0],a:.08,anc:[70,102,60],side:'l'},
 {id:'lid',n:5,nm:'顶盖',v:[0,0,62],a:0,anc:[18,96,142],side:'l'},
];
const STATIC_CALL=[{id:'bin',n:3,nm:'胶囊仓',anc:[74,30,92],side:'r'},{id:'frame',n:7,nm:'机身框架',anc:[97.5,54,72],side:'r'},{id:'case9',n:9,nm:'收纳盒',anc:[148,56,24],side:'r'}];
function frameBack(){let s='';
  s+=box(0,0,14,5,5,120,{tone:'k'});
  s+=box(5,0,70,90,5,4,{tone:'k'})+box(0,5,70,5,90,4,{tone:'k'});
  s+=box(5,0,130,90,5,4,{tone:'k'})+box(0,5,130,5,90,4,{tone:'k'});
  /* lower interior walls */
  s+=poly([[5,5,14],[95,5,14],[95,5,70],[5,5,70]],'inner')+poly([[5,5,14],[5,95,14],[5,95,70],[5,5,70]],'inner2');
  s+=poly([[5,5,14],[95,5,14],[95,95,14],[5,95,14]],'innerf');
  /* chute (inside) */
  s+=poly([[22,60,72],[40,60,72],[40,98,30],[22,98,30]],'tp')+poly([[40,60,72],[40,98,30],[40,98,26],[40,60,68]],'fr');
  return s}
function gearAsm(){let s='';const O=[70,90,66];
  s+=`<g transform="${mX(...O)}">`+
   `<rect class="plate" x="0" y="0" width="60" height="46" rx="2"/><rect class="d2 nf" x="2.4" y="2.4" width="55.2" height="41.2" rx="1.2"/>`+
   [[4,4],[56,4],[4,42],[56,42]].map(([u,v])=>`<circle class="dt" cx="${u}" cy="${v}" r=".9"/>`).join('')+
   `<g class="gA" transform="translate(30,22)"><path class="gear" d="${ISO.gearPath(14,18,2.6)}"/><circle class="gi" r="9.4"/>${[0,1,2,3,4,5].map(k=>`<circle class="gh" cx="${f(Math.cos(k*1.047)*6)}" cy="${f(Math.sin(k*1.047)*6)}" r="1.5"/>`).join('')}<circle class="hub" r="2.6"/><line class="d1" x1="0" y1="-11.5" x2="0" y2="-9.6"/></g>`+
   `<g class="gB" transform="translate(50.6,31.6)"><path class="gear" d="${ISO.gearPath(9.2,12,2.4)}"/><circle class="gi" r="5.4"/><circle class="hub" r="2"/><line class="d1" x1="0" y1="-7.4" x2="0" y2="-5.6"/></g>`+
   `<g class="gC" transform="translate(13,34)"><path class="gear r" d="${ISO.gearPath(7,10,2.2)}"/><circle class="hub" r="1.6"/></g>`+
   `</g>`;
  /* axle stub to front */
  s+=seg([70,60,44],[70,96,44],'axle');
  return s}
function binBack(){let s='';
  s+=box(5,5,72,90,90,2.4,{});
  s+=glassX(5,5,95,74.4,130,{plain:1})+glassY(5,95,5,74.4,130,{plain:1});
  const e=ISO.ell(31,64,74.4,7);s+=`<ellipse class="hole" cx="${f(e.X)}" cy="${f(e.Y)}" rx="${f(e.rx)}" ry="${f(e.ry)}"/>`;
  s+=cyl(50,40,74.4,1.6,26);
  return s}
function pileSVG(hide){return PILE.map((c,i)=>{if(hide===i)return '';const q=P(c.x,c.y,c.z);return `<g class="pc" data-i="${i}" transform="translate(${f(q[0])},${f(q[1])}) rotate(${c.rot})">${capsule(6.6,c.top,c.tag)}</g>`}).join('')}
function paddle(a){const r=13,c=Math.cos(a),s2=Math.sin(a);const p1=[50+c*r,40+s2*r,100],p2=[50-c*r,40-s2*r,100];
  return poly([[p1[0],p1[1],100],[p2[0],p2[1],100],[p2[0],p2[1],103],[p1[0],p1[1],103]],'fl k')+cyl(50,40,99,2.2,5,'k')}
function frameFront(){let s='';
  s+=box(0,95,14,5,5,120,{tone:'k'})+box(95,0,14,5,5,120,{tone:'k'});
  s+=box(5,95,70,90,5,4,{tone:'k'})+box(95,5,70,5,90,4,{tone:'k'});
  s+=box(5,95,130,90,5,4,{tone:'k'})+box(95,5,130,5,90,4,{tone:'k'});
  s+=box(95,95,14,5,5,120,{tone:'k'});
  [[97.5,97.5,70],[97.5,97.5,130],[2.5,97.5,130],[97.5,2.5,130]].forEach(p=>{s+=dot([p[0],p[1],p[2]+4],.7,'dtw')});
  return s}
function baseSVG(){let s='';
  [[-2,-2],[102,-2],[-2,102],[102,102]].forEach(([a,b])=>{s+=cyl(a,b,0,3.2,4,'k')});
  s+=box(-8,-8,4,116,116,10,{tone:'k',bevel:2.2,screws:3.4});
  s+=`<g transform="${mY(14,108.05,12)}"><rect class="lplate" x="0" y="0" width="30" height="6.4" rx=".6"/><line class="d2" x1="3" y1="2" x2="20" y2="2"/><line class="d2" x1="3" y1="3.6" x2="26" y2="3.6"/><line class="d2" x1="3" y1="5" x2="16" y2="5"/></g>`;
  return s}
function frontSVG(){let s='';
  s+=box(5,98,14,90,2,56,{});
  s+=`<g transform="${mY(5,100.05,70)}">`+
   `<rect class="d2 nf" x="2" y="2" width="86" height="52" rx="1"/>`+
   `<rect class="cav" x="13" y="34" width="26" height="16" rx="2"/><rect class="flap" x="13.6" y="34.6" width="24.8" height="6.4" rx="1"/><line class="d1" x1="15" y1="41" x2="37" y2="41"/>`+
   `<circle class="boss" cx="65" cy="26" r="10"/><circle class="d2 nf" cx="65" cy="26" r="8"/>${Array.from({length:12},(_,k)=>{const a=k/12*Math.PI*2;return `<line class="d2" x1="${f(65+Math.cos(a)*8.6)}" y1="${f(26+Math.sin(a)*8.6)}" x2="${f(65+Math.cos(a)*9.6)}" y2="${f(26+Math.sin(a)*9.6)}"/>`}).join('')}`+
   `<circle class="led r" cx="9" cy="8" r="1.9"/><circle class="led o" cx="15" cy="8" r="1.9"/><circle class="led g" cx="21" cy="8" r="1.9"/>`+
   `<rect class="slotp" x="44" y="6" width="12" height="16" rx="1.2"/><rect class="cav" x="49" y="9" width="2" height="10" rx="1"/>`+
   `<rect class="lplate" x="62" y="42" width="20" height="7" rx=".6"/><line class="d2" x1="65" y1="45.5" x2="79" y2="45.5"/>`+
   [[4,4],[86,4],[4,52],[86,52]].map(([u,v])=>`<circle class="dt" cx="${u}" cy="${v}" r=".8"/>`).join('')+`</g>`;
  return s}
function exitSVG(){let s='';
  s+=box(16,100,17,30,13,2.4,{});
  s+=box(16,100,19.4,2,13,5,{})+box(44,100,19.4,2,13,5,{hatch:1});
  s+=box(18,111,19.4,26,2,4.2,{tone:'r'});
  return s}
function crankSVG(){return `<g transform="${mY(70,101.2,44)}">`+
  `<circle class="hubb" r="5.6"/><g class="crot"><path class="arm" d="M-2.2,0 L-1.6,-16 L1.6,-16 L2.2,0 Z"/><circle class="hub" r="3.2"/>`+
  `<g transform="translate(0,-16)"><circle class="knob" r="4.6"/><circle class="knobh" cx="-1.4" cy="-1.6" r="1.5"/></g></g></g>`+
  `<path class="axle" d="${(()=>{const a=P(70,100,44),b=P(70,101.2,44);return `M${f(a[0])},${f(a[1])} L${f(b[0])},${f(b[1])}`})()}"/>`}
function glassLSVG(){return glassX(98.5,5,95,14,70)}
function glassUSVG(){return glassX(98.5,5,95,74,130)}
function glassFSVG(){return glassY(5,95,98.5,74,130)}
function lidSVG(){let s='';
  s+=box(-4,-4,134,108,108,3,{tone:'k'});s+=box(-2,-2,137,104,104,5,{bevel:3.4,screws:3.6,hatch:1});
  s+=box(34,34,142,32,32,5,{tone:'k',bevel:1.6});
  s+=`<g transform="${mZ(40,40,147)}"><rect class="k-badge" x="0" y="0" width="20" height="20" rx="5"/><rect x="8" y="9" width="4" height="7.6" rx="2" class="lgi"/><path d="M6.4 7 10 4.2 13.6 7" class="lgc"/></g>`;
  return s}
const BUILD={base:baseSVG,gear:gearAsm,front:frontSVG,glassL:glassLSVG,glassU:glassUSVG,glassF:glassFSVG,exit:exitSVG,crank:crankSVG,lid:lidSVG};
const GUIDE={base:[[-8,108,4],[108,108,4],[108,-8,4]],gear:[[70,30,20],[70,90,66]],front:[[5,100,14],[95,100,14],[95,100,70]],glassL:[[98.5,95,14],[98.5,5,70]],glassU:[[98.5,95,74],[98.5,5,130]],glassF:[[5,98.5,74],[95,98.5,130]],exit:[[16,113,17],[46,113,17]],crank:[[70,101,44]],lid:[[-4,104,134],[104,104,134],[104,-4,134]]};
return {PARTS,STATIC_CALL,BUILD,GUIDE,frameBack,frameFront,binBack,pileSVG,paddle,PILE,MINI_C};
})();

/* 整机场景（组装态）· 大机器与首页迷你机器共用同一份画法，便于 FLIP 共享元素过渡 */
const GACHA_VB={A:[-114,-158,232,292],E:[-146,-232,288,384],M:[-108,-160,216,276]};
function gachaScene(sfx,opt={}){ISO.setSfx(sfx);const G=GACHA;const pg=id=>`<g class="part" data-p="${id}"><g class="pin">${G.BUILD[id]()}</g></g>`;
  let s=ISO.defs();
  s+=`<polygon class="halo" points="${ISO.pts([[-12,-12,0],[118,-12,0],[118,118,0],[-12,118,0]])}"/>`;
  s+=pg('base');s+=`<g class="part st" data-p="frame">${G.frameBack()}</g>`;s+=pg('gear');
  s+=`<g class="part st" data-p="bin">${G.binBack()}<g class="pile">${G.pileSVG()}</g><g class="paddle">${G.paddle(0)}</g></g>`;
  s+=`<g class="part st" data-p="frame2">${G.frameFront()}</g>`;
  ['front','exit','glassL','glassU','glassF','crank','lid'].forEach(id=>{s+=pg(id)});
  if(opt.withCase)s+=`<g class="part st" data-p="case9"></g><g class="drop"></g>`;
  return s}

const PILE_PICK=(()=>{const a=[];GACHA.PILE.forEach((c,i)=>{if(c.z>95)a.push(i)});return a.length?a:[0]})();
function P3(x,y,z){return ISO.P(x,y,z)}

type Tw = (dur: number, fn: (e: number, t: number) => void, ease?: (t: number) => number) => Promise<void>
const _tween = tween as unknown as Tw
const _sleep = sleep as unknown as (ms: number) => Promise<void>
const _anim = anim as unknown as (el: Element, kf: Keyframe[], o: KeyframeAnimationOptions) => Animation
export { ISO, GACHA, CASE, GACHA_VB, gachaScene, PILE_PICK, P3, TAGC, CAPC, LAYC, GLYPH_GACHA, GLYPH_CASE, _tween as tween, _sleep as sleep, _anim as anim, easeIO, easeOut, easeOutBack, clamp01, RM }
