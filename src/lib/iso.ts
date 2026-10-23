// @ts-nocheck
// Isometric drawing kit, mini chest, tweens and the gacha machine SVG, ported from the v9 design board
// (work/v9/iso.js + app.js + gacha.js). Four-tone shading, 0.6px lines, painter's order; colours come from CSS vars.
/* ── isometric kit (Anatomy-inspired: four-tone shading, 0.6px lines, painter's order) ── */
const ISO=(()=>{
const K=Math.cos(Math.PI/6);let SFX='';const setSfx=v=>{SFX=v};
const P=(x,y,z)=>[(x-y)*K,(x+y)/2-z];
const f=n=>Math.round(n*100)/100;
const pt=p=>{const q=P(p[0],p[1],p[2]);return f(q[0])+','+f(q[1])};
const pts=a=>a.map(pt).join(' ');
const poly=(a,c,extra='')=>`<polygon class="${c}" points="${pts(a)}" ${extra}/>`;
const mX=(x,y,z)=>{const q=P(x,y,z);return `matrix(${f(K)},-0.5,0,1,${f(q[0])},${f(q[1])})`};
const mY=(x,y,z)=>{const q=P(x,y,z);return `matrix(${f(K)},0.5,0,1,${f(q[0])},${f(q[1])})`};
const mZ=(x,y,z)=>{const q=P(x,y,z);return `matrix(${f(K)},0.5,${f(-K)},0.5,${f(q[0])},${f(q[1])})`};
function box(x,y,z,w,d,h,o={}){
  const t=o.lit?['r3','r2','r1']:[o.top||'t3',o.fy||'t2',o.fx||'t1'];
  const top=[[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]];
  const fx=[[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]];
  const fy=[[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]];
  let s=poly(fy,t[1])+poly(fx,t[2])+poly(top,t[0]);
  if(o.bevel){const b=o.bevel;s+=`<polygon class="lnf" points="${pts([[x+b,y+b,z+h],[x+w-b,y+b,z+h],[x+w-b,y+d-b,z+h],[x+b,y+d-b,z+h]])}"/>`}
  return s;
}
/* sloped slab: z varies linearly along x */
function slope(x0,x1,y,d,z0,z1,h,o={}){
  const top=[[x0,y,z0+h],[x1,y,z1+h],[x1,y+d,z1+h],[x0,y+d,z0+h]];
  const fy=[[x0,y+d,z0],[x1,y+d,z1],[x1,y+d,z1+h],[x0,y+d,z0+h]];
  const fx=[[x1,y,z1],[x1,y+d,z1],[x1,y+d,z1+h],[x1,y,z1+h]];
  return poly(fy,o.fy||'t2')+poly(fx,'t1')+poly(top,o.top||'t3');
}
function ell(cx,cy,z,r){const q=P(cx,cy,z);return {X:q[0],Y:q[1],rx:r*1.2247,ry:r*.7071}}
function cyl(cx,cy,z,r,h,o={}){
  const b=ell(cx,cy,z,r),t=ell(cx,cy,z+h,r);
  const g=o.grad||`url(#cg${SFX})`;
  let s=`<path class="f" fill="${o.lit?`url(#cgr${SFX})`:g}" d="M${f(b.X-b.rx)},${f(b.Y)} A${f(b.rx)},${f(b.ry)} 0 0 0 ${f(b.X+b.rx)},${f(b.Y)} L${f(t.X+t.rx)},${f(t.Y)} A${f(t.rx)},${f(t.ry)} 0 0 1 ${f(t.X-t.rx)},${f(t.Y)} Z"/>`;
  s+=`<ellipse class="f ${o.lit?'r3':(o.top||'t3')}" cx="${f(t.X)}" cy="${f(t.Y)}" rx="${f(t.rx)}" ry="${f(t.ry)}"/>`;
  if(o.ring){s+=`<ellipse class="lnf" cx="${f(t.X)}" cy="${f(t.Y)}" rx="${f(t.rx*o.ring)}" ry="${f(t.ry*o.ring)}"/>`}
  return s;
}
function defs(){return `<defs>
<linearGradient id="cg${SFX}" x1="0" x2="1"><stop offset="0" style="stop-color:var(--s2)"/><stop offset=".35" style="stop-color:var(--s3)"/><stop offset=".7" style="stop-color:var(--s1)"/><stop offset="1" style="stop-color:var(--s0)"/></linearGradient>
<linearGradient id="cgr${SFX}" x1="0" x2="1"><stop offset="0" stop-color="#e5484d"/><stop offset=".35" stop-color="#f07a7e"/><stop offset=".7" stop-color="#c93a3f"/><stop offset="1" stop-color="#a52e33"/></linearGradient>
<radialGradient id="glassg${SFX}" cx=".38" cy=".32" r=".75"><stop offset="0" style="stop-color:var(--s3);stop-opacity:.55"/><stop offset=".7" style="stop-color:var(--s2);stop-opacity:.2"/><stop offset="1" style="stop-color:var(--s0);stop-opacity:.45"/></radialGradient>
<radialGradient id="capg${SFX}" cx=".35" cy=".3" r=".8"><stop offset="0" style="stop-color:var(--s3)"/><stop offset="1" style="stop-color:var(--s1)"/></radialGradient>
</defs>`}
function gearPath(r,n,dp){let d='';for(let i=0;i<n;i++){const a=i/n*Math.PI*2,s=Math.PI*2/n;
  const pts=[[r-dp,a-s*.5],[r-dp,a-s*.22],[r,a-s*.14],[r,a+s*.14],[r-dp,a+s*.22]];
  pts.forEach(([rr,aa],j)=>{d+=(i==0&&j==0?'M':'L')+f(Math.cos(aa)*rr)+','+f(Math.sin(aa)*rr)})}
  return d+'Z'}
/* capsule in screen space */
function capsule(r,tone,id){
  const top=tone=='red'?'r2':tone;
  return `<g ${id?`id="${id}"`:''} class="capsule"><g class="cb"><path class="f t3" d="M${-r},0 A${r},${r} 0 0 0 ${r},0 Z"/></g>
  <g class="ct"><path class="f ${top}" d="M${-r},0 A${r},${r} 0 0 1 ${r},0 Z"/><path class="shine" style="stroke-width:${Math.max(1,r*.18)}" d="M${f(-r*.55)},${f(-r*.45)} A${f(r*.75)},${f(r*.75)} 0 0 1 ${f(-r*.05)},${f(-r*.78)}"/></g>
  <line class="lnm" x1="${-r}" y1="0" x2="${r}" y2="0"/></g>`}
/* chest: body + lid at angle a (deg) */
function rotLid(p,y0,zh,a){const c=Math.cos(a),s=Math.sin(a),dy=p[1]-y0,dz=p[2]-zh;return [p[0],y0+dy*c-dz*s,zh+dy*s+dz*c]}
const V=[1,1,1];
function nrm(a,b,c){const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];return [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]}
function lidSVG(c,deg,mini){
  const {x,y,z,w,d,h,lh}=c,zh=z+h,a=deg*Math.PI/180;
  const R=p=>rotLid(p,y,zh,a);
  const v=[[x,y,zh],[x+w,y,zh],[x+w,y+d,zh],[x,y+d,zh],[x,y,zh+lh],[x+w,y,zh+lh],[x+w,y+d,zh+lh],[x,y+d,zh+lh]].map(R);
  const F=[{i:[4,5,6,7],t:'t3'},{i:[3,2,1,0],t:'t0',inner:1},{i:[3,7,6,2],t:'t2',front:1},{i:[1,2,6,5],t:'t1'},{i:[0,1,5,4],t:'t2'},{i:[0,4,7,3],t:'t1'}];
  const vis=F.filter(F=>{const n=nrm(v[F.i[0]],v[F.i[1]],v[F.i[2]]);return n[0]*V[0]+n[1]*V[1]+n[2]*V[2]>0.01});
  let s='';
  vis.sort((A,B)=>{const ca=A.i.reduce((s,k)=>s+v[k][0]+v[k][1]+v[k][2],0),cb=B.i.reduce((s,k)=>s+v[k][0]+v[k][1]+v[k][2],0);return ca-cb});
  vis.forEach(F=>{s+=poly(F.i.map(k=>v[k]),F.inner?'cav2':F.t);
    if(F.front){const hx=x+w/2,q=[[hx-5,y+d,zh+1],[hx+5,y+d,zh+1],[hx+5,y+d,zh+lh-1.5],[hx-5,y+d,zh+lh-1.5]].map(R);s+=poly(q,'r2')}
    if(F.t=='t3'&&!F.inner&&!mini){const q=[[x+3,y+3,zh+lh],[x+w-3,y+3,zh+lh],[x+w-3,y+d-3,zh+lh],[x+3,y+d-3,zh+lh]].map(R);s+=`<polygon class="lnf" points="${pts(q)}"/>`;
      [[x+w*.22],[x+w*.78]].forEach(([sx])=>{const q2=[[sx-2.5,y,zh+lh],[sx+2.5,y,zh+lh],[sx+2.5,y+d,zh+lh],[sx-2.5,y+d,zh+lh]].map(R);s+=poly(q2,'t1')})}
  });
  return s;
}
function chestBody(c,id){
  const {x,y,z,w,d,h}=c,t=Math.max(2,w*.05),zt=z+h;
  let s='';
  s+=poly([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,zt],[x,y+d,zt]],'t2');
  s+=poly([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,zt],[x+w,y,zt]],'t1');
  s+=poly([[x,y,zt],[x+w,y,zt],[x+w,y+d,zt],[x,y+d,zt]],'t3');
  const inner=[[x+t,y+t,zt],[x+w-t,y+t,zt],[x+w-t,y+d-t,zt],[x+t,y+d-t,zt]];
  s+=`<clipPath id="${id}cv"><polygon points="${pts(inner)}"/></clipPath>`;
  s+=poly(inner,'cav');
  s+=`<g clip-path="url(#${id}cv)">${poly([[x+t,y+t,zt],[x+w-t,y+t,zt],[x+w-t,y+t,zt-h*.55],[x+t,y+t,zt-h*.55]],'cav2','style="stroke:none"')}${poly([[x+t,y+t,zt],[x+t,y+d-t,zt],[x+t,y+d-t,zt-h*.55],[x+t,y+t,zt-h*.55]],'cav2','style="stroke:none;opacity:.6"')}</g>`;
  s+=`<polygon class="ln" style="fill:none" points="${pts(inner)}"/>`;
  return s;
}
function chestFront(c,mini){
  const {x,y,z,w,d,h}=c,zt=z+h;let s='';
  s+=poly([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,zt],[x,y+d,zt]],'t2');
  s+=poly([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,zt],[x+w,y,zt]],'t1');
  if(mini){const hx=x+w/2;return s+poly([[hx-2.2,y+d,zt-h*.5],[hx+2.2,y+d,zt-h*.5],[hx+2.2,y+d,zt],[hx-2.2,y+d,zt]],'r2')}
  [x+w*.22,x+w*.78].forEach(sx=>{s+=poly([[sx-2.5,y+d,z],[sx+2.5,y+d,z],[sx+2.5,y+d,zt],[sx-2.5,y+d,zt]],'t1')});
  [y+d*.25,y+d*.75].forEach(sy=>{s+=poly([[x+w,sy-2.5,z],[x+w,sy+2.5,z],[x+w,sy+2.5,zt],[x+w,sy-2.5,zt]],'t0')});
  const hx=x+w/2;
  s+=poly([[hx-4,y+d,zt-h*.42],[hx+4,y+d,zt-h*.42],[hx+4,y+d,zt],[hx-4,y+d,zt]],'r1');
  const k=P(hx,y+d,zt-h*.22);s+=`<circle cx="${f(k[0])}" cy="${f(k[1])}" r="${f(Math.max(.7,w*.012))}" fill="#5a1a1d"/>`;
  s+=`<polyline class="lnf" points="${pts([[x,y+d,z+h*.18],[x+w,y+d,z+h*.18],[x+w,y,z+h*.18]])}"/>`;
  return s;
}
function halo(cx,cy,z,r,sc=1){const e=ell(cx,cy,z,r);return `<ellipse class="halo" cx="${f(e.X)}" cy="${f(e.Y+2)}" rx="${f(e.rx*sc)}" ry="${f(e.ry*sc)}"/>`}
return {setSfx,get sfx(){return SFX},K,P,f,pt,pts,poly,mX,mY,mZ,box,slope,cyl,ell,defs,gearPath,capsule,lidSVG,chestBody,chestFront,halo};
})();

/* ── mini chest for title bar ── */
const MINI={x:0,y:0,z:0,w:22,d:15,h:10,lh:5};
function miniChestSVG(deg=0){
  const c=MINI;
  return `<svg class="mchest iso" viewBox="-14 -19.5 34 38">${ISO.chestBody(c,'mc'+Math.random().toString(36).slice(2,6))}${ISO.chestFront(c,1)}<g class="lid">${ISO.lidSVG(c,deg,1)}</g></svg>`;
}
let FROZEN=false;
// Test hooks: freeze()/unfreeze() pause every tween and CSS animation (used for screenshots).
window.freeze=()=>{FROZEN=true;document.getAnimations().forEach(a=>a.pause())};window.unfreeze=()=>{FROZEN=false;document.getAnimations().forEach(a=>{if(a.playState==='paused')a.play()})};
function tween(dur,fn,ease=t=>1-Math.pow(1-t,3)){return new Promise(r=>{let el=0,last=performance.now();const step=n=>{if(!FROZEN)el+=n-last;last=n;const t=Math.min(1,el/dur);fn(ease(t),t);t<1?requestAnimationFrame(step):r()};requestAnimationFrame(step)})}
const easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const easeOutBack=t=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function wiggleChest(svg,big){ /* lid bounce: open a bit, close with bounce */
  if(!svg)return;const g=svg.querySelector('.lid');if(!g)return;
  const c=big||MINI,mini=!big;
  return tween(680,(e,t)=>{const a=Math.sin(t*Math.PI)*42*(1-t*.3)+Math.sin(t*Math.PI*3)*7*(1-t);g.innerHTML=ISO.lidSVG(c,Math.max(0,a),mini)},t=>t).then(()=>{g.innerHTML=ISO.lidSVG(c,0,mini)});
}
/* ───────── 图标扭蛋机 (isometric, Anatomy-style) ───────── */
const G={GC:[60,60,156],GR:44,CR:9,CHEST:{x:186,y:74,z:0,w:66,d:50,h:22,lh:7},CRANK:[58,30],DOOR:[36,80,36,58]};
function rand(seed){let s=seed;return()=>{s=(s*16807)%2147483647;return (s-1)/2147483646}}
function gachaSVG(sfx){
  ISO.setSfx(sfx);const {box,cyl,poly,pts,P,f,mX,mY,ell,slope}=ISO;
  let s=`<svg class="isosvg iso" viewBox="-160 -198 340 398" preserveAspectRatio="xMidYMid meet">${ISO.defs()}`;
  s+=ISO.halo(60,60,0,96)+ISO.halo(219,99,0,48)+ISO.halo(150,126,0,10);
  /* feet + plinth */
  [[0,0],[120,0],[0,120],[120,120]].sort((a,b)=>a[0]+a[1]-b[0]-b[1]).forEach(([x,y])=>{s+=cyl(x,y,0,6,4)});
  s+=box(-12,-12,4,144,144,10,{bevel:5});
  [[-5,-5],[125,-5],[-5,125],[125,125]].forEach(([x,y])=>{const q=P(x,y,14);s+=`<circle class="dot" cx="${f(q[0])}" cy="${f(q[1])}" r=".9"/>`});
  /* body */
  s+=box(0,0,14,120,120,100);
  s+=`<polyline class="lnf" points="${pts([[0,120,104],[120,120,104],[120,0,104]])}"/><polyline class="lnf" points="${pts([[0,120,24],[120,120,24],[120,0,24]])}"/>`;
  /* side window with gears (+x face) */
  s+=`<g transform="${mX(120,120,114)}"><rect class="f cav2" x="16" y="16" width="88" height="66" rx="4"/>
     <g id="${sfx}g1" data-c="44,48"><path class="f t2" d="${ISO.gearPath(22,16,3.4)}" transform="translate(44,48)"/><circle class="f t3" cx="44" cy="48" r="9"/>${[0,1,2,3,4].map(i=>{const a=i/5*Math.PI*2;return `<circle class="f cav" cx="${f(44+Math.cos(a)*15)}" cy="${f(48+Math.sin(a)*15)}" r="2.6"/>`}).join('')}<circle class="dot" cx="44" cy="48" r="1.6"/></g>
     <g id="${sfx}g2" data-c="73,66"><path class="f t1" d="${ISO.gearPath(13,10,3)}" transform="translate(73,66)"/><circle class="f t3" cx="73" cy="66" r="4.5"/><circle class="dot" cx="73" cy="66" r="1.2"/></g>
     <g id="${sfx}g3" data-c="86,32"><path class="f t2" d="${ISO.gearPath(9,8,2.6)}" transform="translate(86,32)"/><circle class="dot" cx="86" cy="32" r="1.1"/></g>
     <rect x="16" y="16" width="88" height="66" rx="4" class="ln"/>
     ${[0,1,2,3].map(i=>`<rect class="lnf" x="${24+i*20}" y="88" width="12" height="3" rx="1.5"/>`).join('')}</g>`;
  /* front face (+y) */
  const [d0,d1,z0,z1]=G.DOOR;
  s+=`<g transform="${mY(0,120,114)}"><rect class="lnf" x="7" y="6" width="106" height="88" rx="5" fill="none"/>
     <rect class="f cav" x="${d0}" y="${114-z1}" width="${d1-d0}" height="${z1-z0}" rx="3"/>
     <rect class="f t2" x="90" y="16" width="16" height="28" rx="3"/><rect class="cav" x="96.6" y="21" width="2.8" height="18" rx="1.4"/>
     <circle class="f t1" cx="${G.CRANK[0]}" cy="${G.CRANK[1]}" r="20"/><circle class="lnf" cx="${G.CRANK[0]}" cy="${G.CRANK[1]}" r="15.5"/>
     ${Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2;return `<line class="lnl" x1="${f(G.CRANK[0]+Math.cos(a)*17)}" y1="${f(G.CRANK[1]+Math.sin(a)*17)}" x2="${f(G.CRANK[0]+Math.cos(a)*19)}" y2="${f(G.CRANK[1]+Math.sin(a)*19)}"/>`}).join('')}
     <g transform="translate(11,9) scale(.14)"><rect x="6" y="6" width="88" height="88" rx="21" class="f t0"/><rect x="42.5" y="44" width="15" height="34" rx="7.5" class="t3"/><path d="M37 33 50 22 63 33" fill="none" stroke="#e5484d" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g></g>`;
  /* crank: stacked planes for thickness, each rotates */
  const [cu,cv]=G.CRANK;
  for(let t=1;t<=3;t++)s+=`<g transform="${mY(0,120+t,114)}"><circle class="t1 nos" cx="${cu}" cy="${cv}" r="7.5"/></g>`;
  s+=`<g transform="${mY(0,124,114)}"><circle class="f t3" cx="${cu}" cy="${cv}" r="7.5"/></g>`;
  for(let t=4;t<=6;t++)s+=`<g transform="${mY(0,120+t,114)}"><g class="crot" transform="rotate(0 ${cu} ${cv})"><rect class="${t<6?'t1 nos':'f t3'}" x="${cu-3.2}" y="${cv-3.2}" width="23" height="6.4" rx="3.2"/></g></g>`;
  for(let t=6;t<=13;t++)s+=`<g transform="${mY(0,120+t,114)}"><g class="crot" transform="rotate(0 ${cu} ${cv})"><circle class="${t<13?'r1 nos':'f r2'}" cx="${cu+17}" cy="${cv}" r="4.6"/>${t==13?`<circle cx="${cu+15.8}" cy="${cv-1.2}" r="1.2" fill="#fff" opacity=".6"/>`:''}</g></g>`;
  s+=`<g transform="${mY(0,126,114)}"><circle class="dot" cx="${cu}" cy="${cv}" r="1.2"/></g>`;
  /* crank hit area (screen) */
  const ch=P(cu,126,114-cv);s+=`<circle class="crank" id="${sfx}crankhit" cx="${f(ch[0])}" cy="${f(ch[1])}" r="30" fill="transparent"/>`;
  /* globe: sphere + pile + collar lip + cap */
  const gc=P(...G.GC),gr=G.GR*1.2247;
  s+=cyl(60,60,114,40,10);
  s+=`<circle cx="${f(gc[0])}" cy="${f(gc[1])}" r="${f(gr)}" style="fill:url(#glassg${sfx});stroke:none"/>`;
  s+=`<g id="${sfx}pile">`;const rnd=rand(7);const pile=[];
  for(let i=0;i<34;i++){for(let k=0;k<30;k++){const z=124+rnd()*30,dz=z-G.GC[2],rr=Math.sqrt(Math.max(0,(G.GR-7)**2-dz*dz));const a=rnd()*Math.PI*2,r=Math.sqrt(rnd())*rr;const p=[60+Math.cos(a)*r,60+Math.sin(a)*r,z];
      if(pile.every(q=>(q[0]-p[0])**2+(q[1]-p[1])**2+(q[2]-p[2])**2>110)){pile.push(p);break}}}
  pile.sort((a,b)=>a[0]+a[1]+a[2]-b[0]-b[1]-b[2]);
  const tones=['t0','t1','t2','t1','t0','t3'];
  pile.forEach((p,i)=>{const q=P(...p);s+=`<g class="pc" data-x="${f(q[0])}" data-y="${f(q[1])}" data-r="${Math.round(rnd()*180)}" transform="translate(${f(q[0])},${f(q[1])}) rotate(${Math.round(rnd()*180)})">${ISO.capsule(7.4,i%9==4?'red':tones[i%6])}</g>`});
  s+=`</g>`;
  s+=`<circle cx="${f(gc[0])}" cy="${f(gc[1])}" r="${f(gr)}" class="ln" style="stroke:var(--lhi)"/>`;
  s+=`<path class="shine" d="M${f(gc[0]-gr*.62)},${f(gc[1]-gr*.38)} A${f(gr*.78)},${f(gr*.78)} 0 0 1 ${f(gc[0]-gr*.12)},${f(gc[1]-gr*.76)}"/><path class="shine" style="stroke-width:1.2;opacity:.45" d="M${f(gc[0]+gr*.55)},${f(gc[1]+gr*.42)} A${f(gr*.75)},${f(gr*.75)} 0 0 1 ${f(gc[0]+gr*.2)},${f(gc[1]+gr*.66)}"/>`;
  {const b=ell(60,60,114,40),t=ell(60,60,124,40);s+=`<path class="f" fill="url(#cg${sfx})" d="M${f(t.X-t.rx)},${f(t.Y)} A${f(t.rx)},${f(t.ry)} 0 0 0 ${f(t.X+t.rx)},${f(t.Y)} L${f(b.X+b.rx)},${f(b.Y)} A${f(b.rx)},${f(b.ry)} 0 0 1 ${f(b.X-b.rx)},${f(b.Y)} Z"/>`;
   const t2=ell(60,60,121,40);s+=`<path class="lnf" d="M${f(t2.X-t2.rx)},${f(t2.Y)} A${f(t2.rx)},${f(t2.ry)} 0 0 0 ${f(t2.X+t2.rx)},${f(t2.Y)}"/>`}
  s+=cyl(60,60,196,11,7,{ring:.6})+cyl(60,60,203,4,4);
  /* shelf */
  s+=box(34,120,30,48,13,4,{bevel:1.5});
  /* chute: post, floor + back wall */
  s+=cyl(150,126,0,2.6,28.6)+cyl(150,126,0,6,2);
  s+=slope(84,180,119,14,31.5,27.5,2.5)+slope(84,180,119,1.6,34,30,4.5);
  /* chest body (cavity) */
  s+=`<g id="${sfx}chestb">${ISO.chestBody(G.CHEST,sfx+'gc')}</g>`;
  /* capsule actor */
  const dc=[[d0,120.2,z0],[d1,120.2,z0],[d1,120.2,z1],[d0,120.2,z1]];
  s+=`<clipPath id="${sfx}doorclip"><polygon points="${pts(dc)}"/></clipPath>`;
  s+=`<g id="${sfx}capwrap"><g id="${sfx}cap" transform="translate(-999,-999)">${ISO.capsule(G.CR,'red')}</g></g>`;
  /* flap over door */
  s+=`<g transform="${mY(0,120.3,114)}"><g id="${sfx}flap"><rect class="f t1" x="${d0+1}" y="${114-z1+1}" width="${d1-d0-2}" height="11" rx="2"/><line class="lnl" x1="${d0+4}" y1="${114-z1+9}" x2="${d1-4}" y2="${114-z1+9}"/></g></g>`;
  /* chute front wall, chest front, lid */
  s+=slope(84,180,131.4,1.6,34,30,4.5);
  s+=ISO.chestFront(G.CHEST);
  s+=`<g id="${sfx}lid">${ISO.lidSVG(G.CHEST,0)}</g>`;
  s+=`</svg>`;return s;
}


type Pt = [number, number, number]
interface ChestDim { x: number, y: number, z: number, w: number, d: number, h: number, lh: number }
const _ISO = ISO as unknown as {
  setSfx: (v: string) => void, P: (...p: Pt) => [number, number], defs: () => string, halo: (cx: number, cy: number, z: number, r: number, sc?: number) => string,
  chestBody: (c: ChestDim, id: string) => string, chestFront: (c: ChestDim, mini?: boolean | number) => string, lidSVG: (c: ChestDim, deg: number, mini?: boolean | number) => string,
}
const _tween = tween as unknown as (dur: number, fn: (e: number, t: number) => void, ease?: (t: number) => number) => Promise<void>
const _G = G as unknown as { GC: Pt, GR: number, CR: number, CHEST: ChestDim, CRANK: [number, number], DOOR: [number, number, number, number] }
const _wiggle = wiggleChest as unknown as (svg: SVGSVGElement | null, big?: ChestDim) => Promise<void> | undefined
export { _ISO as ISO, MINI, miniChestSVG, _tween as tween, easeIO, easeOutBack, sleep, _wiggle as wiggleChest, _G as G, gachaSVG }
