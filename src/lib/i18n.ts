import { S } from './store'

// UI strings (ported from the prototype; some keys are for modes not built yet).
export const L: Record<'zh' | 'en', Record<string, string>> ={zh:{snapSoon:'预览制作中',ltDash:'示例面板',ltGrid:'全部组件',cmpN:'{n} 个库对比',fSwipeUI:'<kbd>→</kbd> 收藏 <kbd>←</kbd> 跳过 <kbd>↑</kbd> 去组件库 <kbd>Z</kbd> 撤回 · 卡片里的组件可以直接操作，拖动卡片标题来划',tUI:'组件库',phUI:'搜索组件或组件库，如：弹窗、tabs',eco:'生态',solo:'独立组件库',livePv:'可实时预览',soon:'即将收录',soonSub:'这个库的实时预览还没做，先点「官网」看看',allUI:'全部组件库',copyInstall:'复制安装命令',site:'官网',dIcons:'图标库',dComp:'组件',dLib:'组件库',toLib:'去组件库',noUI:'还没有收藏组件',noUISub:'在划一划里右滑组件或组件库就会出现在这里',fSetsUI:'点卡片进入组件库，组件都可以直接操作',mSets:'资源',phSets:'搜索图标库',shuffle:'换一批',zhMap:'「{a}」按 {b} 搜索',zhNone:'还认不出「{a}」，换个说法或试试英文',iconColor:'图标颜色（整页）',fSets:'点卡片打开 · ♥ 收藏图标库 · <kbd>⌘1 2 3 4</kbd> 切换模式',mSearch:'找图标',swipe:'划一划',mFav:'收藏',ph:'搜索图标',phSet:'在 {n} 中搜索',phFav:'在收藏中搜索',all:'全部',copy:'复制',copied:'已复制',
 hello:'找个图标',helloSub:'27 万个开源图标，搜索、选中、回车复制',none:'没有找到',results:'{n} 个结果',sets:'{n} 个图标集',
 color:'颜色',size:'尺寸',format:'复制格式',theme:'外观',light:'浅色',dark:'深色',sys:'跟随系统',today:'今日推荐',pngC:'PNG 图片',lang:'语言',clickCopy:'单击即复制',quick:'速取窗口',
 tIcons:'图标',tSets:'图标库',tRecent:'最近',newFolder:'新建分组',folderName:'分组名称',ungrouped:'全部图标',
 noFavIcons:'还没有收藏图标',noFavIconsSub:'选中一个图标按 F，或点详情条上的 ♥',noSets:'还没有收藏图标库',noSetsSub:'去「划一划」右滑几张试试',noRecent:'还没有复制过图标',clear:'清空',
 icons:'{n} 个图标',seen:'{a} / {b}',skip:'跳过',like:'收藏',open:'打开',undo:'撤回',doneDeck:'都划完了',doneDeckSub:'换个筛选条件，或者重新开始',restart:'重新开始',
 likedSet:'已收藏 {n}',unlikedSet:'已取消收藏',favd:'已收藏',unfavd:'已取消收藏',other:'其他风格 · {n}',noOther:'常用图标库里没有同名图标',
 moveTo:'放进分组',filter:'筛选',fColor:'颜色',fAny:'不限',fMono:'单色',fMulti:'彩色',fCat:'分类',fLic:'仅看可商用的许可',reset:'重置',
 copyClose:'复制并关闭',quickHint:'在任何应用里按 ⌥ Space 唤起',dragged:'已拖出 {n}.svg',
 fSearch:'<kbd>/</kbd> 搜索 <kbd>←→</kbd> 选择 <kbd>↵</kbd> 复制 <kbd>F</kbd> 收藏 · 图标可直接拖出 · <kbd>⌥ Space</kbd> 速取窗口',
 fSwipe:'<kbd>→</kbd> 收藏 <kbd>←</kbd> 跳过 <kbd>↑</kbd> 打开 <kbd>R</kbd> 换一批图标 <kbd>Z</kbd> 撤回 · 也可以直接拖动卡片',
 fFav:'<kbd>↵</kbd> 复制 <kbd>F</kbd> 取消收藏 · <kbd>⌘1 2 3 4</kbd> 切换模式'},
en:{snapSoon:'Preview coming',ltDash:'Sample dashboard',ltGrid:'Components',cmpN:'{n} libraries side by side',fSwipeUI:'<kbd>→</kbd> save <kbd>←</kbd> skip <kbd>↑</kbd> open library <kbd>Z</kbd> undo · components are interactive; drag the card by its title',tUI:'UI libraries',phUI:'Search components or libraries, e.g. dialog',eco:'ecosystem',solo:'Standalone',livePv:'Live preview',soon:'Coming soon',soonSub:'Live preview not ready yet; open the site for now',allUI:'All libraries',copyInstall:'Copy install',site:'Site',dIcons:'Icon sets',dComp:'Components',dLib:'Libraries',toLib:'Open library',noUI:'No saved components',noUISub:'Swipe right on a component or library to save it',fSetsUI:'Click a card to open; every component is interactive',mSets:'Library',phSets:'Search sets',shuffle:'Shuffle',zhMap:'「{a}」→ {b}',zhNone:'Unknown word 「{a}」',iconColor:'Icon color (whole page)',fSets:'Click a card to open · ♥ to save · <kbd>⌘1 2 3 4</kbd> switch mode',mSearch:'Search',swipe:'Swipe',mFav:'Saved',ph:'Search icons',phSet:'Search in {n}',phFav:'Search saved',all:'All',copy:'Copy',copied:'Copied',
 hello:'Find an icon',helloSub:'270k open-source icons. Search, pick, press Enter.',none:'Nothing found',results:'{n} results',sets:'{n} sets',
 color:'Color',size:'Size',format:'Copy format',theme:'Appearance',light:'Light',dark:'Dark',sys:'System',today:'Today\'s pick',pngC:'PNG image',lang:'Language',clickCopy:'Click to copy',quick:'Quick window',
 tIcons:'Icons',tSets:'Sets',tRecent:'Recent',newFolder:'New group',folderName:'Group name',ungrouped:'All icons',
 noFavIcons:'No saved icons yet',noFavIconsSub:'Select an icon and press F',noSets:'No saved sets yet',noSetsSub:'Swipe right on a few in Swipe',noRecent:'Nothing copied yet',clear:'Clear',
 icons:'{n} icons',seen:'{a} / {b}',skip:'Skip',like:'Save',open:'Open',undo:'Undo',doneDeck:'All swiped',doneDeckSub:'Change the filter or start over',restart:'Start over',
 likedSet:'Saved {n}',unlikedSet:'Removed',favd:'Saved',unfavd:'Removed',other:'Other styles · {n}',noOther:'No same-name icon in your sets',
 moveTo:'Add to group',filter:'Filter',fColor:'Color',fAny:'Any',fMono:'Mono',fMulti:'Multicolor',fCat:'Category',fLic:'Commercial-friendly only',reset:'Reset',
 copyClose:'copy & close',quickHint:'Press ⌥ Space in any app',dragged:'Dragged {n}.svg',
 fSearch:'<kbd>/</kbd> search <kbd>←→</kbd> move <kbd>↵</kbd> copy <kbd>F</kbd> save · drag icons out · <kbd>⌥ Space</kbd> quick window',
 fSwipe:'<kbd>→</kbd> save <kbd>←</kbd> skip <kbd>↑</kbd> open <kbd>R</kbd> shuffle <kbd>Z</kbd> undo · or drag the card',
 fFav:'<kbd>↵</kbd> copy <kbd>F</kbd> unsave · <kbd>⌘1 2 3</kbd> switch mode'}};

// Desktop-only strings (not in the prototype).
Object.assign(L.zh, { delFolder: '删除分组', closeTray: '关闭窗口时留在托盘', autostart: '开机启动', showMain: '显示主窗口', quitApp: '退出', quickOpen: '打开速取窗口' })
Object.assign(L.en, { delFolder: 'Delete group', closeTray: 'Keep running in tray on close', autostart: 'Launch at login', showMain: 'Show main window', quitApp: 'Quit', quickOpen: 'Open quick window' })

export function t(k: string, v: Record<string, string | number> = {}): string {
  return (L[S.lang]?.[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => String(v[x] ?? ''))
}
