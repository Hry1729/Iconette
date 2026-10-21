# Icônes Desktop — UI Preview

Open [`icones-desktop-preview.html`](./icones-desktop-preview.html) directly in a browser. It is a single self-contained file (Lucide and the sample icon data are embedded), so no server or build step is required.

## What is in the preview

- **Discover** — swipeable collection deck (drag, buttons, arrow keys), save/skip, category filters.
- **Library** — search, favorites/recent/cache filters, sort, grid/list views.
- **Collection** — category chips, icon search, inspector with SVG / JSX / Vue / URL snippets.
- **Settings** — Graphite / Mist / Paper themes, dark mode, Chinese/English, cache actions.

The production target is a Tauri 2 + Vue 3 desktop app. shadcn/ui and animate-ui are React-first; the Vue implementation will use shadcn-vue (reka-ui) and the same motion/spring language.

## Sample data and licenses

The preview embeds a limited sample from these Iconify collections:

| Collection | License | Author |
| --- | --- | --- |
| SVG Logos | CC0 | Gil Barbara |
| Material Symbols | Apache 2.0 | Google |
| Lucide | ISC | Lucide Contributors |
| Tabler Icons | MIT | Paweł Kuna |
| Phosphor | MIT | Phosphor Icons |
| HeroIcons | MIT | Refactoring UI Inc. |

Icon data is provided by [Iconify](https://iconify.design). The base application is [Icônes](https://github.com/antfu/icones) by Anthony Fu (MIT). See the repository [LICENSE](../LICENSE) and the corresponding collection pages on [icon-sets.iconify.design](https://icon-sets.iconify.design) for full license texts.

The UI uses [Lucide](https://lucide.dev) icons (ISC); the embedded Lucide bundle retains its license header.
