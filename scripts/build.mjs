/**
 * Composes every panel into a single seamless card.svg, plus the standalone
 * clickable link chips, then writes README.md.
 *
 *   node scripts/build.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { C, Doc, rect, bevel, measure, midline, esc } from "./theme.mjs";
import { chip, ghChrome, ditherDef } from "./components.mjs";
import { CONFIG, LAYOUT } from "./config.mjs";
import { collect } from "./data.mjs";
import * as P from "./panels.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = path.join(ROOT, "assets");

const GH_HEADER_H = 34;

/* ------------------------------------------------------------------- card */

async function buildCard(data) {
  const { width, pad, gap, content } = LAYOUT;
  const half = LAYOUT.half;
  const x = pad;
  const rightX = pad + half + gap;

  // Column heights are resolved before drawing so each pair lines up.
  const aboutH = Math.max(P.aboutHeight(), P.statusHeight(half));
  const statsH = Math.max(P.ghStatsHeight(), P.leetHeight(half));
  const trophyH = Math.max(P.trophyHeight(), P.connectHeight());
  const footH = Math.max(P.quoteHeight(half), P.notifyHeight());
  const stackH = P.stackHeight(content);

  const bodyH =
    P.HERO_H + gap + P.STRIP_H + gap + aboutH + gap + stackH + gap + statsH + gap + trophyH + gap + footH + gap + P.STATUSBAR_H;
  const height = GH_HEADER_H + pad + bodyH + pad;

  const doc = new Doc(width);

  // Card shell: dark GitHub chrome, cream desktop, rounded corners.
  doc.add(
    `<clipPath id="card"><rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8"/></clipPath>`,
    ditherDef(),
    `<g clip-path="url(#card)">`,
    rect(0, 0, width, height, C.ghBg),
    rect(0, GH_HEADER_H, width, height - GH_HEADER_H, C.desktop),
  );

  ghChrome(doc, { x: 0, y: 0, w: width, h: GH_HEADER_H, repo: CONFIG.github, file: "README.md" });

  let y = GH_HEADER_H + pad;

  P.hero(doc, { x, y, w: content });
  y += P.HERO_H + gap;

  P.badgeStrip(doc, { x, y }, data);
  y += P.STRIP_H + gap;

  P.about(doc, { x, y, w: half, h: aboutH });
  P.statusPanel(doc, { x: rightX, y, w: half, h: aboutH });
  y += aboutH + gap;

  P.stack(doc, { x, y, w: content, h: stackH });
  y += stackH + gap;

  P.ghStats(doc, { x, y, w: half, h: statsH }, data);
  P.leetcode(doc, { x: rightX, y, w: half, h: statsH }, data);
  y += statsH + gap;

  P.trophies(doc, { x, y, w: half, h: trophyH }, data);
  P.connect(doc, { x: rightX, y, w: half, h: trophyH });
  y += trophyH + gap;

  P.quote(doc, { x, y, w: half, h: footH });
  P.notify(doc, { x: rightX, y, w: half, h: footH }, data);
  y += footH + gap;

  P.statusBar(doc, { x, y, w: content }, data);

  doc.add(
    `</g>`,
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="none" stroke="${C.ghBorder}"/>`,
  );

  return doc.render(height);
}

/* ------------------------------------------------------- clickable link chip */

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
  const alt = `${CONFIG.name} — ${CONFIG.role}`;
  const links = chips
    .map((c) => `<a href="${c.url}"><img src="${c.file}" height="34" alt="${esc(c.label)}"/></a>`)
    .join("");

  return `<div align="center">

<img src="assets/card.svg" width="100%" alt="${esc(alt)}"/>

${links}

</div>

<!--
  This README is generated. Do not edit it by hand.
  Edit scripts/config.mjs, then run:  npm run build
  The GitHub Action in .github/workflows/readme.yml refreshes the
  live numbers every day.
-->
`;
}

/* -------------------------------------------------------------------- main */

console.log("→ collecting stats");
const data = await collect();
console.log(
  `  github: ${data.github.commits} commits · ${data.github.stars} stars · ${data.github.followers} followers`,
);
console.log(`  leetcode: ${data.leetcode.total} solved`);

await mkdir(ASSETS, { recursive: true });

console.log("→ rendering card.svg");
const card = await buildCard(data);
await writeFile(path.join(ASSETS, "card.svg"), card);
console.log(`  card.svg  ${(Buffer.byteLength(card) / 1024).toFixed(1)} KB`);

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
console.log("→ README.md written");
