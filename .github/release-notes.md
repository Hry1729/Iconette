Icônette v0.3.1：修复部分 Windows 电脑上双击后没有任何反应、程序直接退出的问题。Windows 和 macOS（Intel + Apple Silicon）通用。

## 下载

| 平台 | 文件 |
| --- | --- |
| Windows 10 / 11（推荐） | `Iconette_0.3.1_x64-setup.exe`，装到当前用户，不需要管理员权限 |
| Windows 企业部署 | `Iconette_0.3.1_x64_en-US.msi` |
| macOS 10.15+ | `Iconette_0.3.1_universal.dmg` |

macOS 暂未签名，第一次打开请右键 App → 打开，或执行 `xattr -cr /Applications/Iconette.app`。从 0.1 / 0.2 / 0.3 升级直接覆盖安装即可，收藏和设置都会保留。

## 修复

- **Alt + Space 被占用时无法启动**：如果 PowerToys Run、uTools、Wox / Flow Launcher、Microsoft Copilot、ChatGPT 桌面版等已经占用了 Alt + Space，之前的版本会在启动时直接退出（没有窗口、没有提示）。现在快捷键注册失败不会再影响启动
- **自动改用 Alt + Shift + Space**：Alt + Space 被占用时，速取窗口的全局快捷键自动改为 Alt + Shift + Space；托盘菜单和界面里的快捷键提示会显示实际生效的那个。两个都被占用时仍可从托盘菜单或首页按钮打开速取窗口
- **崩溃日志**：启动失败或程序崩溃时会把原因写进日志，反馈问题时请附上：
  - Windows：`%LOCALAPPDATA%\io.github.hry1729.iconette\logs\iconette.log`
  - macOS：`~/Library/Logs/io.github.hry1729.iconette/iconette.log`
- 托盘图标创建失败（例如资源管理器正在重启）时不再阻止程序启动

## 仍然支持

8 种复制格式（SVG、PNG、Vue、React、UnoCSS 等）、中英文搜索、范围弹层、其他风格、拖出 SVG、组件库实时示例、划一划卡片 / 扭蛋模式、扭蛋收纳盒、收藏分组、Alt / ⌥ + Space 速取窗口、系统托盘、开机启动。

基于 [antfu/icones](https://github.com/antfu/icones)，图标数据来自 [Iconify](https://iconify.design)。
