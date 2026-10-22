// Curated UI component libraries (ported from the prototype).
import { S } from './store'

export interface UILib {
  id: string
  name: string
  fw: 'React' | 'Vue'
  eco: string | null
  demo?: boolean
  url: string
  install: string
  zh: string
  en: string
}

export const UIK: [string, string, string][] = [['button','按钮','Button'],['input','输入框','Input'],['switch','开关','Switch'],['select','选择器','Select'],['tabs','标签页','Tabs'],['dialog','对话框','Dialog'],['slider','滑块','Slider'],['checkbox','多选框','Checkbox'],['toast','消息提示','Toast']];
export const ukl = (k: string) => { const x = UIK.find(a => a[0] === k)!; return S.lang === 'en' ? x[2] : `${x[1]} ${x[2]}` }

export const UIL: UILib[] = [
 {id:'shadcn',name:'shadcn/ui',fw:'React',eco:'shadcn/ui',demo:true,url:'https://ui.shadcn.com',install:'npx shadcn@latest init',zh:'复制即用的源码组件，基于 Radix + Tailwind',en:'Copy-paste source components on Radix + Tailwind'},
 {id:'animate',name:'Animate UI',fw:'React',eco:'shadcn/ui',url:'https://animate-ui.com',install:'npx shadcn@latest add …',zh:'带动效的 shadcn 风格组件',en:'Animated shadcn-style components'},
 {id:'magic',name:'Magic UI',fw:'React',eco:'shadcn/ui',url:'https://magicui.design',install:'npx shadcn@latest add …',zh:'落地页动效组件',en:'Animated landing-page components'},
 {id:'aceternity',name:'Aceternity UI',fw:'React',eco:'shadcn/ui',url:'https://ui.aceternity.com',install:'npx shadcn@latest add …',zh:'营销页特效组件',en:'Eye-catching marketing effects'},
 {id:'origin',name:'Origin UI',fw:'React',eco:'shadcn/ui',url:'https://originui.com',install:'npx shadcn@latest add …',zh:'大量 shadcn 风格组件变体',en:'Hundreds of shadcn-style variants'},
 {id:'mantine',name:'Mantine',fw:'React',eco:null,demo:true,url:'https://mantine.dev',install:'npm i @mantine/core @mantine/hooks',zh:'功能全面，自带 hooks、表单和通知',en:'Full-featured, with hooks, forms and notifications'},
 {id:'heroui',name:'HeroUI',fw:'React',eco:null,url:'https://www.heroui.com',install:'npm i @heroui/react',zh:'现代美观，基于 Tailwind（原 NextUI）',en:'Modern and polished, on Tailwind (ex-NextUI)'},
 {id:'antd',name:'Ant Design',fw:'React',eco:null,url:'https://ant.design',install:'npm i antd',zh:'企业级中后台标准',en:'The enterprise admin standard'},
 {id:'mui',name:'MUI',fw:'React',eco:null,url:'https://mui.com',install:'npm i @mui/material @emotion/react @emotion/styled',zh:'Material Design 的 React 实现',en:'Material Design for React'},
 {id:'radix',name:'Radix Themes',fw:'React',eco:null,url:'https://www.radix-ui.com/themes',install:'npm i @radix-ui/themes',zh:'Radix 官方预设主题组件',en:'Pre-styled components from Radix'},
 {id:'shadcnvue',name:'shadcn-vue',fw:'Vue',eco:'shadcn-vue',url:'https://www.shadcn-vue.com',install:'npx shadcn-vue@latest init',zh:'shadcn/ui 的 Vue 移植',en:'The Vue port of shadcn/ui'},
 {id:'inspira',name:'Inspira UI',fw:'Vue',eco:'shadcn-vue',url:'https://inspira-ui.com',install:'复制源码 / copy source',zh:'Vue 版动效组件',en:'Animated components for Vue'},
 {id:'element',name:'Element Plus',fw:'Vue',eco:null,demo:true,url:'https://element-plus.org',install:'npm i element-plus',zh:'国内最常用的 Vue 3 中后台组件库',en:'The most used Vue 3 admin library in China'},
 {id:'naive',name:'Naive UI',fw:'Vue',eco:null,demo:true,url:'https://www.naiveui.com',install:'npm i -D naive-ui',zh:'TypeScript 友好，主题可深度定制',en:'TypeScript-friendly, deeply themeable'},
 {id:'nuxtui',name:'Nuxt UI',fw:'Vue',eco:null,url:'https://ui.nuxt.com',install:'npm i @nuxt/ui',zh:'Nuxt 官方组件库，基于 Tailwind',en:'Official Nuxt library, on Tailwind'},
 {id:'vuetify',name:'Vuetify',fw:'Vue',eco:null,url:'https://vuetifyjs.com',install:'npm i vuetify',zh:'Material Design 的 Vue 实现',en:'Material Design for Vue'},
 {id:'primevue',name:'PrimeVue',fw:'Vue',eco:null,url:'https://primevue.org',install:'npm i primevue',zh:'组件数量多，主题丰富',en:'Huge component set, many themes'},
 {id:'antdv',name:'Ant Design Vue',fw:'Vue',eco:null,url:'https://antdv.com',install:'npm i ant-design-vue',zh:'Ant Design 的 Vue 实现',en:'Ant Design for Vue'},
];
export const UI = (id: string) => UIL.find(l => l.id === id)!
export const DEMOS = UIL.filter(l => l.demo)
/** Card screenshots for the libraries with a live demo (public/snap/*.jpg). */
export const SNAP: Record<string, string> = Object.fromEntries(DEMOS.map(l => [l.id, `snap/${l.id}.jpg`]))

export const SYN: Record<string, string> = {button:'按钮 button btn',input:'输入框 输入 文本框 input textfield',switch:'开关 switch toggle',select:'选择器 下拉 下拉框 select dropdown combobox',tabs:'标签页 选项卡 tabs tab',dialog:'对话框 弹窗 弹框 模态框 dialog modal popup',slider:'滑块 滑动条 slider range',checkbox:'多选框 复选框 勾选 checkbox',toast:'消息提示 消息 提示 通知 toast notification message snackbar'};
export const compMatch = (q: string) => !q
  ? []
  : Object.keys(SYN).filter(k => SYN[k].split(' ').some(w => w === q || (q.length >= 2 && w.startsWith(q)) || (/[\u4e00-\u9fa5]/.test(q) && w.includes(q))))
export const udesc = (l: UILib) => (S.lang === 'en' ? l.en : l.zh)
