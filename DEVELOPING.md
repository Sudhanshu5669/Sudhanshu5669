# How this README is built

`README.md` and everything in `assets/*.svg` are **generated**. Editing them by
hand gets overwritten on the next build. Edit the source instead.

## Why SVG instead of HTML

GitHub runs every README through a sanitizer that strips `<style>` tags and
`class` / `style` attributes, so the beveled panels and pixel fonts cannot
survive as markup. Inside an SVG, CSS and `@font-face` are preserved (including
CSS animations — the blinking cursor, EQ bars and marquee), so each panel is
rendered as an image and looks identical for every visitor.

## Why slices instead of one big card

GitHub wraps any README image that is *not* already inside a link with an
automatic link to the raw file — clicking a single big card would open
`assets/card.svg`. The design is therefore sliced into one SVG per section,
and `build.mjs` wraps each slice in a real `<a>`: the hero opens the profile,
each project row opens that repo, the LeetCode panel opens LeetCode, the
player opens YouTube, and so on. Half-width panels are rendered as two SVGs
placed side by side at `width="49.9%"`; the pair must stay on one line in
README.md with **no whitespace between the anchors**, or the inline word-space
wraps the second one.

Each half slice carries a 7 px transparent gutter on its inner edge — that is
what forms the visible gap between a pair.

## Editing content

Everything personal — name, tagline, tech stack, links, quote — lives in
[`scripts/config.mjs`](scripts/config.mjs). Change it, then:

```bash
npm install      # once
npm run build    # regenerates README.md + assets/*.svg + .preview.html
npm run preview  # optional: screenshots the whole page to .preview/card.png
```

`npm run preview` rasterizes `.preview.html` (which mirrors the README's slice
layout) through headless Chrome with each SVG inside an `<img>` — the same
restricted mode GitHub uses: external resources blocked, only the inlined
fonts available. If it looks right there, it looks right on GitHub.

## Layout

| File | Responsibility |
| --- | --- |
| `scripts/config.mjs` | All content + canvas geometry |
| `scripts/theme.mjs` | Palette, font loading/subsetting, text metrics, `Doc` |
| `scripts/components.mjs` | Bevels, panels, windows, chips, meters |
| `scripts/panels.mjs` | One function per panel in the design |
| `scripts/build.mjs` | Renders every slice, writes `README.md` + `.preview.html` |
| `scripts/data.mjs` | GitHub + LeetCode API calls |
| `scripts/preview.mjs` | Headless-Chrome screenshot |

Sections top to bottom: hero card (GitHub chrome + wordmark + live badges),
about | status, tech stack, contribution heatmap, featured project rows
(top-starred repos, or pin names in `CONFIG.featuredRepos`), GitHub stats |
LeetCode, trophies | connect, the SYNTHXX.AMP player, quote | notifications,
status bar, and the clickable link chips.

Panels expose both `height()` and `render()` so side-by-side columns can be
equalized before anything is drawn.

## Fonts

`assets/fonts/*.woff2` are the latin subsets of Press Start 2P, VT323 and
Pixelify Sans, committed so builds never depend on Google Fonts being up. Each
SVG embeds only the glyphs it actually uses (via `subset-font`), which keeps the
card around 75 KB instead of ~350 KB.

Refresh them with `npm run fonts`.

## Live data

The daily Action calls the GitHub GraphQL API and LeetCode's public GraphQL
endpoint. Both are wrapped so a failed call logs a warning and falls back
rather than committing a broken card.

Locally there is no token, so the build falls back to the unauthenticated REST
API — followers/stars/repos/projects are real, but **commits and PRs show 0**,
the language split is cruder, and the contribution heatmap renders empty with a
"sync pending" note (the calendar only exists in the GraphQL API). CI always
has a token and uses the accurate path.

To include private contributions in the commit count, add a classic PAT with the
`read:user` scope as a repository secret named `STATS_TOKEN`.
