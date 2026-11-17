# Changelog

本文件记录 Icônette 的图标目录与离线包变更，格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。
图标集的后续增减由 `pnpm sync:iconify` 追加到下面。

## [Unreleased]

### Added

- 内置 Iconify 图标集目录和每套样例（`@iconify/json@2.2.550`，生成于 2026-10-31）。共 255 个图标集、1530 个样例图标。资源页、卡片和分类离线即可显示。完整 SVG 不进入仓库。
- 首次启动询问「是否下载全部图标」，并写明体积：npm 压缩包约 113 MB（118,424,081 字节），图标 JSON 约占磁盘 523 MB（548,915,104 字节），整包解压约 528 MB（553,721,233 字节）。同意后按套把 JSON 下载到本机应用数据目录（来源是 unpkg 上的 `@iconify/json`；jsDelivr 不托管这个超过 150 MB 的包），之后优先读本地。拒绝则打开某一套时再单独下载。
- 打开整套图标时拉取该套完整 JSON 并缓存。本地还没有全文时，零散图标仍走原来的 Iconify API。

## [2026-11-15] Iconify 目录

- 来源：`@iconify/json` 2.2.553 → 2.2.557
- 合计：276 → 280
- 新增（4）：`evicons`、`uix`、`uix-sharp`、`uix-solid`
- 数量变化（33）：`andrsrxn` 2773 → 2772、`arcticons` 15322 → 15459、`at-icons` 642 → 705、`carbon` 2638 → 2644、`cbi` 1790 → 1806、`codex` 156 → 203、`coolicons` 18870 → 23250、`devicon` 1104 → 1154、`devicon-plain` 802 → 831、`fluent` 19945 → 20015、`hugeicons` 6065 → 6114、`keyline-icons` 13536 → 14664、`logos` 2064 → 2066、`lucide` 2020 → 2055、`lucide-extended` 2879 → 2900、`material-symbols` 15761 → 15810、`material-symbols-light` 15826 → 15875、`matita` 302 → 383、`openmoji` 4545 → 4546、`pinhead` 2821 → 2846、`selfhst` 7311 → 7344、`sidekickicons` 432 → 644、`simple-icons` 3467 → 3470、`solar` 8706 → 9456、`struq` 300 → 347、`tabler` 6257 → 6545、`thesvg` 3804 → 3805、`thesvg-color` 5200 → 5215、`token` 1788 → 1790、`token-branded` 4085 → 4087、`vadivam` 1999 → 2020、`vscode-icons` 1719 → 1723、`wordpress` 344 → 338
- 其他元数据更新（2）：`fluent-color`、`iconoir`
- 样例图标已更新（1680 个）

## [2026-11-05] Iconify 目录

- 来源：`@iconify/json` 2.2.550 → 2.2.553
- 合计：255 → 276
- 新增（21）：`coolicons`、`iconito`、`streamline-memes`、`struq`、`tabler-flags`、`withicons-bento`、`withicons-brutal`、`withicons-chrome`、`withicons-clay`、`withicons-coquette`、`withicons-dock`、`withicons-glass`、`withicons-kawaii`、`withicons-liquid`、`withicons-lunar`、`withicons-luxe`、`withicons-rangoli`、`withicons-retro`、`withicons-soft3d`、`withicons-utsav`、`withicons-valentine`
- 数量变化（24）：`cbi` 1785 → 1790、`codicon` 656 → 657、`devicon` 1079 → 1104、`devicon-plain` 784 → 802、`fluent` 19900 → 19945、`healthicons` 2106 → 2128、`keyline-icons` 12984 → 13536、`logos` 2043 → 2064、`lucide` 1999 → 2020、`lucide-extended` 2719 → 2879、`material-icon-theme` 908 → 910、`matita` 260 → 302、`mingcute` 3320 → 4526、`openmoji` 4544 → 4545、`pinhead` 2747 → 2821、`selfhst` 7292 → 7311、`sidekickicons` 232 → 432、`streamline-kameleon-color` 400 → 600、`tdesign` 2356 → 2358、`thesvg` 3798 → 3804、`thesvg-color` 5166 → 5200、`vadivam` 1903 → 1999、`vscode-icons` 1712 → 1719、`withicons` 6000 → 7000
- 其他元数据更新（18）：`arcticons`、`ci`、`cif`、`circle-flags`、`flag`、`flagpack`、`fluent-color`、`geo`、`gis`、`gravity-ui`、`maki`、`map`、`meteocons`、`osmic`、`roentgen`、`temaki`、`withicons-christmas`、`withicons-halloween`
- 样例图标已更新（1656 个）
