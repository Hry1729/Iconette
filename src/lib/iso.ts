// @ts-nocheck
// v11 hand-inked isometric kit: the gashapon machine (GM), the idea chest (CHEST), capsules (INK.capsule),
// title-bar glyphs, and the motion helpers shared by every view. Ported from the approved design (work/v11-2/ink.js).
// Ink wobble is baked into the geometry with a deterministic hash, so there are no runtime filters.
// Colours come from CSS vars (styles/v11.css); the paper grain / chest glow defs live once in App.vue (#inkGrain, #inkGlow).
let GLYPH_GACHA='',GLYPH_CASE='';
/* ═════════ v11 · 手绘墨线等距套件（hand-inked isometric kit）═════════
   同一投影 P(x,y,z)=[(x−y)·cos30°,(x+y)/2−z]（与 ISO.P 一致，便于 FLIP 共享元素）。
   墨线抖动在几何生成时一次算好（确定性哈希），运行时零滤镜开销：只有 transform / 少量重绘。 */
const INK=(()=>{
const K=Math.cos(Math.PI/6);
const P=(x,y,z)=>[(x-y)*K,(x+y)/2-z];
const f=n=>Math.round(n*100)/100;
const hsh=(a,b)=>{const s=Math.sin(a*127.1+b*311.7)*43758.5453;return s-Math.floor(s)};
let AMP=.2;const SEG=4.2;
/* wobble along each straight edge (corners stay put) */
function wob(pts,closed=true,amp=AMP){const n=pts.length,m=closed?n:n-1,o=[];
  for(let i=0;i<m;i++){const p=pts[i],q=pts[(i+1)%n],L=Math.hypot(q[0]-p[0],q[1]-p[1])||1,k=Math.max(1,Math.round(L/SEG));
    for(let j=0;j<k;j++){const t=j/k,x=p[0]+(q[0]-p[0])*t,y=p[1]+(q[1]-p[1])*t;
      if(j===0){o.push([x,y]);continue}
      const a=amp*(.55+.45*Math.sin(t*Math.PI)),nx=-(q[1]-p[1])/L,ny=(q[0]-p[0])/L,d=(hsh(f(x),f(y))-.5)*2*a;o.push([x+nx*d,y+ny*d])}}
  if(!closed)o.push(pts[n-1]);return o}
/* wobble a closed curve radially */
function ring(pts,amp=AMP){let cx=0,cy=0;pts.forEach(p=>{cx+=p[0];cy+=p[1]});cx/=pts.length;cy/=pts.length;
  return pts.map(p=>{const dx=p[0]-cx,dy=p[1]-cy,L=Math.hypot(dx,dy)||1,d=(hsh(f(p[0]*1.7),f(p[1]*1.3))-.5)*2*amp;return [p[0]+dx/L*d,p[1]+dy/L*d]})}
const D=(pts,closed=true)=>'M'+pts.map(p=>f(p[0])+' '+f(p[1])).join('L')+(closed?'Z':'');
const pr=a=>a.map(p=>P(p[0],p[1],p[2]));
const path=(d,c,ex='')=>`<path class="${c}" d="${d}" ${ex}/>`;
/* 3D polygon (straight edges) */
const poly=(pts3,c,ex='')=>path(D(wob(pr(pts3))),c,ex);
const line=(pts3,c='il',ex='')=>path(D(wob(pr(pts3),false),false),c,ex);
/* horizontal circle (plane z) in screen pts */
function hc(cx,cy,z,r,n=44,a0=0,a1=Math.PI*2){const q=P(cx,cy,z),rx=r*1.2247,ry=r*.7071,o=[];for(let i=0;i<=n;i++){const t=a0+(a1-a0)*i/n;o.push([q[0]+rx*Math.cos(t),q[1]+ry*Math.sin(t)])}return o}
const ell=(cx,cy,z,r,c,ex='')=>path(D(ring(hc(cx,cy,z,r).slice(0,-1))),c,ex);
/* vertical cylinder: front side + top ellipse */
function cyl(cx,cy,z,r,h,cs,ct,o={}){
  const b=hc(cx,cy,z,r,24,0,Math.PI),t=hc(cx,cy,z+h,r,24,Math.PI,0);
  let s=path(D(ring([...b,...t],AMP*.6)),cs);
  if(!o.noTop)s+=ell(cx,cy,z+h,r,ct);
  if(o.band)s+=path(D(hc(cx,cy,z+h*o.band,r,24,0,Math.PI),false),'il thin');
  return s}
/* annulus on plane z (outer r1, inner r0); half: 'front' | 'all' */
function ann(cx,cy,z,r1,r0,c,half='all'){
  if(half==='front'){const o=hc(cx,cy,z,r1,24,0,Math.PI),i=hc(cx,cy,z,r0,24,Math.PI,0);
    const a=P(cx,cy,z);const L=[...o,[a[0]-r0*1.2247,a[1]],...i,[a[0]+r1*1.2247,a[1]]];return path(D(L),c)}
  return path(D(ring(hc(cx,cy,z,r1).slice(0,-1)))+D(ring(hc(cx,cy,z,r0).slice(0,-1))),c,'fill-rule="evenodd"')}
/* screen circle */
function sc(X,Y,R,n=48){const o=[];for(let i=0;i<n;i++){const t=i/n*Math.PI*2;o.push([X+R*Math.cos(t),Y+R*Math.sin(t)])}return o}
const circ=(X,Y,R,c,ex='')=>path(D(ring(sc(X,Y,R))),c,ex);
/* rounded rectangle in local (u,v) */
function rr(u0,v0,u1,v1,r,n=5){const o=[];const C=[[u1-r,v0+r,-Math.PI/2],[u1-r,v1-r,0],[u0+r,v1-r,Math.PI/2],[u0+r,v0+r,Math.PI]];
  C.forEach(([cu,cv,a])=>{for(let i=0;i<=n;i++){const t=a+Math.PI/2*i/n;o.push([cu+r*Math.cos(t),cv+r*Math.sin(t)])}});return o}
const lc=(cu,cv,r,n=36)=>{const o=[];for(let i=0;i<n;i++){const t=i/n*Math.PI*2;o.push([cu+r*Math.cos(t),cv+r*Math.sin(t)])}return o};
/* two-tone capsule ball in screen space (centre 0,0, radius R). θ = seam direction; m = seam ellipse ratio.
   Groups .ctop / .cbot so the reveal can split it open. */
function capsule(R,col,o={}){
  const th=(o.th??-24)*Math.PI/180,m=o.m??.38,w=o.lw??Math.max(.5,R*.11);
  const c=Math.cos(th),s=Math.sin(th);
  const A=[R*c,R*s],B=[-R*c,-R*s],deg=th*180/Math.PI;
  const top=`M${f(A[0])} ${f(A[1])}A${f(R)} ${f(R)} 0 0 0 ${f(B[0])} ${f(B[1])}A${f(R)} ${f(R*m)} ${f(deg)} 0 0 ${f(A[0])} ${f(A[1])}Z`;
  const bot=`M${f(B[0])} ${f(B[1])}A${f(R)} ${f(R)} 0 0 0 ${f(A[0])} ${f(A[1])}A${f(R)} ${f(R*m)} ${f(deg)} 0 1 ${f(B[0])} ${f(B[1])}Z`;
  /* seam: the visible rim ellipse arc */
  const rim=`M${f(B[0])} ${f(B[1])}A${f(R)} ${f(R*m)} ${f(deg)} 0 0 ${f(A[0])} ${f(A[1])}`;
  const nx=-s,ny=c; /* towards the white half */
  const g=[-R*.34,-R*.4];
  const mark=o.mark&&ICONMARK[o.mark]?`<g transform="translate(${f(-nx*R*.42)},${f(-ny*R*.42)}) scale(${f(R/9)})">${ICONMARK[o.mark]}</g>`:'';
  return `<g class="icap" style="--lw:${f(w)}"><g class="cbot"><path class="cb" d="${bot}"/><path class="cshd" d="M${f(B[0]*.92)} ${f(B[1]*.92)}A${f(R*.92)} ${f(R*.92)} 0 0 0 ${f(A[0]*.92)} ${f(A[1]*.92)}" style="stroke-width:${f(R*.16)}"/></g>`+
    `<g class="ctop"><path class="ct" d="${top}" style="fill:${col}"/>${mark}<ellipse class="cgl" cx="${f(g[0])}" cy="${f(g[1])}" rx="${f(R*.2)}" ry="${f(R*.13)}" transform="rotate(-35 ${f(g[0])} ${f(g[1])})"/><circle class="cgl2" cx="${f(g[0]+R*.32)}" cy="${f(g[1]-R*.12)}" r="${f(R*.06)}"/></g>`+
    `<path class="cseam" d="${rim}"/></g>`}
/* tiny white icon marks printed on a few capsules (9-unit box centred) */
const ICONMARK={
  heart:`<path class="cmk" d="M0 3.2C-3.6 .6-4 -1.4-2.6 -2.6S0 -2.6 0 -1C0 -2.6 1.2 -3.8 2.6 -2.6S3.6 .6 0 3.2Z"/>`,
  star:`<path class="cmk" d="M0 -3.6L1.05 -1.2L3.5 -1L1.6 .6L2.2 3.1L0 1.8L-2.2 3.1L-1.6 .6L-3.5 -1L-1.05 -1.2Z"/>`,
  bolt:`<path class="cmk" d="M.8 -3.8L-2.4 .6H0L-.8 3.8L2.4 -.6H0Z"/>`,
  i:`<rect class="cmk" x="-1" y="-.6" width="2" height="4" rx="1"/><path class="cmks" d="M-1.8 -1.8L0 -3.3L1.8 -1.8"/>`};
const CAPCOL=['#e5484d','#f5a524','#3e63dd','#30a46c','#8e4ec6','#12a594','#f76b15','#d6409f'];
return {K,P,f,hsh,wob,ring,D,pr,path,poly,line,hc,ell,cyl,ann,sc,circ,rr,lc,capsule,CAPCOL,ICONMARK};
})();

/* ═════════ 图标扭蛋机 v11 · 手绘等距（原创造型，参考 Colorfigures 的画法而非其图形）═════════
   世界单位 ≈ 1。机身 40×40×56；领口 + 玻璃球；正面（x=40，右前）：指示灯 · 投币口（静态）· 旋钮 · 出蛋口 + 托盘；
   左前侧（y=40）：品牌铭牌（黑色圆角方块 + 白 i + 红帽 · 三个小图标），不写字。 */
const GM=(()=>{
const {P,f,poly,line,ell,cyl,ann,circ,path,D,wob,ring,pr,rr,lc,capsule,CAPCOL,hsh}=INK;
const W=40,DP=40,BH=56,CX=20,CY=20;
const COL={r0:16.6,r1:15.4,ri:13.8,z0:BH,z1:BH+3,z2:BH+8};
const GR=19,GZ=COL.z2+Math.sqrt(GR*GR-COL.ri*COL.ri);           /* globe centre z ≈ 77 */
const CAPZ=GZ+Math.sqrt(GR*GR-7.2*7.2);                          /* metal cap ring */
const DIAL={u:20,v:27.6,r:9.2};
const EXIT={u0:10.5,v0:39,u1:29.5,v1:51.6};
const CR=3.9;                                                    /* capsule radius in the globe */
/* fr face (x=W): local u → −y from the left edge, v down from the top */
const FR=(u,v,d=0)=>[W+d,DP-u,BH-v];
const FL=(u,v,d=0)=>[u,DP+d,BH-v];
const onFR=(pts,d=0)=>pts.map(([u,v])=>FR(u,v,d));
const onFL=(pts,d=0)=>pts.map(([u,v])=>FL(u,v,d));
/* the capsule pile: deterministic packing inside the lower ~65% of the globe */
const PILE=(()=>{const o=[];let k=0;const top=GZ+6.5,zmin=COL.z2-3+CR;
  /* random sequential packing (deterministic): bottom-up, slight overlap allowed so the heap reads full */
  const cand=[];for(let n=0;n<2600;n++){const a=hsh(n,1.3)*Math.PI*2,rr=Math.sqrt(hsh(n,2.7))*GR,z=zmin+hsh(n,5.1)*(top-zmin);cand.push([CX+Math.cos(a)*rr,CY+Math.sin(a)*rr,z])}
  cand.sort((a,b)=>a[2]-b[2]);
  for(const [x,y,z] of cand){if(Math.hypot(x-CX,y-CY,z-GZ)>GR-CR*.82)continue;
    if(z<COL.z2+CR*.4&&Math.hypot(x-CX,y-CY)>COL.ri-CR*.6)continue;
    if(o.some(c=>Math.hypot(c.x-x,c.y-y,c.z-z)<CR*1.72))continue;
    o.push({x,y,z,c:CAPCOL[Math.floor(hsh(x*3,y*7)*CAPCOL.length)],th:Math.floor(hsh(y,x)*360),m:.25+hsh(x+1,z)*.45,i:k++})}
  o.sort((a,b)=>(a.x+a.y+a.z)-(b.x+b.y+b.z));
  /* v11.1：胶囊上不再印装饰符号（纯双色）；图标只在开壳揭晓时以用户自己的图标出现 */
  return o})();
const PICK=PILE.map((c,i)=>i).filter(i=>PILE[i].z>GZ-2);
function pileSVG(){return PILE.map(c=>{const q=P(c.x,c.y,c.z);return `<g class="pc" data-i="${c.i}" transform="translate(${f(q[0])},${f(q[1])})"><g class="pcj">${capsule(CR*1.2247,c.c,{th:c.th,m:c.m,mark:c.mark,lw:.42})}</g></g>`}).join('')}
/* knob (rotates) — extruded lozenge on the dial, drawn with the sticker trick so the hull reads as one outline */
function knob(a){const t=a*Math.PI/180,cs=Math.cos(t),sn=Math.sin(t);
  const R=(pts)=>pts.map(([u,v])=>[DIAL.u+u*cs-v*sn,DIAL.v+u*sn+v*cs]);
  const bar=R(rr(-7.4,-2.55,7.4,2.55,2.55,4)),dep=3.4,N=6;let back='',side='';
  for(let i=0;i<=N;i++){const d=D(pr(onFR(bar,dep*i/N)));back+=`<path class="kb" d="${d}"/>`;if(i<N)side+=`<path class="ks" d="${d}"/>`}
  const top=D(wob(pr(onFR(bar,dep)),true,.12));
  const grip=R([[-4.8,-1.1],[-4.8,1.1]]),grip2=R([[4.8,-1.1],[4.8,1.1]]);
  const hub=D(pr(onFR(lc(DIAL.u,DIAL.v,1.6,20),dep+.05)));
  return `<g class="knob">${back}${side}<path class="kt" d="${top}"/>${line(onFR(grip,dep+.02),'il thin')}${line(onFR(grip2,dep+.02),'il thin')}<path class="khub" d="${hub}"/></g>`}
/* exit flap — hinged on its top edge, swings outwards by `a` degrees */
function flap(a){const t=a*Math.PI/180,{u0,v0,u1,v1}=EXIT,l=v1-v0-.8;
  const pts=[[u0+.8,0],[u1-.8,0],[u1-.8,l],[u0+.8,l]].map(([u,ll])=>[W+ll*Math.sin(t)+.05,DP-u,BH-v0-.4-ll*Math.cos(t)]);
  const gl=[[u0+4,l*.2],[u0+7,l*.75]].map(([u,ll])=>[W+ll*Math.sin(t)+.1,DP-u,BH-v0-.4-ll*Math.cos(t)]);
  const gl2=[[u0+7.2,l*.18],[u0+9.2,l*.5]].map(([u,ll])=>[W+ll*Math.sin(t)+.1,DP-u,BH-v0-.4-ll*Math.cos(t)]);
  return poly(pts,'m-win')+line(gl,'il glint')+line(gl2,'il glint thin')}
function shadow(){const L=[[-1,-1,0],[W+7,-1,0],[W+7,DP+6,0]];const c=[CX+3,DP+7];const R=19;
  for(let i=0;i<=10;i++){const t=i/10*Math.PI;L.push([c[0]+Math.cos(t)*R*.9+2,c[1]+Math.sin(t)*R*.55,0])}
  L.push([-1,DP+4,0]);return poly(L,'m-shadow')}
/* the whole machine */
function body(){let s='';
  /* plinth band + body faces */
  s+=poly([[0,DP,0],[W,DP,0],[W,DP,BH],[0,DP,BH]],'m-fl')+poly([[W,0,0],[W,DP,0],[W,DP,BH],[W,0,BH]],'m-fr')+poly([[0,0,BH],[W,0,BH],[W,DP,BH],[0,DP,BH]],'m-top');
  s+=path(D(pr([[0,DP,0],[W,DP,0],[W,DP,BH],[0,DP,BH],[0,DP,0]]))+D(pr([[W,0,0],[W,DP,0],[W,DP,BH],[W,0,BH]]))+D(pr([[0,0,BH],[W,0,BH],[W,DP,BH],[0,DP,BH]])),'grain');
  s+=poly([[0,DP,0],[W,DP,0],[W,DP,3],[0,DP,3]],'m-fl2')+poly([[W,0,0],[W,DP,0],[W,DP,3],[W,0,3]],'m-fr2');
  /* lid seam + top bevel */
  s+=line([[0,DP,BH-4],[W,DP,BH-4],[W,0,BH-4]],'il thin');
  s+=poly([[2,2,BH],[W-2,2,BH],[W-2,DP-2,BH],[2,DP-2,BH]],'il thin nf');
  /* ── brand side (y=DP): plate + emblem + three tiny icons ── */
  s+=path(D(wob(pr(onFL(rr(5,8,35,47,4.2))))),'m-plate');
  s+=path(D(pr(onFL(rr(6.6,9.6,33.4,45.4,3)))),'il dash nf');
  s+=path(D(wob(pr(onFL(rr(12.5,13,27.5,28,4.4))),true,.12)),'m-emb');
  s+=path(D(pr(onFL(rr(18.6,19.6,21.4,25.6,1.4)))),'m-embi');
  s+=line(onFL([[16.2,18],[20,15.2],[23.8,18]]),'m-embc');
  /* v11.1：铭牌下排 = 三枚双色胶囊插画（红 / 黄 / 蓝，上彩下白，斜缝），对应参考图的胶囊排；不写字 */
  const pcap=(u,v,r,col,th)=>{const t=th*Math.PI/180,N=16;
    const half=(a0)=>{const o=[];for(let i=0;i<=N;i++){const a=a0+Math.PI*i/N;o.push([u+r*Math.cos(a),v+r*Math.sin(a)])}return o};
    const top=half(Math.PI+t),bot=half(t);
    const hl=[[u-r*.5,v-r*.42],[u-r*.12,v-r*.66]];
    return path(D(pr(onFL(bot))),'m-pcb')+path(D(pr(onFL(top))),'m-pct',`style="fill:${col}"`)+line(onFL(hl),'m-pchl')+path(D(ring(pr(onFL(lc(u,v,r,28))),.06)),'il nf icn')};
  s+=pcap(11.5,37.5,3.4,'#e5484d',-14)+pcap(20,37.8,3.4,'#f5a524',-14)+pcap(28.5,37.5,3.4,'#3e63dd',-14);
  /* ── mechanism face (x=W) ── */
  s+=path(D(pr(onFR(lc(34,5.4,1.25,16)))),'m-led');
  s+=path(D(wob(pr(onFR(rr(14.6,5.2,25.4,16.2,2.2))),true,.12)),'m-metal');           /* coin plate (static) */
  s+=path(D(pr(onFR(rr(19,7.2,21,14.2,1)))),'m-slot');
  s+=line(onFR([[16.4,15.2],[23.6,15.2]]),'il thin');
  /* dial: raised metal ring + red disc */
  const rg=lc(DIAL.u,DIAL.v,DIAL.r,40);
  s+=path(D(pr(onFR(rg,0))),'kb')+path(D(pr(onFR(rg,.6))),'kb')+path(D(pr(onFR(rg,.3))),'m-metal2 nst');
  s+=path(D(ring(pr(onFR(rg,1.2)),.1)),'m-metal');
  s+=path(D(pr(onFR(lc(DIAL.u,DIAL.v,DIAL.r-1.7,40),1.25))),'m-dial');
  for(let k=0;k<8;k++){const t=k/8*Math.PI*2;s+=line(onFR([[DIAL.u+Math.cos(t)*(DIAL.r-.55),DIAL.v+Math.sin(t)*(DIAL.r-.55)],[DIAL.u+Math.cos(t)*(DIAL.r-1.15),DIAL.v+Math.sin(t)*(DIAL.r-1.15)]],1.25),'il tick')}
  s+=`<g class="knobg">${knob(0)}</g>`;
  /* exit opening */
  s+=path(D(wob(pr(onFR(rr(EXIT.u0-1.2,EXIT.v0-1.2,EXIT.u1+1.2,EXIT.v1+1.2,3.6))),true,.12)),'m-metal');
  s+=path(D(pr(onFR(rr(EXIT.u0,EXIT.v0,EXIT.u1,EXIT.v1,2.8)))),'m-cav');
  s+=`<g class="flapg">${flap(0)}</g>`;
  /* tray */
  const ty0=DP-EXIT.u1+.5,ty1=DP-EXIT.u0-.5;
  s+=poly([[W,ty0,2.2],[W+6.5,ty0,2.2],[W+6.5,ty1,2.2],[W,ty1,2.2]],'m-traytop')+poly([[W,ty1,.2],[W+6.5,ty1,.2],[W+6.5,ty1,2.2],[W,ty1,2.2]],'m-trayl')+poly([[W+6.5,ty0,.2],[W+6.5,ty1,.2],[W+6.5,ty1,2.2],[W+6.5,ty0,2.2]],'m-trayr');
  s+=poly([[W+5.6,ty0,2.2],[W+6.5,ty0,2.2],[W+6.5,ty1,2.2],[W+5.6,ty1,2.2]],'m-traytop')+poly([[W+6.5,ty0,2.2],[W+6.5,ty1,2.2],[W+6.5,ty1,4.2],[W+6.5,ty0,4.2]],'m-trayr')+poly([[W+5.6,ty1,2.2],[W+6.5,ty1,2.2],[W+6.5,ty1,4.2],[W+5.6,ty1,4.2]],'m-trayl')+poly([[W+5.6,ty0,4.2],[W+6.5,ty0,4.2],[W+6.5,ty1,4.2],[W+5.6,ty1,4.2]],'m-traytop');
  return s}
let GID=0;
function globe(){let s='';const gid='gclip'+(GID++);const q=P(CX,CY,GZ),R=GR*1.2247;
  /* flange + collar back */
  s+=cyl(CX,CY,COL.z0,COL.r0,COL.z1-COL.z0,'m-met-s','m-met-t');
  s+=ann(CX,CY,COL.z2,COL.r1,COL.ri,'m-col-t');
  /* glass back + floor */
  s+=`<clipPath id="${gid}"><circle cx="${f(q[0])}" cy="${f(q[1])}" r="${f(R-.5)}"/></clipPath>`;
  s+=circ(q[0],q[1],R,'m-glass-b');
  s+=`<g clip-path="url(#${gid})">${ell(CX,CY,COL.z2,COL.ri,'m-floor')}<g class="pile">${pileSVG()}</g></g>`;
  /* glass front: sheen */
  s+=`<path class="m-sheen" d="M${f(q[0]-R*.78)} ${f(q[1]-R*.12)}A${f(R*.8)} ${f(R*.8)} 0 0 1 ${f(q[0]-R*.18)} ${f(q[1]-R*.78)}"/>`;
  s+=`<path class="m-sheen thin" d="M${f(q[0]+R*.52)} ${f(q[1]+R*.5)}A${f(R*.74)} ${f(R*.74)} 0 0 0 ${f(q[0]+R*.73)} ${f(q[1]+R*.14)}"/>`;
  s+=`<circle class="m-glint" cx="${f(q[0]-R*.42)}" cy="${f(q[1]-R*.6)}" r="${f(R*.055)}"/>`;
  s+=circ(q[0],q[1],R,'m-glass-o');
  /* collar front (hides the bottom of the globe) */
  const b=INK.hc(CX,CY,COL.z1,COL.r1,24,0,Math.PI),t=INK.hc(CX,CY,COL.z2,COL.r1,24,Math.PI,0);
  s+=path(D(ring([...b,...t],.12)),'m-col-s')+ann(CX,CY,COL.z2,COL.r1,COL.ri,'m-col-t','front');
  s+=path(D(INK.hc(CX,CY,COL.z1+1.6,COL.r1,24,0,Math.PI),false),'il thin');
  /* metal cap + red dome (the hat) + white knob ball */
  s+=cyl(CX,CY,CAPZ-1.2,7.6,2.4,'m-met-s','m-met-t');
  const dq=P(CX,CY,CAPZ+1.2),dr=5.9*1.2247,dry=5.9*.7071;
  s+=`<path class="m-dome" d="M${f(dq[0]-dr)} ${f(dq[1])}A${f(dr)} ${f(dr)} 0 0 1 ${f(dq[0]+dr)} ${f(dq[1])}A${f(dr)} ${f(dry)} 0 0 1 ${f(dq[0]-dr)} ${f(dq[1])}Z"/>`;
  s+=`<path class="m-domegl" d="M${f(dq[0]-dr*.62)} ${f(dq[1]-dr*.28)}A${f(dr*.7)} ${f(dr*.7)} 0 0 1 ${f(dq[0]-dr*.12)} ${f(dq[1]-dr*.72)}"/>`;
  const kq=P(CX,CY,CAPZ+1.2+5.9+1.1);s+=circ(kq[0],kq[1],1.9,'m-ball')+`<circle class="m-glint" cx="${f(kq[0]-.6)}" cy="${f(kq[1]-.7)}" r=".5"/>`;
  return s}
/* scene: machine (+ optional chest next to it) */
const VB={big:[-74,-108,178,160],mini:[-44,-108,92,152]};
function scene(o={}){let s=`<g class="ink-all">`;
  s+=`<g class="m-sh">${shadow()}</g>`;
  if(o.chest)s+=`<g class="chest-sh">${CHEST.shadow(CHEST.SMALL)}</g>`;
  s+=`<g class="mach"><g class="shk">${body()}${globe()}</g></g>`;
  if(o.chest)s+=`<g class="chestg">${CHEST.svg(CHEST.SMALL,0,{pile:o.pile||0})}</g>`;
  s+=`<g class="drop"></g></g>`;
  return s}
return {W,DP,BH,CX,CY,GZ,GR,CAPZ,DIAL,EXIT,CR,FR,PILE,PICK,knob,flap,scene,VB,P};
})();

/* ═════════ 灵感宝箱（v9 第一版造型 · 手绘墨线渲染）═════════
   箱体 + 前后束带 + 红色搭扣；盖子绕后上沿旋转（0° 合上 · 104° 打开），打开时箱口有柔光。 */
const CHEST=(()=>{
const {P,f,poly,line,path,D,pr}=INK;
const BIG={x:0,y:0,z:0,w:104,d:56,h:46,lh:14,lw:1.5};
const SMALL={x:58,y:-3,z:0,w:26,d:14,h:11.5,lh:3.5,lw:.62};
const V=[1,1,1];
function rot(p,y0,zh,a){const c=Math.cos(a),s=Math.sin(a),dy=p[1]-y0,dz=p[2]-zh;return [p[0],y0+dy*c-dz*s,zh+dy*s+dz*c]}
function nrm(a,b,c){const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];return [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]}
function lid(C,deg){const {x,y,z,w,d,h,lh}=C,zh=z+h,a=deg*Math.PI/180,R=p=>rot(p,y,zh,a),k=w/104;
  const v=[[x,y,zh],[x+w,y,zh],[x+w,y+d,zh],[x,y+d,zh],[x,y,zh+lh],[x+w,y,zh+lh],[x+w,y+d,zh+lh],[x,y+d,zh+lh]].map(R);
  const F=[{i:[4,5,6,7],t:'c-top',top:1},{i:[3,2,1,0],t:'c-in'},{i:[3,7,6,2],t:'c-l',front:1},{i:[1,2,6,5],t:'c-r',side:1},{i:[0,1,5,4],t:'c-l'},{i:[0,4,7,3],t:'c-r'}];
  const vis=F.filter(F=>{const n=nrm(v[F.i[0]],v[F.i[1]],v[F.i[2]]);return n[0]*V[0]+n[1]*V[1]+n[2]*V[2]>0.01});
  vis.sort((A,B)=>A.i.reduce((s,q)=>s+v[q][0]+v[q][1]+v[q][2],0)-B.i.reduce((s,q)=>s+v[q][0]+v[q][1]+v[q][2],0));
  let s='';
  vis.forEach(Fc=>{s+=poly(Fc.i.map(q=>v[q]),Fc.t);
    if(Fc.top){[x+w*.22,x+w*.78].forEach(sx=>{s+=poly([[sx-2.6*k,y,zh+lh],[sx+2.6*k,y,zh+lh],[sx+2.6*k,y+d,zh+lh],[sx-2.6*k,y+d,zh+lh]].map(R),'c-strap')})}
    if(Fc.front){const hx=x+w/2;s+=poly([[hx-5*k,y+d,zh+1*k],[hx+5*k,y+d,zh+1*k],[hx+5*k,y+d,zh+lh-1.5*k],[hx-5*k,y+d,zh+lh-1.5*k]].map(R),'c-red');
      [x+w*.22,x+w*.78].forEach(sx=>{s+=poly([[sx-2.6*k,y+d,zh],[sx+2.6*k,y+d,zh],[sx+2.6*k,y+d,zh+lh],[sx-2.6*k,y+d,zh+lh]].map(R),'c-strap')})}
    if(Fc.side){[y+d*.25,y+d*.75].forEach(sy=>{s+=poly([[x+w,sy-2.6*k,zh],[x+w,sy+2.6*k,zh],[x+w,sy+2.6*k,zh+lh],[x+w,sy-2.6*k,zh+lh]].map(R),'c-strap2')})}
  });
  return s}
function mouthXY(C){return P(C.x+C.w/2,C.y+C.d/2,C.z+C.h)}
function bodyBack(C,open){const {x,y,z,w,d,h}=C,t=Math.max(1.2,w*.05),zt=z+h,k=w/104;let s='';
  s+=poly([[x,y,zt],[x+w,y,zt],[x+w,y+d,zt],[x,y+d,zt]],'c-top');
  const inner=[[x+t,y+t,zt],[x+w-t,y+t,zt],[x+w-t,y+d-t,zt],[x+t,y+d-t,zt]];
  s+=poly(inner,'c-cav');
  s+=path(D(pr([[x+t,y+t,zt],[x+w-t,y+t,zt],[x+w-t,y+t,zt-h*.5],[x+t,y+t,zt-h*.5]])),'c-cav2 nst');
  s+=path(D(pr([[x+t,y+t,zt],[x+t,y+d-t,zt],[x+t,y+d-t,zt-h*.5],[x+t,y+t,zt-h*.5]])),'c-cav3 nst');
  const m=mouthXY(C);s+=`<ellipse class="c-glow" cx="${f(m[0])}" cy="${f(m[1]-2*k)}" rx="${f(52*k)}" ry="${f(26*k)}" style="opacity:${open?1:0}"/>`;
  s+=poly(inner,'il nf');
  return s}
function bodyFront(C){const {x,y,z,w,d,h}=C,zt=z+h,k=w/104;let s='';
  s+=poly([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,zt],[x,y+d,zt]],'c-l')+poly([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,zt],[x+w,y,zt]],'c-r');
  [x+w*.22,x+w*.78].forEach(sx=>{s+=poly([[sx-2.6*k,y+d,z],[sx+2.6*k,y+d,z],[sx+2.6*k,y+d,zt],[sx-2.6*k,y+d,zt]],'c-strap')});
  [y+d*.25,y+d*.75].forEach(sy=>{s+=poly([[x+w,sy-2.6*k,z],[x+w,sy+2.6*k,z],[x+w,sy+2.6*k,zt],[x+w,sy-2.6*k,zt]],'c-strap2')});
  const hx=x+w/2;s+=poly([[hx-4.2*k,y+d,zt-h*.42],[hx+4.2*k,y+d,zt-h*.42],[hx+4.2*k,y+d,zt],[hx-4.2*k,y+d,zt]],'c-red');
  const kq=P(hx,y+d,zt-h*.24);s+=`<circle class="c-key" cx="${f(kq[0])}" cy="${f(kq[1])}" r="${f(Math.max(.5,1.3*k))}"/>`;
  s+=line([[x,y+d,z+h*.16],[x+w,y+d,z+h*.16],[x+w,y,z+h*.16]],'il thin');
  return s}
function shadow(C){const {x,y,w,d}=C,e=w*.1;return poly([[x-e*.2,y-e*.2,0],[x+w+e*.6,y-e*.2,0],[x+w+e*.6,y+d+e*1.6,0],[x-e*.2,y+d+e*1.6,0]],'m-shadow')}
/* v0.4.2 · 箱内胶囊堆：数量由数据决定（= 当前标签里还没飞出来的收藏数，最多画 MAXPILE 颗），绝不多画。
   一条确定性的「落下顺序」：第 i 颗落在床面或已有胶囊上（10 个候选点里取最低、且不被前壁挡住的）。床面在箱深一半处，
   随 i 抬高并在中间隆起（大收藏 = 底下还有东西），所以少的几颗躺在箱底靠里，多了逐层堆起越过箱沿；第 13/16/19 颗斜靠在箱沿。
   n 颗 = 前 n 颗，所以加一颗 / 飞走一颗只动最上面那颗，堆不会整体重排。按 x+y+z 由远到近排序。 */
const MAXPILE=24,LEANAT=[13,16,19];
const SEQS=new Map(),PILES=new Map(),cl=v=>v<0?0:v>1?1:v;
function pileSeq(C){const key=C.w+':'+C.d+':'+C.h;if(SEQS.has(key))return SEQS.get(key);
  const {hsh,CAPCOL}=INK;const {x,y,z,w,d,h}=C,k=w/104,t=Math.max(1.2,w*.05),zt=z+h,rc=5.2*k,sd=7.31;
  const x0=x+t+rc*.62,x1=x+w-t-rc*.62,y0=y+t+rc*.62,y1=y+d-t-rc*.62,cx=(x0+x1)/2,cy=(y0+y1)/2;
  const bed=(px,py,i)=>{const u=(px-cx)/((x1-x0)/2),v=(py-cy)/((y1-y0)/2);return zt-h*.5+h*.4*cl((i-4)/14)+rc*4.2*cl((i-7)/12)*Math.max(0,1-u*u*.8)*Math.max(0,1-v*v*.8)};
  const o=[];
  const rest=(px,py,r,i)=>{let zz=bed(px,py,i)+r*.8;for(const c of o){if(c.lean)continue;const dd=Math.hypot(c.x-px,c.y-py),mn=(c.r+r)*.9;if(dd<mn)zz=Math.max(zz,c.z+Math.sqrt(mn*mn-dd*dd))}return zz};
  /* hidden behind the front / right wall? (the line of sight runs along +x,+y,+z) */
  const hidden=(px,py,pz,r)=>pz-r*.25<zt-Math.min(y+d-py,x+w-px);
  for(let i=0;i<MAXPILE;i++){
    const L=LEANAT.indexOf(i);
    if(L>=0){const [fx,fy,dz]=[[.2,1,.35],[1,.32,.42],[.66,1,.5]][L];const px=fx===1?x+w-t*.4:x+t+(w-2*t)*fx,py=fy===1?y+d-t*.4:y+t+(d-2*t)*fy;
      o.push({x:px,y:py,z:zt+rc*dz,r:rc*.95,lean:1,th:-60+L*47,m:.3+L*.08});continue}
    const r=rc*(.92+hsh(i+sd,1.9)*.16);let best=null;
    const sp=1-.42*cl((i-5)/9),nc=i<6?10:5;
    for(let j=0;j<nc;j++){const px=cx+(hsh(i*13+j+sd,3.1)-.5)*(x1-x0)*sp,py=cy+(hsh(i*17+j+sd,7.7)-.5)*(y1-y0)*(.3+.7*sp);const pz=rest(px,py,r,i);
      const sc=pz+(hidden(px,py,pz,r)?h:0)+(i<6?((py-y)/d+(px-x)/w*.5)*rc*1.6:0)+Math.hypot((px-cx)/(x1-x0),(py-cy)/(y1-y0))*rc*1.5*cl((i-6)/10);
      if(!best||sc<best.s)best={x:px,y:py,z:pz,s:sc}}
    o.push({x:best.x,y:best.y,z:best.z,r,th:Math.floor(hsh(best.y+sd,best.x)*360)-180,m:.22+hsh(best.x+1,best.z+sd)*.5})}
  o.forEach((c,i)=>{c.i=i;c.c0=CAPCOL[Math.floor(hsh(i*3.3+sd,i*5.1+1)*CAPCOL.length)]});
  SEQS.set(key,o);return o}
function pileOf(C,n){n=Math.max(0,Math.min(MAXPILE,Math.floor(n||0)));const key=C.w+':'+C.d+':'+C.h+':'+n;if(PILES.has(key))return PILES.get(key);
  const s=pileSeq(C).slice(0,n).sort((a,b)=>(a.x+a.y+a.z)-(b.x+b.y+b.z));PILES.set(key,s);return s}
function pileSVG(C,cols){const arr=Array.isArray(cols)?cols.slice(-MAXPILE):null,n=arr?arr.length:cols;const lw=Math.max(.16,.62*C.w/104);
  return pileOf(C,n).map(c=>{const q=P(c.x,c.y,c.z);return `<g transform="translate(${f(q[0])},${f(q[1])})">${INK.capsule(c.r*1.2247,(arr&&arr[c.i])||c.c0,{th:c.th,m:c.m,lw})}</g>`}).join('')}
/* top of the heap (screen point) — where capsules leave / land; an empty chest uses the cavity */
function pileTop(C,n=0){const k=C.w/104,pl=pileOf(C,n);let zz=C.z+C.h-C.h*.3;for(const c of pl)if(!c.lean)zz=Math.max(zz,c.z+c.r*.6);return P(C.x+C.w/2,C.y+C.d/2,Math.max(zz,C.z+C.h-C.h*.3)+2*k)}
/* full chest; deg = lid angle. The lid leans back behind the pile when open (>88°) and covers it when closing. */
const LIDBACK=88;
const pileOp=deg=>{const v=(deg-24)/36;return v<=0?0:v>=1?1:Math.round(v*100)/100};
function svg(C,deg,o={}){const L=`<g class="clid">${lid(C,deg)}</g>`;const back=deg>LIDBACK;
  return `<g class="chest" style="--lw:${C.lw}"><g class="cbody">${bodyBack(C,deg>20)}</g>${back?L:''}<g class="cpile" style="opacity:${pileOp(deg)}">${pileSVG(C,o.pile||0)}</g><g class="cmouth"></g><g class="cfront">${bodyFront(C)}</g>${back?'':L}</g>`}
/* set the lid angle on a rendered chest and keep the lid / pile paint order right */
function setLid(lidG,C,deg){if(!lidG)return;lidG.innerHTML=lid(C,deg);const p=lidG.parentNode,pile=p&&p.querySelector(':scope>.cpile');if(!pile)return;
  pile.style.opacity=String(pileOp(deg));const back=deg>LIDBACK,isBefore=!!(lidG.compareDocumentPosition(pile)&4);
  if(back&&!isBefore)p.insertBefore(lidG,pile);else if(!back&&isBefore)p.appendChild(lidG)}
return {BIG,SMALL,MAXPILE,svg,lid,setLid,mouthXY,pileTop,pileSVG,shadow,bodyBack};
})();

/* ═════════ 标题栏小图标 v11（v10.2 粗描边等距 · 一处红色）═════════ */
(()=>{const K=Math.cos(Math.PI/6),f=n=>Math.round(n*100)/100;
  const mk=(s,ox,oy)=>{const P=(x,y,z)=>[(x-y)*K*s+ox,(x+y)/2*s-z*s+oy];
    const pp=a=>a.map(p=>{const q=P(...p);return f(q[0])+','+f(q[1])}).join(' ');
    const poly=(a,c)=>`<polygon class="${c}" points="${pp(a)}"/>`;
    const box=(x,y,z,w,d,h,t='')=>poly([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]],'fl '+t)+poly([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],'fr '+t)+poly([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]],'tp '+t);
    return {P,pp,poly,box,s}};
  /* v11.1 · 划一划 / 扭一扭：回到普通线性图标（与 lucide 找图标 / 资源同一套 24 栅格 · 2px 描边 · 圆角端点）
     扁平扭蛋机剪影：玻璃球 + 一枚斜缝胶囊 + 底座 + 出蛋口 */
  /* v11.2 · 扭蛋胶囊线性图标：上下两半（上半球 + 下半碗，中间留一道缝）+ 上半一道高光；24 栅格 · 2px · 圆角端点，与 lucide 同风格 */
  GLYPH_GACHA=`<svg class="gly lic gacha-lic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g transform="rotate(-20 12 12)"><path d="M3.4 11a8.6 8.6 0 0 1 17.2 0z"/><path d="M3.9 13.9a8.6 8.6 0 0 0 16.2 0z"/><path d="M7.8 7.2a4.8 4.8 0 0 1 2.5-1.3"/></g></svg>`;
  /* 宝箱：v9 小宝箱 — 箱体 + 盖 + 红色搭扣（盖子可单独弹起） */
  const c=mk(1.17,9.8,11.1),w=12,d=7.6;   /* v11.1：放大 22% 填满 24 栅格 */let b='';
  b+=c.box(0,0,0,w,d,5.2);
  b+=`<polyline class="ln thin" points="${c.pp([[w*.25,d,0],[w*.25,d,5.2]])}"/><polyline class="ln thin" points="${c.pp([[w*.75,d,0],[w*.75,d,5.2]])}"/>`;
  b+=`<g class="glid">${c.box(0,0,5.2,w,d,2.6,'lid')}</g>`;
  b+=`<polygon class="glatch red" points="${c.pp([[w/2-1.5,d,3],[w/2+1.5,d,3],[w/2+1.5,d,6.9],[w/2-1.5,d,6.9]])}"/>`;
  GLYPH_CASE=`<svg class="gly g9 gcase" viewBox="0 0 24 24">${b}</svg>`;
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

const TAGC=['#e5484d','#3e63dd','#30a46c','#f5a524','#8e4ec6','#12a594','#d6409f','#0090ff','#a18072'];
type Tw = (dur: number, fn: (e: number, t: number) => void, ease?: (t: number) => number) => Promise<void>
const _tween = tween as unknown as Tw
const _sleep = sleep as unknown as (ms: number) => Promise<void>
const _anim = anim as unknown as (el: Element, kf: Keyframe[], o: KeyframeAnimationOptions) => Animation
export { INK, GM, CHEST, TAGC, GLYPH_GACHA, GLYPH_CASE, _tween as tween, _sleep as sleep, _anim as anim, easeIO, easeOut, easeOutBack, clamp01, RM }
