/**
 * Renders the README as a stack of independent SVG slices instead of one
 * monolithic card. Every slice is wrapped in a real <a> in README.md, so
 * clicking any section navigates somewhere useful (profile, repo, LeetCode…)
 * rather than to the raw SVG file — which is what GitHub does to any image
 * that is not already inside a link.
 *
 *   node scripts/build.mjs
 */
import { writeFile, unlink, readdir, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { C, Doc, rect, bevel, measure, midline, esc } from "./theme.mjs";
import { ghChrome, ditherDef } from "./components.mjs";
import { CONFIG, LAYOUT } from "./config.mjs";
import { collect } from "./data.mjs";
import * as P from "./panels.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = path.join(ROOT, "assets");

const GH_HEADER_H = 34;
const W = LAYOUT.width; // 940 — every full-width slice
const HALF = (W - LAYOUT.gap) / 2; // 463 — panel width of a half slice
const GUTTER = LAYOUT.gap / 2; // 7 — transparent gutter baked into each half

const profileUrl = `https://github.com/${CONFIG.github}`;
const sourceUrl = `${profileUrl}/${CONFIG.github}`;
const reposUrl = `${profileUrl}?tab=repositories`;
const leetUrl = `https://leetcode.com/${CONFIG.leetcode}/`;

/* ------------------------------------------------------------------- slices */

/**
 * Each slice: { file, svg, url, alt, w, h, half }. Full slices render at
 * width="100%", halves at 49.9% side by side (the 7px transparent gutter
 * baked into each half becomes the visual gap between the pair).
 */
const slices = [];

async function fullSlice(file, { height, url, alt, dither = false }, draw) {
  const doc = new Doc(W);
  if (dither) doc.add(ditherDef());
  draw(doc);
  slices.push({ file, svg: await doc.render(height), url, alt, w: W, h: height, half: false });
}

async function halfPair(left, right, height, { dither = false } = {}) {
  for (const [side, s] of [
    ["left", left],
    ["right", right],
  ]) {
    const doc = new Doc(HALF + GUTTER);
    if (dither) doc.add(ditherDef());
    s.draw(doc, side === "left" ? 0 : GUTTER);
    slices.push({
      file: s.file,
      svg: await doc.render(height),
      url: s.url,
      alt: s.alt,
      w: HALF + GUTTER,
      h: height,
      half: true,
    });
  }
}

async function buildSlices(data) {
  // 1 · hero card — GitHub chrome + wordmark + live badges
  const { pad, gap } = LAYOUT;
  const heroH = GH_HEADER_H + pad + P.HERO_H + gap + P.STRIP_H + pad;
  await fullSlice(
    "hero.svg",
    { height: heroH, url: profileUrl, alt: `${CONFIG.name} — ${CONFIG.role}` },
    (doc) => {
      doc.add(
        `<clipPath id="card"><rect x="0.5" y="0.5" width="${W - 1}" height="${heroH - 1}" rx="8"/></clipPath>`,
        `<g clip-path="url(#card)">`,
        rect(0, 0, W, heroH, C.ghBg),
        rect(0, GH_HEADER_H, W, heroH - GH_HEADER_H, C.desktop),
      );
      ghChrome(doc, { x: 0, y: 0, w: W, h: GH_HEADER_H, repo: CONFIG.github, file: "README.md" });
      P.hero(doc, { x: pad, y: GH_HEADER_H + pad, w: W - pad * 2 });
      P.badgeStrip(doc, { x: pad, y: GH_HEADER_H + pad + P.HERO_H + gap }, data);
      doc.add(
        `</g>`,
        `<rect x="0.5" y="0.5" width="${W - 1}" height="${heroH - 1}" rx="8" fill="none" stroke="${C.ghBorder}"/>`,
      );
    },
  );

  // 2 · about.yaml | what I'm up to
  const aboutH = Math.max(P.aboutHeight(), P.statusHeight(HALF));
  await halfPair(
    {
      file: "about.svg",
      url: profileUrl,
      alt: "About me",
      draw: (doc, x) => P.about(doc, { x, y: 0, w: HALF, h: aboutH }),
    },
    {
      file: "status.svg",
      url: sourceUrl,
      alt: "What I'm up to",
      draw: (doc, x) => P.statusPanel(doc, { x, y: 0, w: HALF, h: aboutH }),
    },
    aboutH,
  );

  // 3 · tech stack
  const stackH = P.stackHeight(W);
  await fullSlice("stack.svg", { height: stackH, url: reposUrl, alt: "Tech stack and tools" }, (doc) =>
    P.stack(doc, { x: 0, y: 0, w: W, h: stackH }),
  );

  // 4 · contribution heatmap
  const contribH = P.contribHeight();
  await fullSlice(
    "contributions.svg",
    { height: contribH, url: profileUrl, alt: "Contribution heatmap" },
    (doc) => P.contributions(doc, { x: 0, y: 0, w: W, h: contribH }, data),
  );

  // 5 · featured projects — one clickable row per repo
  if (data.github.topRepos.length) {
    await fullSlice(
      "projects.svg",
      { height: P.PROJ_HEAD_H, url: reposUrl, alt: "Featured projects" },
      (doc) => P.projectsHeader(doc, { x: 0, y: 0, w: W }),
    );
    for (const repo of data.github.topRepos) {
      const slug = repo.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      await fullSlice(
        `project-${slug}.svg`,
        {
          height: P.PROJ_ROW_H,
          url: repo.url,
          alt: repo.description ? `${repo.name} — ${repo.description}` : repo.name,
        },
        (doc) => P.projectRow(doc, { x: 0, y: 0, w: W }, repo, data.builtAt),
      );
    }
  }

  // 6 · github stats | leetcode
  const statsH = Math.max(P.ghStatsHeight(), P.leetHeight(HALF));
  await halfPair(
    {
      file: "gh-stats.svg",
      url: profileUrl,
      alt: "GitHub stats and top languages",
      draw: (doc, x) => P.ghStats(doc, { x, y: 0, w: HALF, h: statsH }, data),
    },
    {
      file: "leetcode.svg",
      url: leetUrl,
      alt: `LeetCode — ${data.leetcode.total} solved`,
      draw: (doc, x) => P.leetcode(doc, { x, y: 0, w: HALF, h: statsH }, data),
    },
    statsH,
    { dither: true },
  );

  // 7 · trophies | connect
  const trophyH = Math.max(P.trophyHeight(), P.connectHeight());
  await halfPair(
    {
      file: "trophies.svg",
      url: profileUrl,
      alt: "Trophies",
      draw: (doc, x) => P.trophies(doc, { x, y: 0, w: HALF, h: trophyH }, data),
    },
    {
      file: "connect.svg",
      url: CONFIG.connect.find((c) => c.url.startsWith("mailto:"))?.url ?? profileUrl,
      alt: "Let's connect",
      draw: (doc, x) => P.connect(doc, { x, y: 0, w: HALF, h: trophyH }),
    },
    trophyH,
  );

  // 8 · SYNTHXX.AMP music player
  await fullSlice(
    "player.svg",
    { height: P.WINAMP_H, url: CONFIG.music.url, alt: `${CONFIG.music.app} — ${CONFIG.music.track}` },
    (doc) => P.winamp(doc, { x: 0, y: 0, w: W, h: P.WINAMP_H }),
  );

  // 9 · quote | notifications
  const footH = Math.max(P.quoteHeight(HALF), P.notifyHeight());
  await halfPair(
    {
      file: "quote.svg",
      url: sourceUrl,
      alt: CONFIG.quote.text,
      draw: (doc, x) => P.quote(doc, { x, y: 0, w: HALF, h: footH }),
    },
    {
      file: "notify.svg",
      url: sourceUrl,
      alt: "Notifications",
      draw: (doc, x) => P.notify(doc, { x, y: 0, w: HALF, h: footH }, data),
    },
    footH,
  );

  // 10 · status bar
  await fullSlice(
    "statusbar.svg",
    { height: P.STATUSBAR_H, url: sourceUrl, alt: CONFIG.statusBar.left },
    (doc) => P.statusBar(doc, { x: 0, y: 0, w: W }, data),
  );
}

/* --------------------------------------------------------------- link chips */

const LINK_H = 34;

async function buildLinkChip({ icon, label }) {
  const size = 13;
  const textW = measure("px7", label, size);
  const width = Math.ceil(textW + 20 + 26);

  const doc = new Doc(width);
  doc.add(bevel(0, 0, width, LINK_H, { raised: true, fill: C.face }));
  doc.add(doc.emoji(icon, { x: 12, y: midline("px7", 13, 0, LINK_H) + 1, size: 12 }));
  doc.add(
    doc.text("px7", label, {
      x: 30,
      y: midline("px7", size, 0, LINK_H),
      size,
      fill: C.ink,
    }),
  );
  return { svg: await doc.render(LINK_H), width };
}

/* ----------------------------------------------------------------- readme */

function buildReadme(chips) {
  // Half slices must stay on one line with no whitespace between the two
  // anchors, otherwise the inline word-space pushes the pair apart.
  const lines = [];
  for (let i = 0; i < slices.length; i++) {
    const s = slices[i];
    const img = (sl, pct) =>
      `<a href="${sl.url}"><img src="assets/${sl.file}" width="${pct}" alt="${esc(sl.alt)}"/></a>`;
    if (s.half) {
      lines.push(img(s, "49.9%") + img(slices[i + 1], "49.9%"));
      i++;
    } else {
      lines.push(img(s, "100%"));
    }
  }

  const chipLine = chips
    .map((c) => `<a href="${c.url}"><img src="${c.file}" height="34" alt="${esc(c.label)}"/></a>`)
    .join("");

  return `<div align="center">

${lines.join("\n")}

${chipLine}

</div>

<!--
  This README is generated. Do not edit it by hand.
  Edit scripts/config.mjs, then run:  npm run build
  Every section above is its own SVG slice wrapped in a link, so clicking
  a panel opens the matching page instead of the raw image file.
  The GitHub Action in .github/workflows/readme.yml refreshes the
  live numbers every day.
-->
`;
}

/* -------------------------------------------------------- preview scaffold */

/**
 * .preview.html mirrors the README structure with fixed pixel widths so
 * scripts/preview.mjs can screenshot the whole page the way GitHub lays
 * it out (inline images, baseline gaps and all).
 */
function buildPreviewHtml(chips) {
  const lines = [];
  let height = 32; // body padding
  for (let i = 0; i < slices.length; i++) {
    const s = slices[i];
    if (s.half) {
      lines.push(
        `<a href="#"><img src="assets/${s.file}" width="470"></a>` +
          `<a href="#"><img src="assets/${slices[i + 1].file}" width="470"></a>`,
      );
      height += s.h + 7;
      i++;
    } else {
      lines.push(`<a href="#"><img src="assets/${s.file}" width="940"></a>`);
      height += s.h + 7;
    }
  }
  height += 34 + 40;

  const chipLine = chips.map((c) => `<a href="#"><img src="${c.file}" height="34"></a>`).join("");

  return `<!doctype html><meta charset="utf-8">
<!--size:972x${Math.ceil(height)}-->
<body style="margin:0;background:#0d1117;padding:16px;width:940px">
${lines.join("\n")}
<p align="center">${chipLine}</p>
</body>`;
}

/* -------------------------------------------------------------------- main */

console.log("→ collecting stats");
const data = await collect();
console.log(
  `  github: ${data.github.commits} commits · ${data.github.stars} stars · ${data.github.followers} followers`,
);
console.log(`  leetcode: ${data.leetcode.total} solved`);
console.log(
  `  projects: ${data.github.topRepos.map((r) => r.name).join(", ") || "none"} · calendar: ${
    data.github.calendar ? data.github.calendar.total + " contributions" : "unavailable"
  }`,
);

await mkdir(ASSETS, { recursive: true });

console.log("→ rendering slices");
await buildSlices(data);

// Drop stale generated SVGs (renamed repos, removed panels, the old card.svg).
const keep = new Set(slices.map((s) => s.file));
for (const f of await readdir(ASSETS)) {
  if (f.endsWith(".svg") && !f.startsWith("link-") && !keep.has(f)) {
    await unlink(path.join(ASSETS, f));
    console.log(`  removed stale ${f}`);
  }
}

let total = 0;
for (const s of slices) {
  await writeFile(path.join(ASSETS, s.file), s.svg);
  total += Buffer.byteLength(s.svg);
}
console.log(`  ${slices.length} slices · ${(total / 1024).toFixed(1)} KB total`);

console.log("→ rendering link chips");
const chips = [];
for (const link of CONFIG.connect) {
  const slug = link.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const file = `assets/link-${slug}.svg`;
  const { svg } = await buildLinkChip(link);
  await writeFile(path.join(ROOT, file), svg);
  chips.push({ ...link, file });
}

await writeFile(path.join(ROOT, "README.md"), buildReadme(chips));
await writeFile(path.join(ROOT, ".preview.html"), buildPreviewHtml(chips));
console.log("→ README.md written");
