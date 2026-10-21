# Icônes Desktop

轻量的桌面图标 / UI 组件查找工具，基于 [Icônes](https://github.com/antfu/icones) 的思路重做，使用 **Tauri 2 + Vue 3**，支持 **Windows** 和 **macOS**（Intel + Apple Silicon 通用包）。

> 原 Icônes 网页版代码保留在标签 `icones-original`。设计原型见 `preview/icones-lite-v8.html`（浏览器直接打开）。

## 下载

每次推送到 `main`，GitHub Actions 会自动打包，在仓库 **Actions → Build desktop → 最新一次运行 → Artifacts** 下载：

- `Icones-windows`：`.exe` 安装包（NSIS）和 `.msi`
- `Icones-macos-universal`：`.dmg`

macOS 包目前是 ad-hoc 签名（没有 Apple 开发者证书），第一次打开需要：右键 App → 打开；或者终端执行 `xattr -cr /Applications/Icones.app`。

## 开发

```bash
pnpm install
pnpm tauri dev     # 桌面窗口调试
pnpm dev           # 只在浏览器里调前端（http://localhost:1420）
pnpm tauri build   # 本机打包
```

需要 Node 22+、pnpm、Rust stable；Windows 需要 WebView2（Win10/11 自带），macOS 需要 Xcode Command Line Tools。

## 结构

```
src/                 Vue 3 前端
  lib/               iconify 数据、中文词典、复制格式、存储、Tauri 原生封装
  components/        标题栏、图标格子、详情条、弹出菜单、提示
  views/             找图标 / 收藏 / （资源、划一划迁移中）
src-tauri/           Tauri 2（Rust）壳：剪贴板、全局快捷键、单实例、打开链接
  tauri.macos.conf.json    macOS：原生红绿灯 + 透明标题栏
  tauri.windows.conf.json  Windows：无边框 + 自绘最小化/最大化/关闭
.github/workflows/   Windows + macOS 打包与启动冒烟测试
preview/             HTML 设计原型
```

## 进度

- [x] 窗口外壳（Mac 原生红绿灯 / Windows 自绘按钮、拖动、深浅色跟随系统）
- [x] 找图标：搜索、中文关键词、图标集栏、详情条、8 种复制格式（含 PNG 图片）、颜色 / 尺寸、单击复制、键盘操作
- [x] 收藏图标（基础）
- [x] 全局快捷键 Alt/⌥ + Space 唤起窗口
- [ ] 资源：图标库 / 组件库 / 示例面板
- [ ] 划一划
- [ ] 收藏分组、最近复制、其他风格
- [ ] 独立速取窗口、拖出 SVG、托盘
