# Changelog

本文件记录 Icônette 的图标目录与离线包变更，格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。
图标集的后续增减由 `pnpm sync:iconify` 追加到下面。

## [Unreleased]

### Added

- 内置 Iconify 图标集目录和每套样例（`@iconify/json@2.2.550`，生成于 2026-10-31）。共 255 个图标集、1530 个样例图标。资源页、卡片和分类离线即可显示。完整 SVG 不进入仓库。
- 首次启动询问「是否下载全部图标」，并写明体积：npm 压缩包约 113 MB（118,424,081 字节），图标 JSON 约占磁盘 523 MB（548,915,104 字节），整包解压约 528 MB（553,721,233 字节）。同意后按套把 JSON 下载到本机应用数据目录（来源是 unpkg 上的 `@iconify/json`；jsDelivr 不托管这个超过 150 MB 的包），之后优先读本地。拒绝则打开某一套时再单独下载。
- 打开整套图标时拉取该套完整 JSON 并缓存。本地还没有全文时，零散图标仍走原来的 Iconify API。
