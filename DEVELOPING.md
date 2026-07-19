# How this README is built

`README.md` and everything in `assets/*.svg` are **generated**. Editing them by
hand gets overwritten on the next build. Edit the source instead.

## Why SVG instead of HTML

GitHub runs every README through a sanitizer that strips `<style>` tags and
`class` / `style` attributes, so the beveled panels and pixel fonts cannot
survive as markup. Inside an SVG, CSS and `@font-face` are preserved, so the
whole card is rendered as one image and looks identical for every visitor.

## Editing content

Everything personal — name, tagline, tech stack, links, quote — lives in
[`scripts/config.mjs`](scripts/config.mjs). Change it, then:

```bash
npm install      # once
npm run build    # regenerates README.md + assets/*.svg
npm run preview  # optional: screenshots the card to .preview/card.png
```

`npm run preview` rasterizes the card through headless Chrome inside an `<img>`,
which is the same restricted mode GitHub uses — external resources blocked, only
the inlined fonts available. If it looks right there, it looks right on GitHub.

## Layout

| File | Responsibility |
| --- | --- |
| `scripts/config.mjs` | All content + canvas geometry |
| `scripts/theme.mjs` | Palette, font loading/subsetting, text metrics, `Doc` |
| `scripts/components.mjs` | Bevels, panels, windows, chips, meters |
| `scripts/panels.mjs` | One function per panel in the design |
| `scripts/build.mjs` | Composes the card, writes `README.md` |
| `scripts/data.mjs` | GitHub + LeetCode API calls |
| `scripts/preview.mjs` | Headless-Chrome screenshot |

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
API — followers/stars/repos are real, but **commits and PRs show 0** and the
language split is cruder. CI always has a token and uses the accurate path.

To include private contributions in the commit count, add a classic PAT with the
`read:user` scope as a repository secret named `STATS_TOKEN`.
