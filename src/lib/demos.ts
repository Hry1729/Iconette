// @ts-nocheck
// Live demo documents for the component-library previews, ported verbatim from the v8.1 prototype.
// Each returns a full HTML document rendered in a sandboxed srcdoc iframe; the libraries themselves
// load from public CDNs (jsdelivr / esm.sh / tailwind), so previews need a network connection.
import { UI, UIK, ukl } from './ui-libs'
import d2common from '../demos/d2-common.txt?raw'
import d2css from '../demos/d2-css.txt?raw'
import dashShadcn from '../demos/dash-shadcn.txt?raw'
import dashMantine from '../demos/dash-mantine.txt?raw'
import dashElementTpl from '../demos/dash-element-tpl.txt?raw'
import dashNaiveTpl from '../demos/dash-naive-tpl.txt?raw'
import dashVue from '../demos/dash-vue.txt?raw'

const BLOCKS = { 'd2-common': d2common, 'd2-css': d2css, 'dash-shadcn': dashShadcn, 'dash-mantine': dashMantine, 'dash-element-tpl': dashElementTpl, 'dash-naive-tpl': dashNaiveTpl, 'dash-vue': dashVue }
const BK = id => BLOCKS[id] || ''
const CDN = 'https://cdn.jsdelivr.net/npm/'
const LABS = () => JSON.stringify(Object.fromEntries(UIK.map(([k]) => [k, ukl(k)])))

const DOC_CSS=`html,body{margin:0;font:13px -apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans CJK SC",sans-serif;background:transparent;overflow:hidden}
.g{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:1px}
.single .g{grid-template-columns:1fr}
.c{position:relative;height:130px;background:#fff;border:1px solid #ececec;border-radius:12px;display:flex;align-items:center;justify-content:center}
.single .c{height:calc(100vh - 4px)}.single .lb{display:none}html:has(.single),body.single{height:100%}
.lb{position:absolute;left:12px;top:9px;font-size:11px;color:#a1a1aa;pointer-events:none;letter-spacing:.2px}
.in{display:flex;align-items:center;gap:8px}
html:has(.dashb),.dashb{height:100%}
.dash{display:flex;height:calc(100vh - 2px);background:#fff;border:1px solid #ececec;border-radius:12px;overflow:hidden;box-sizing:border-box;text-align:left}
.dash aside{width:148px;flex:none;border-right:1px solid #f0f0f0;background:#fafafa;padding:12px 8px;box-sizing:border-box;display:flex;flex-direction:column;gap:2px}
.dash .brand{font-weight:700;font-size:14px;padding:2px 10px 12px}
.dash main{flex:1;min-width:0;padding:12px 16px;display:flex;flex-direction:column;gap:12px;overflow:hidden;box-sizing:border-box}
.dash header{display:flex;align-items:center;gap:8px}.dash header b{font-size:15px}
.dash .sp{flex:1}.dash .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.dash .lt{font-size:12px;color:#909399}.dash .tc{flex:1;min-height:0;overflow:hidden}
.m{border-right:0!important;--el-menu-bg-color:transparent;--el-menu-item-height:36px}.el-card{--el-card-padding:12px}.el-tabs__header{margin-bottom:6px!important}`;
const ROWSJ=JSON.stringify([{id:'#1024',name:'张伟',st:'已完成',t:'success',on:true},{id:'#1025',name:'李娜',st:'进行中',t:'warning',on:true},{id:'#1026',name:'王芳',st:'进行中',t:'warning',on:false},{id:'#1027',name:'陈杰',st:'已取消',t:'info',on:false}]);
/* Vue libraries: Element Plus / Naive UI (real packages from CDN) */
const VT={
 element:{button:`<el-button type="primary">主要</el-button><el-button>默认</el-button>`,
  input:`<el-input v-model="s.text" placeholder="请输入" clearable style="width:180px"/>`,
  switch:`<el-switch v-model="s.on"/>`,
  select:`<el-select v-model="s.sel" placeholder="选择" style="width:160px"><el-option v-for="o in opts" :key="o" :label="o" :value="o"/></el-select>`,
  tabs:`<el-tabs v-model="s.tab" style="width:220px"><el-tab-pane label="账户" name="a">账户设置</el-tab-pane><el-tab-pane label="密码" name="b">修改密码</el-tab-pane></el-tabs>`,
  dialog:`<el-button @click="s.dlg=true">打开对话框</el-button><el-dialog v-model="s.dlg" title="提示" width="300" align-center><span>这是一个对话框</span><template #footer><el-button @click="s.dlg=false">取消</el-button><el-button type="primary" @click="s.dlg=false">确定</el-button></template></el-dialog>`,
  slider:`<el-slider v-model="s.val" style="width:180px"/>`,
  checkbox:`<el-checkbox-group v-model="s.chk"><el-checkbox value="A">A</el-checkbox><el-checkbox value="B">B</el-checkbox></el-checkbox-group>`,
  toast:`<el-button @click="msg">弹出消息</el-button>`},
 naive:{button:`<n-space><n-button type="primary">主要</n-button><n-button>默认</n-button></n-space>`,
  input:`<n-input v-model:value="s.text" placeholder="请输入" clearable style="width:180px"/>`,
  switch:`<n-switch v-model:value="s.on"/>`,
  select:`<n-select v-model:value="s.sel" :options="nopts" placeholder="选择" style="width:160px"/>`,
  tabs:`<n-tabs v-model:value="s.tab" type="line" style="width:220px"><n-tab-pane name="a" tab="账户">账户设置</n-tab-pane><n-tab-pane name="b" tab="密码">修改密码</n-tab-pane></n-tabs>`,
  dialog:`<n-button @click="s.dlg=true">打开对话框</n-button><n-modal v-model:show="s.dlg" preset="dialog" title="提示" content="这是一个对话框" positive-text="确定" negative-text="取消" style="width:300px"/>`,
  slider:`<n-slider v-model:value="s.val" style="width:180px"/>`,
  checkbox:`<n-checkbox-group v-model:value="s.chk"><n-space><n-checkbox value="A" label="A"/><n-checkbox value="B" label="B"/></n-space></n-checkbox-group>`,
  toast:`<n-button @click="msg">弹出消息</n-button>`}};
function vueDoc(lib,keys){const el=lib==='element';
  const head=el?`<link rel="stylesheet" href="${CDN}element-plus@2/dist/index.css"><script src="${CDN}vue@3/dist/vue.global.prod.js"><\/script><script src="${CDN}element-plus@2/dist/index.full.min.js"><\/script><script src="${CDN}element-plus@2/dist/locale/zh-cn.min.js"><\/script>`
    :`<script src="${CDN}vue@3/dist/vue.global.prod.js"><\/script><script src="${CDN}naive-ui@2/dist/index.prod.js"><\/script>`;
  const labs=JSON.parse(LABS());const isD=keys==='dash';
  if(isD)return `<!doctype html><html><head><meta charset="utf-8">${head}<style>${DOC_CSS}${BK('d2-css')}</style></head><body class="dashb"><div id="app"></div><script type="text/x-template" id="tpl">${BK('dash-'+lib+'-tpl')}<\/script><script>${BK('d2-common')}<\/script><script>${BK('dash-vue')}<\/script></body></html>`;
  const tpl=isD?BK('dash-'+lib):'<div class="g">'+keys.map(k=>`<div class="c"><span class="lb">${labs[k]}</span><div class="in">${VT[lib][k]}</div></div>`).join('')+'</div>';
  const msg=el?`ElementPlus.ElMessage({message:'操作成功',type:'success'})`:`(window.__m||(window.__m=naive.createDiscreteApi(['message']).message)).success('操作成功')`;
  return `<!doctype html><html><head><meta charset="utf-8">${head}<style>${DOC_CSS}</style></head><body class="${isD?'dashb':keys.length===1?'single':''}"><div id="app"></div><script>
const M4=['概览','订单','用户','设置'];const opts=['选项一','选项二','选项三'];
Vue.createApp({template:${JSON.stringify(tpl)},setup(){const s=Vue.reactive({text:'',q:'',menu:'0',on:true,sel:null,tab:'a',dlg:false,val:40,chk:['A']});
 const rows=Vue.reactive(${ROWSJ});const list=Vue.computed(()=>rows.filter(r=>s.tab==='a'||r.st==='进行中'));
 const cols=typeof naive==='undefined'?[]:[{title:'订单号',key:'id',width:80},{title:'客户',key:'name'},{title:'状态',key:'st',render:r=>Vue.h(naive.NTag,{type:r.t==='info'?'default':r.t,size:'small',bordered:false},{default:()=>r.st})},{title:'启用',key:'on',width:70,render:r=>Vue.h(naive.NSwitch,{value:r.on,size:'small','onUpdate:value':v=>r.on=v})}];
 return{s,M4,rows,list,cols,menuOpts:M4.map((l,i)=>({label:l,key:String(i)})),opts,nopts:opts.map(x=>({label:x,value:x})),msg(){${msg}}}}}).use(${el?'ElementPlus':'naive'}).mount('#app');
<\/script></body></html>`}

/* React libraries: shadcn/ui (Radix + Tailwind, shadcn source styles) / Mantine */
const IMAP=`<script type="importmap">{"imports":{"react":"https://esm.sh/react@18.3.1","react/":"https://esm.sh/react@18.3.1/","react-dom":"https://esm.sh/react-dom@18.3.1","react-dom/":"https://esm.sh/react-dom@18.3.1/"}}<\/script>`;
const X='?external=react,react-dom';
function reactDoc(lib,keys){
  const common=`import React from 'react';import {createRoot} from 'react-dom/client';import htm from 'https://esm.sh/htm@3';`;
  const tail=`const html=htm.bind(React.createElement);const LAB=${LABS()};const KEYS=${JSON.stringify(keys)};`;
  let head='',body='';const isD=keys==='dash';
  const imp=lib==='mantine'?`import * as M from 'https://esm.sh/@mantine/core@7${X}';import {Notifications,notifications} from 'https://esm.sh/@mantine/notifications@7${X}';`
   :['tabs@1:Tb','dialog@1:Dg','checkbox@1:Cb','dropdown-menu@2:Dm','select@2:Sl','toggle-group@1:Tg'].map(x=>{const [p,v]=x.split(':');return `import * as ${v} from 'https://esm.sh/@radix-ui/react-${p}${X}';`}).join('')+`import {Toaster,toast} from 'https://esm.sh/sonner@1${X}';`;
  const dbody=`${common}${imp}const html=htm.bind(React.createElement);\n`+(isD?BK('dash-'+lib):'');
  if(lib==='mantine'){
    head=`<link rel="stylesheet" href="${CDN}@mantine/core@7/styles.css"><link rel="stylesheet" href="${CDN}@mantine/notifications@7/styles.css">`;
    body=`${common}import * as M from 'https://esm.sh/@mantine/core@7${X}';import {Notifications,notifications} from 'https://esm.sh/@mantine/notifications@7${X}';${tail}
const {Button,TextInput,Switch,Select,Tabs,Modal,Slider,Checkbox,Group,MantineProvider}=M;
function Dlg(){const [o,set]=React.useState(false);return html\`<\${Button} variant="default" onClick=\${()=>set(true)}>打开对话框<//><\${Modal} opened=\${o} onClose=\${()=>set(false)} title="提示" centered size="xs">这是一个对话框<\${Group} justify="flex-end" mt="md" gap="xs"><\${Button} variant="default" onClick=\${()=>set(false)}>取消<//><\${Button} onClick=\${()=>set(false)}>确定<//><//><//>\`}
const C={button:()=>html\`<\${Group} gap="xs"><\${Button}>主要<//><\${Button} variant="default">默认<//><//>\`,
input:()=>html\`<\${TextInput} placeholder="请输入" w=\${180}/>\`,
switch:()=>html\`<\${Switch} defaultChecked/>\`,
select:()=>html\`<\${Select} placeholder="选择" data=\${['选项一','选项二','选项三']} w=\${160}/>\`,
tabs:()=>html\`<\${Tabs} defaultValue="a" w=\${220}><\${Tabs.List}><\${Tabs.Tab} value="a">账户<//><\${Tabs.Tab} value="b">密码<//><//><\${Tabs.Panel} value="a" pt="xs">账户设置<//><\${Tabs.Panel} value="b" pt="xs">修改密码<//><//>\`,
dialog:Dlg,
slider:()=>html\`<\${Slider} defaultValue=\${40} w=\${180}/>\`,
checkbox:()=>html\`<\${Group}><\${Checkbox} defaultChecked label="A"/><\${Checkbox} label="B"/><//>\`,
toast:()=>html\`<\${Button} variant="default" onClick=\${()=>notifications.show({title:'已保存',message:'操作成功'})}>弹出消息<//>\`};
const App=()=>html\`<\${MantineProvider}><\${Notifications} position="top-center"/><div className="g">\${KEYS.map(k=>html\`<div className="c" key=\${k}><span className="lb">\${LAB[k]}</span><div className="in"><\${C[k]}/></div></div>\`)}</div><//>\`;
createRoot(document.getElementById('app')).render(html\`<\${App}/>\`);`;
  }else{
    const col=n=>`'hsl(var(--${n}) / <alpha-value>)'`;
    head=`<script src="https://cdn.tailwindcss.com"><\/script><script>tailwind.config={theme:{extend:{colors:{border:${col('border')},input:${col('input')},ring:${col('ring')},background:${col('background')},foreground:${col('foreground')},
primary:{DEFAULT:${col('primary')},foreground:${col('primary-foreground')}},secondary:{DEFAULT:${col('secondary')},foreground:${col('secondary-foreground')}},muted:{DEFAULT:${col('muted')},foreground:${col('muted-foreground')}},accent:{DEFAULT:${col('accent')},foreground:${col('accent-foreground')}},popover:{DEFAULT:${col('popover')},foreground:${col('popover-foreground')}}},
borderRadius:{lg:'var(--radius)',md:'calc(var(--radius) - 2px)',sm:'calc(var(--radius) - 4px)'}}}}<\/script>
<style>:root{--background:0 0% 100%;--foreground:240 10% 3.9%;--primary:240 5.9% 10%;--primary-foreground:0 0% 98%;--secondary:240 4.8% 95.9%;--secondary-foreground:240 5.9% 10%;--muted:240 4.8% 95.9%;--muted-foreground:240 3.8% 46.1%;--accent:240 4.8% 95.9%;--accent-foreground:240 5.9% 10%;--popover:0 0% 100%;--popover-foreground:240 10% 3.9%;--border:240 5.9% 90%;--input:240 5.9% 90%;--ring:240 5.9% 10%;--radius:.5rem}body *{border-color:hsl(var(--border))}body{color:hsl(var(--foreground))}</style>`;
    body=`${common}import * as Sw from 'https://esm.sh/@radix-ui/react-switch@1${X}';import * as Se from 'https://esm.sh/@radix-ui/react-select@2${X}';import * as Tb from 'https://esm.sh/@radix-ui/react-tabs@1${X}';
import * as Dg from 'https://esm.sh/@radix-ui/react-dialog@1${X}';import * as Sl from 'https://esm.sh/@radix-ui/react-slider@1${X}';import * as Cb from 'https://esm.sh/@radix-ui/react-checkbox@1${X}';import {Toaster,toast} from 'https://esm.sh/sonner@1${X}';${tail}
const cn=(...a)=>a.filter(Boolean).join(' ');
const Btn=({v,className,...p})=>html\`<button ...\${p} className=\${cn('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-4 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',v==='outline'?'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground':'bg-primary text-primary-foreground shadow hover:bg-primary/90',className)}/>\`;
const chev=html\`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style=\${{opacity:.5}}><path d="m6 9 6 6 6-6"/></svg>\`;
const check=html\`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>\`;
const opts=['选项一','选项二','选项三'];
const C={button:()=>html\`<div className="flex gap-2"><\${Btn}>主要<//><\${Btn} v="outline">默认<//></div>\`,
input:()=>html\`<input placeholder="请输入" className="flex h-9 w-48 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"/>\`,
switch:()=>html\`<\${Sw.Root} defaultChecked className="peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"><\${Sw.Thumb} className="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"/><//>\`,
select:()=>html\`<\${Se.Root}><\${Se.Trigger} className="flex h-9 w-40 items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring data-[placeholder]:text-muted-foreground"><\${Se.Value} placeholder="选择"/><\${Se.Icon}>\${chev}<//><//><\${Se.Portal}><\${Se.Content} position="popper" sideOffset=\${4} className="relative z-50 w-40 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"><\${Se.Viewport} className="p-1">\${opts.map(o=>html\`<\${Se.Item} key=\${o} value=\${o} className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none data-[highlighted]:bg-accent"><\${Se.ItemText}>\${o}<//><//>\`)}<//><//><//><//>\`,
tabs:()=>html\`<\${Tb.Root} defaultValue="a" className="w-56"><\${Tb.List} className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">\${[['a','账户'],['b','密码']].map(([v,l])=>html\`<\${Tb.Trigger} key=\${v} value=\${v} className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow">\${l}<//>\`)}<//><\${Tb.Content} value="a" className="mt-2 text-sm">账户设置<//><\${Tb.Content} value="b" className="mt-2 text-sm">修改密码<//><//>\`,
dialog:()=>html\`<\${Dg.Root}><\${Dg.Trigger} asChild><\${Btn} v="outline">打开对话框<//><//><\${Dg.Portal}><\${Dg.Overlay} className="fixed inset-0 z-50 bg-black/60"/><\${Dg.Content} className="fixed left-1/2 top-1/2 z-50 grid w-[300px] -translate-x-1/2 -translate-y-1/2 gap-3 rounded-lg border bg-background p-5 shadow-lg"><\${Dg.Title} className="text-base font-semibold">提示<//><\${Dg.Description} className="text-sm text-muted-foreground">这是一个对话框<//><div className="flex justify-end gap-2"><\${Dg.Close} asChild><\${Btn} v="outline">取消<//><//><\${Dg.Close} asChild><\${Btn}>确定<//><//></div><//><//><//>\`,
slider:()=>html\`<\${Sl.Root} defaultValue=\${[40]} max=\${100} step=\${1} className="relative flex w-44 touch-none select-none items-center"><\${Sl.Track} className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20"><\${Sl.Range} className="absolute h-full bg-primary"/><//><\${Sl.Thumb} className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"/><//>\`,
checkbox:()=>html\`<div className="flex gap-4">\${['A','B'].map((l,i)=>html\`<label key=\${l} className="flex items-center gap-2 text-sm"><\${Cb.Root} defaultChecked=\${i===0} className="peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"><\${Cb.Indicator} className="flex items-center justify-center text-current">\${check}<//><//>\${l}</label>\`)}</div>\`,
toast:()=>html\`<\${Btn} v="outline" onClick=\${()=>toast('已保存',{description:'操作成功'})}>弹出消息<//>\`};
const App=()=>html\`<\${React.Fragment}><\${Toaster} position="top-center"/><div className="g">\${KEYS.map(k=>html\`<div className="c" key=\${k}><span className="lb">\${LAB[k]}</span><div className="in"><\${C[k]}/></div></div>\`)}</div><//>\`;
createRoot(document.getElementById('app')).render(html\`<\${App}/>\`);`;
  }
  if(isD)return `<!doctype html><html><head><meta charset="utf-8">${IMAP}${head}<style>${DOC_CSS}${BK('d2-css')}</style></head><body class="dashb"><div id="app"></div><script>${BK('d2-common')}<\/script><script type="module">${dbody}<\/script></body></html>`;
  return `<!doctype html><html><head><meta charset="utf-8">${IMAP}${head}<style>${DOC_CSS}</style></head><body class="${isD?'dashb':keys.length===1?'single':''}"><div id="app"></div><script type="module">${body}<\/script></body></html>`}
export const demoDoc=(lib,keys)=>UI(lib).fw==='Vue'?vueDoc(lib,keys):reactDoc(lib,keys);
