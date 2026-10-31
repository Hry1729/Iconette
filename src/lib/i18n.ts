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
Object.assign(L.zh, { delFolder: '删除分组', dragHint: '拖出为 SVG 文件', closeTray: '关闭窗口时留在托盘', autostart: '开机启动', showMain: '显示主窗口', quitApp: '退出', quickOpen: '打开速取窗口' })
Object.assign(L.en, { delFolder: 'Delete group', dragHint: 'Drag out as an SVG file', closeTray: 'Keep running in tray on close', autostart: 'Launch at login', showMain: 'Show main window', quitApp: 'Quit', quickOpen: 'Open quick window' })

export function t(k: string, v: Record<string, string | number> = {}): string {
  return (L[S.lang]?.[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => String(v[x] ?? ''))
}

// v0.2 redesign strings.
Object.assign(L.zh, {
  hello: '找个图标', helloSub: '搜索、选中、回车复制 {f}', ph: '搜索图标，例如 箭头', stIcons: '开源图标', stSets: '图标集', stCopy: '回车即复制',
  hot: '热门', kSel: '选择', kCopy: '复制 {f}', kTab: '切换范围', kAny: '随处聚焦', recentT: '最近复制', allHist: '全部历史 →', recentNone: '复制过的图标会出现在这里',
  todayIcon: '今日图标', copyF: '复制 {f}', resN: '{n} 个结果', resSets: '{n} 个图标集', stLine: '线性', stFill: '填充', stDuo: '双色', stTip: '再点一次显示全部风格',
  allSets: '全部图标集', nSets: '{n} 个图标集', pinnedL: '已固定 · 拖动排序', searchSets: '搜索 {n} 个图标集…', matchN: '{n} 个匹配', pin: '固定', pinned: '已固定',
  addSet: '添加图标集', addSetPh: '输入图标集名称，回车固定…', styleNone: '这个范围里没有「{s}」风格的结果', copyName: '名称', save: '收藏', browseSet: '浏览整套',
  phSetsN: '搜索 {n} 个图标库：名称、作者或风格', phUIN: '搜索 {n} 个组件库：React、Vue、弹窗…', sortHot: '热门', sortName: '名称', back: '返回',
  vCards: '卡片', vGacha: '扭蛋', dChest: '我的宝箱', keepS: '收下', skipS: '跳过', combo: '连击 ×{n}', chestKeep: '留着', chestOut: '移出', movedOut: '已移出宝箱',
  chestDeckNone: '宝箱里还没有图标库或组件库', gFig: '图标扭蛋机', stock: '库存', gToday: '今日', gKept: '已收下', crank: '摇杆', mei: '枚',
  gHint: '拖动摇杆转一圈 · <kbd>Space</kbd> 拉一下 · <kbd>→</kbd> 收下 · <kbd>←</kbd> 放回', gTitle: '转一圈，<br>开一枚{k}',
  gDesc: '每枚胶囊里装着一个随机的{k}。喜欢就收进宝箱，不喜欢就放回机器。', pull: '拉一下', newCap: '新胶囊 · {k}', putBack: '放回', keepIt: '收下', keptMsg: '{n} 已收进宝箱',
  kSet: '图标集', kComp: '组件', kLib: '组件库', gEmpty: '机器空了，换个牌堆或重新开始', cFig: '灵感宝箱', chestT: '你的灵感宝箱', closeChest: '合上宝箱', openChest: '打开宝箱',
  chestSum: '已收 <b>{n}</b> 件 · 图标 <b>{a}</b> · 图标集 <b>{b}</b> · 组件库 <b>{c}</b>', favd: '已收进灵感宝箱', likedSet: '{n} 已收进宝箱', mFav: '收藏', chestTip: '灵感宝箱',
  filterN: '筛选', minimize: '最小化', maximize: '最大化', close: '关闭',
})
Object.assign(L.en, {
  hello: 'Find an icon', helloSub: 'Search, pick, press Enter to copy {f}', ph: 'Search icons, e.g. arrow', stIcons: 'open-source icons', stSets: 'sets', stCopy: 'Enter to copy',
  hot: 'Trending', kSel: 'move', kCopy: 'copy {f}', kTab: 'scope', kAny: 'focus anywhere', recentT: 'Recently copied', allHist: 'History →', recentNone: 'Icons you copy show up here',
  todayIcon: 'ICON OF THE DAY', copyF: 'Copy {f}', resN: '{n} results', resSets: '{n} sets', stLine: 'Outline', stFill: 'Filled', stDuo: 'Duotone', stTip: 'Click again to show every style',
  allSets: 'All icon sets', nSets: '{n} sets', pinnedL: 'Pinned · drag to reorder', searchSets: 'Search {n} icon sets…', matchN: '{n} matches', pin: 'Pin', pinned: 'Pinned',
  addSet: 'Add icon set', addSetPh: 'Type a set name, Enter to pin…', styleNone: 'No {s} icons in this scope', copyName: 'Name', save: 'Save', browseSet: 'Browse set',
  phSetsN: 'Search {n} icon sets: name, author or style', phUIN: 'Search {n} UI libraries: React, Vue, dialog…', sortHot: 'Popular', sortName: 'Name', back: 'Back',
  vCards: 'Cards', vGacha: 'Gacha', dChest: 'My chest', keepS: 'KEEP', skipS: 'SKIP', combo: 'Combo ×{n}', chestKeep: 'KEEP', chestOut: 'REMOVE', movedOut: 'Removed from chest',
  chestDeckNone: 'No saved sets or libraries yet', gFig: 'Icon gacha', stock: 'Stock', gToday: 'Today', gKept: 'Kept', crank: 'Crank', mei: '',
  gHint: 'Drag the crank a full turn · <kbd>Space</kbd> pull · <kbd>→</kbd> keep · <kbd>←</kbd> put back', gTitle: 'One turn,<br>one {k}',
  gDesc: 'Every capsule holds a random {k}. Keep it in your chest, or put it back.', pull: 'Pull', newCap: 'New capsule · {k}', putBack: 'Put back', keepIt: 'Keep', keptMsg: '{n} is in your chest',
  kSet: 'icon set', kComp: 'component', kLib: 'UI library', gEmpty: 'The machine is empty. Pick another deck or start over', cFig: 'Idea chest', chestT: 'Your idea chest', closeChest: 'Close chest', openChest: 'Open chest',
  chestSum: '<b>{n}</b> saved · icons <b>{a}</b> · sets <b>{b}</b> · libraries <b>{c}</b>', favd: 'Saved to your chest', likedSet: '{n} saved to your chest', mFav: 'Saved', chestTip: 'Idea chest',
  filterN: 'Filter', minimize: 'Minimize', maximize: 'Maximize', close: 'Close',
})

// v0.3 (v10 design): capsule case + gacha machine; trimmed titles.
Object.assign(L.zh, {
  chestT: '扭蛋收纳盒', chestTip: '扭蛋收纳盒', cFig: '扭蛋收纳盒', closeChest: '合上', openChest: '打开', prevLayer: '上一层 ←', nextLayer: '下一层 →',
  favd: '已收进扭蛋收纳盒', likedSet: '{n} 已收进收纳盒', keptMsg: '{n} 已收进收纳盒', dChest: '我的收纳盒', movedOut: '已移出收纳盒', chestDeckNone: '收纳盒里还没有图标库或组件库',
  gName: '扭蛋机', putBackMsg: '已放回机器', allHist: '全部 →', save: '收藏',
})
Object.assign(L.en, {
  chestT: 'Capsule case', chestTip: 'Capsule case', cFig: 'Capsule case', closeChest: 'Close', openChest: 'Open', prevLayer: 'Previous layer ←', nextLayer: 'Next layer →',
  favd: 'Saved to your capsule case', likedSet: '{n} saved', keptMsg: '{n} saved', dChest: 'My case', movedOut: 'Removed from case', chestDeckNone: 'No saved sets or libraries yet',
  gName: 'Gacha', putBackMsg: 'Put back', allHist: 'All →', save: 'Save',
})

// v0.4: custom quick-window shortcut.
Object.assign(L.zh, {
  quickKeyL: '速取快捷键', pressKeys: '按下组合键…', keyTaken: '已被占用', keyBad: '不支持这个组合', keyReset: '恢复默认', keySet: '快捷键：{k}', noKey: '未设置',
  keyHint: '点击后按下新的组合键，Esc 取消',
})
Object.assign(L.en, {
  quickKeyL: 'Quick window key', pressKeys: 'Press keys…', keyTaken: 'Already in use', keyBad: 'Not supported', keyReset: 'Reset to default', keySet: 'Shortcut: {k}', noKey: 'None',
  keyHint: 'Click, then press a new combo. Esc cancels',
})

// v0.4: favorites export / import.
Object.assign(L.zh, {
  favExport: '导出收藏', favImport: '导入收藏', favMerge: '合并', favReplace: '替换', favMergeTip: '保留现有收藏，加入文件里的新项', favReplaceTip: '用文件内容替换现有收藏',
  favExported: '已导出 {n} 项', favMerged: '已导入 {n} 项新收藏', favReplaced: '已替换为 {n} 项收藏', favBad: '不是有效的收藏文件', favNewer: '文件来自更新的版本，请先更新应用', favIOFail: '读写文件失败',
})
Object.assign(L.en, {
  favExport: 'Export favorites', favImport: 'Import favorites', favMerge: 'Merge', favReplace: 'Replace', favMergeTip: 'Keep what you have and add new items', favReplaceTip: 'Replace your favorites with the file',
  favExported: 'Exported {n} items', favMerged: 'Imported {n} new items', favReplaced: 'Now {n} favorites', favBad: 'Not a valid favorites file', favNewer: 'Made by a newer version. Update first', favIOFail: 'Could not read or write the file',
})

// v0.4: update check.
Object.assign(L.zh, {
  updCheck: '检查更新', updChecking: '检查中…', updLatest: '已是最新', updFail: '检查失败', updAvail: '新版本 v{v} 可用', updNow: '更新', updGet: '下载', updLater: '稍后', updInstalling: '正在更新 {p}%',
})
Object.assign(L.en, {
  updCheck: 'Check for updates', updChecking: 'Checking…', updLatest: 'Up to date', updFail: 'Check failed', updAvail: 'v{v} is available', updNow: 'Update', updGet: 'Download', updLater: 'Later', updInstalling: 'Updating {p}%',
})

// v0.4.7: self-update (download + install) and its error texts.
Object.assign(L.zh, {
  pullAgain: '再扭一下', updDl: '正在下载 v{v}', updDlBtn: '{p}%', updInst: '正在安装 v{v}，马上重启…', updCancel: '取消', updRetry: '重试', updBrowser: '在浏览器中打开',
  updManual: '已打开安装包，把 Iconette 拖进「应用程序」即可',
  updE_timeout: '连接 GitHub 超时，网络可能需要代理', updE_connect: '连不上 GitHub，请检查网络或代理', updE_rate: 'GitHub 请求太频繁，稍后再试',
  updE_noasset: '没找到适合本机的安装包', updE_http: '下载失败（HTTP {c}）', updE_install: '安装没有完成', updE_io: '无法写入临时文件', updE_open: '无法打开浏览器', updE_other: '更新失败',
})
Object.assign(L.en, {
  pullAgain: 'Turn again', updDl: 'Downloading v{v}', updDlBtn: '{p}%', updInst: 'Installing v{v}, restarting…', updCancel: 'Cancel', updRetry: 'Retry', updBrowser: 'Open in browser',
  updManual: 'Installer opened: drag Iconette into Applications',
  updE_timeout: 'GitHub timed out. You may need a proxy', updE_connect: 'Can’t reach GitHub. Check your network or proxy', updE_rate: 'Too many GitHub requests. Try again later',
  updE_noasset: 'No installer for this computer', updE_http: 'Download failed (HTTP {c})', updE_install: 'Install didn’t finish', updE_io: 'Can’t write the temp file', updE_open: 'Can’t open the browser', updE_other: 'Update failed',
})

// v0.4 (v11 design): hand-inked gashapon with a knob; the favourites page is the idea chest again.
Object.assign(L.zh, {
  chestT: '收藏', chestTip: '收藏', cFig: '灵感宝箱', pull: '扭一下', crank: '旋钮', keptMsg: '{n} 已收进宝箱', favd: '已收进宝箱', likedSet: '{n} 已收进宝箱',
  gHint: '拖动旋钮转一圈 · <kbd>Space</kbd> 扭一下 · <kbd>→</kbd> 收下 · <kbd>←</kbd> 放回', prevPage: '上一页 ←', nextPage: '下一页 →', dChest: '我的宝箱', movedOut: '已移出宝箱',
  chestDeckNone: '宝箱里还没有图标库或组件库', toGacha: '去扭蛋机',
})
Object.assign(L.en, {
  chestT: 'Saved', chestTip: 'Saved', cFig: 'Idea chest', pull: 'Turn', crank: 'Knob', keptMsg: '{n} is in your chest', favd: 'Saved to your chest', likedSet: '{n} saved to your chest',
  gHint: 'Drag the knob a full turn · <kbd>Space</kbd> turn · <kbd>→</kbd> keep · <kbd>←</kbd> put back', prevPage: 'Previous page ←', nextPage: 'Next page →', dChest: 'My chest', movedOut: 'Removed from chest',
  chestDeckNone: 'No saved sets or libraries yet', toGacha: 'Gacha machine',
})

// v0.4.8: GitHub repo button in the title bar.
Object.assign(L.zh, { ghRepo: 'GitHub 仓库', ghOpenFail: '无法打开浏览器' })
Object.assign(L.en, { ghRepo: 'GitHub repository', ghOpenFail: 'Couldn’t open the browser' })

// 离线图标包：首次询问是否下载全部图标。
Object.assign(L.zh, {
  packTitle: '是否下载全部图标',
  packBody: '列表和每套的样例已经在应用里，离线也能先看。完整图标共 {n} 套：压缩包约 {zip}，图标 JSON 约占磁盘 {disk}（整包解压约 {full}）。文件会放在本机应用数据目录，之后优先读本地。',
  packHint: '先不下载的话，打开某个图标集时再单独获取。',
  packYes: '下载全部',
  packNo: '暂时不用',
  packGo: '正在下载 {name}（{a} / {b}）',
  packDisk: '已写入约 {got} / {all}',
  packDone: '全部图标已保存在本机，之后优先读本地。',
  packResume: '本地还缺 {n} 个图标集。要继续下载吗？',
  packMenu: '下载全部图标',
  packHave: '全部图标已在本地',
  packFail: '{n} 个图标集没有下完，可以稍后继续',
  packCancel: '取消',
  packLater: '稍后',
  packOk: '好',
})
Object.assign(L.en, {
  packTitle: 'Download every icon?',
  packBody: 'The set list and a few samples already work offline. The full library is {n} sets: about {zip} compressed, about {disk} of icon JSON on disk (about {full} unpacked). Files stay in this app’s data folder and are preferred after that.',
  packHint: 'If you skip this, a set is downloaded the first time you open it.',
  packYes: 'Download all',
  packNo: 'Not now',
  packGo: 'Downloading {name} ({a} / {b})',
  packDisk: 'About {got} / {all} written',
  packDone: 'Every icon is stored locally and will be used first.',
  packResume: '{n} sets are still missing. Continue the download?',
  packMenu: 'Download all icons',
  packHave: 'All icons are local',
  packFail: '{n} sets didn’t finish. You can resume later',
  packCancel: 'Cancel',
  packLater: 'Later',
  packOk: 'OK',
})
