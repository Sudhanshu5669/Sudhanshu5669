/**
 * One function per panel in the source design. Each exposes `height(...)` so
 * side-by-side columns can be equalised before anything is drawn, and
 * `render(doc, box, ...)` which emits the SVG.
 */
import { C, rect, bevel, measure, midline, topline } from "./theme.mjs";
import {
  panel,
  windowFrame,
  chip,
  well,
  meterRow,
  wrap,
  richText,
  truncate,
  TITLEBAR_H,
  WINBAR_H,
} from "./components.mjs";
import { CONFIG } from "./config.mjs";
import { ago, compact, overallGrade, rank } from "./data.mjs";

/* ---------------------------------------------------------------- hero panel */

export const HERO_H = 216;

export function hero(doc, { x, y, w }) {
  const h = HERO_H;
  doc.add(bevel(x, y, w, h, { raised: true, fill: C.titlebar }));

  /* --- left column: wordmark ------------------------------------------- */
  const pad = 26;
  let cy = y + pad;

  // Press Start 2P with the 3px hard drop shadow.
  const titleSize = 34;
  const titleBase = topline("ps2p", titleSize, cy);
  doc.add(
    doc.text("ps2p", CONFIG.name, {
      x: x + pad + 3,
      y: titleBase + 3,
      size: titleSize,
      fill: C.heroShadow,
    }),
    doc.text("ps2p", CONFIG.name, {
      x: x + pad,
      y: titleBase,
      size: titleSize,
      fill: C.titlebarText,
    }),
  );
  cy += titleSize * 1.25 + 12;

  doc.add(
    doc.text("px6", CONFIG.tagline, {
      x: x + pad,
      y: topline("px6", 20, cy),
      size: 20,
      fill: C.heroSub,
    }),
  );
  cy += 24 + 20;

  // Inline role plate.
  const roleSize = 15;
  const roleW = measure("px6", CONFIG.role, roleSize, 1) + 24;
  const roleH = 34;
  doc.add(
    rect(x + pad, cy, roleW, roleH, C.heroShadow),
    doc.text("px6", CONFIG.role, {
      x: x + pad + 12,
      y: midline("px6", roleSize, cy, roleH),
      size: roleSize,
      fill: C.titlebarText,
      ls: 1,
    }),
  );
  cy += roleH + 14;

  // Terminal line with a blinking block cursor.
  const termSize = 19;
  const termBase = topline("vt", termSize, cy);
  doc.add(
    doc.text("vt", CONFIG.terminal, {
      x: x + pad,
      y: termBase,
      size: termSize,
      fill: C.heroTerm,
    }),
    doc.text("vt", "█", {
      x: x + pad + measure("vt", CONFIG.terminal, termSize),
      y: termBase,
      size: termSize,
      fill: C.titlebarText,
      cls: "blink",
    }),
  );
  doc.extraCss += `.blink{animation:blink 1s step-end infinite}@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}`;

  /* --- right column: SUDHANSHU.OS window ------------------------------- */
  const winW = 324;
  const winX = x + w - 18 - winW;
  const winY = y + 18;
  const winH = h - 36;
  const inner = windowFrame(doc, {
    x: winX,
    y: winY,
    w: winW,
    h: winH,
    title: "SUDHANSHU.OS",
    buttons: ["_", "□", "×"],
    barH: 22,
  });

  // Sunken desktop area holding the icon grid + start bar.
  const wellBox = well(doc, {
    x: inner.cx + 4,
    y: inner.cy + 4,
    w: inner.cw - 8,
    h: inner.ch - 8,
    fill: C.teal,
  });

  const cols = 3;
  const cellW = (wellBox.cw - 20) / cols;
  const cellH = 43;
  CONFIG.apps.forEach((app, i) => {
    const cx = wellBox.cx + 10 + (i % cols) * cellW + cellW / 2;
    const cyy = wellBox.cy + 10 + Math.floor(i / cols) * (cellH + 6);
    doc.add(
      doc.emoji(app.icon, { x: cx, y: cyy + 22, size: 26, anchor: "middle" }),
      doc.text("px", app.label, {
        x: cx,
        y: cyy + 40,
        size: 11,
        fill: C.titlebarText,
        anchor: "middle",
      }),
    );
  });

  // Start bar pinned to the bottom of the well.
  const barH = 26;
  const barY = wellBox.cy + wellBox.ch - barH - 4;
  doc.add(bevel(wellBox.cx + 4, barY, wellBox.cw - 8, barH, { raised: true, fill: C.face }));
  chip(doc, {
    x: wellBox.cx + 9,
    y: barY + 4,
    text: "▸ Start",
    size: 12,
    font: "px7",
    bg: C.green,
    fg: C.onGreen,
    padX: 10,
    h: 18,
  });
  doc.add(
    doc.text("vt", "online · 12:30 PM", {
      x: wellBox.cx + wellBox.cw - 9,
      y: midline("vt", 16, barY, barH),
      size: 16,
      fill: C.ink,
      anchor: "end",
    }),
  );

  return h;
}

/* -------------------------------------------------------------- badge strip */

export const STRIP_H = 24;

export function badgeStrip(doc, { x, y }, data) {
  const badges = [
    ["FOLLOWERS", String(data.github.followers), C.teal, C.titlebarText],
    ["STARS", compact(data.github.stars), C.teal, C.titlebarText],
    ["REPOS", String(data.github.repos), C.teal, C.titlebarText],
    ["STATUS", "● ONLINE", C.green, C.onGreen],
  ];

  let bx = x;
  for (const [label, value, bg, fg] of badges) {
    const size = 12;
    const labelW = measure("px6", label, size) + 18;
    const valueW = measure("px7", value, size) + 18;
    const total = labelW + valueW;

    doc.add(bevel(bx, y, total, STRIP_H, { raised: true, fill: "#d6cdb2" }));
    doc.add(
      doc.text("px6", label, {
        x: bx + 9,
        y: midline("px6", size, y, STRIP_H),
        size,
        fill: C.muted,
      }),
    );
    doc.add(bevel(bx + labelW, y, valueW, STRIP_H, { raised: false, fill: bg }));
    doc.add(
      doc.text("px7", value, {
        x: bx + labelW + valueW / 2,
        y: midline("px7", size, y, STRIP_H),
        size,
        fill: fg,
        anchor: "middle",
        cls: label === "STATUS" ? "pulse" : undefined,
      }),
    );
    bx += total + 8;
  }
  doc.extraCss += `.pulse{animation:pulse 1.8s ease-in-out infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`;
  return STRIP_H;
}

/* ---------------------------------------------------------------- about.yaml */

const YAML_LINE = 24;

function yamlLines() {
  const out = [];
  const keyW = Math.max(...CONFIG.about.filter((r) => r.value).map((r) => r.key.length + 1)) + 1;
  for (const row of CONFIG.about) {
    if (row.value) {
      out.push({ key: `${row.key}:`, pad: keyW, value: row.value });
    } else {
      out.push({ key: `${row.key}:`, pad: 0, value: "" });
      for (const item of row.list) out.push({ key: "", pad: 0, value: `  - ${item}` });
    }
  }
  return out;
}

export function aboutHeight() {
  return TITLEBAR_H + 12 + WINBAR_H + 4 + 11 + yamlLines().length * YAML_LINE + 11 + 12;
}

export function about(doc, { x, y, w, h }) {
  const box = panel(doc, { x, y, w, h, title: "ABOUT ME" });
  const lines = yamlLines();
  const winH = h - TITLEBAR_H - 24;
  const inner = windowFrame(doc, {
    x: box.cx + 12,
    y: box.cy + 12,
    w: box.cw - 24,
    h: winH,
    title: "about.yaml",
    buttons: ["×"],
    barH: 19,
  });

  const size = 16;
  const charW = measure("vt", "M", size);
  let ly = inner.cy + 11;
  for (const line of lines) {
    const base = topline("vt", size, ly);
    if (line.key) {
      doc.add(doc.text("vt", line.key, { x: inner.cx + 13, y: base, size, fill: C.yamlKey }));
    }
    if (line.value) {
      const offset = line.pad ? line.pad * charW : line.key ? measure("vt", line.key, size) : 0;
      richText(doc, {
        str: line.value,
        x: inner.cx + 13 + offset,
        y: base,
        size,
        fill: C.ink,
      });
    }
    ly += YAML_LINE;
  }
}

/* ------------------------------------------------------------ what I'm up to */

const CARD_GAP = 10;

function statusCardHeight(item, w) {
  const lines = wrap("vt", item.body, 16, w - 22);
  return 9 + 16 + 2 + lines.length * 21 + 9;
}

export function statusHeight(w) {
  const inner = w - 24;
  const cards = CONFIG.status.map((s) => statusCardHeight(s, inner));
  return TITLEBAR_H + 12 + cards.reduce((a, b) => a + b, 0) + CARD_GAP * (cards.length - 1) + 12;
}

export function statusPanel(doc, { x, y, w, h }) {
  const box = panel(doc, { x, y, w, h, title: "WHAT I'M UP TO" });
  let cy = box.cy + 12;
  const cw = box.cw - 24;

  for (const item of CONFIG.status) {
    const ch = statusCardHeight(item, cw);
    doc.add(bevel(box.cx + 12, cy, cw, ch, { raised: false, fill: C.inset }));
    doc.add(
      doc.text("px7", item.title, {
        x: box.cx + 23,
        y: topline("px7", 13, cy + 9),
        size: 13,
        fill: C.titlebar,
      }),
    );
    let ly = cy + 9 + 16 + 2;
    for (const line of wrap("vt", item.body, 16, cw - 22)) {
      doc.add(doc.text("vt", line, { x: box.cx + 23, y: topline("vt", 16, ly), size: 16, fill: C.inkSoft }));
      ly += 21;
    }
    cy += ch + CARD_GAP;
  }
}

/* --------------------------------------------------------------- tech stack */

const CHIP_H = 24;
const CHIP_GAP = 7;
const GROUP_GAP = 12;

/** Greedy wrap of chips into rows that fit `maxW`. */
function chipRows(items, maxW, size = 13, padX = 12) {
  const rows = [];
  let row = [];
  let used = 0;
  for (const item of items) {
    const cw = Math.ceil(measure("px6", item, size) + padX * 2);
    if (used + cw > maxW && row.length) {
      rows.push(row);
      row = [];
      used = 0;
    }
    row.push({ text: item, w: cw });
    used += cw + CHIP_GAP;
  }
  if (row.length) rows.push(row);
  return rows;
}

export function stackHeight(w) {
  const maxW = w - 28;
  let h = TITLEBAR_H + 14;
  CONFIG.stack.forEach((group, i) => {
    const rows = chipRows(group.items, maxW);
    h += 12 + 7 + rows.length * CHIP_H + (rows.length - 1) * CHIP_GAP;
    if (i < CONFIG.stack.length - 1) h += GROUP_GAP;
  });
  return h + 14;
}

export function stack(doc, { x, y, w, h }) {
  const box = panel(doc, { x, y, w, h, title: "TECH STACK & TOOLS" });
  let cy = box.cy + 14;
  const maxW = box.cw - 28;

  for (const group of CONFIG.stack) {
    doc.add(
      doc.text("px6", group.label, {
        x: box.cx + 14,
        y: topline("px6", 12, cy),
        size: 12,
        fill: C.muted,
      }),
    );
    cy += 12 + 7;

    for (const row of chipRows(group.items, maxW)) {
      let cx = box.cx + 14;
      for (const item of row) {
        chip(doc, { x: cx, y: cy, text: item.text, size: 13, font: "px6", h: CHIP_H });
        cx += item.w + CHIP_GAP;
      }
      cy += CHIP_H + CHIP_GAP;
    }
    cy += GROUP_GAP - CHIP_GAP;
  }
}

/* -------------------------------------------------------------- github stats */

export function ghStatsHeight() {
  return TITLEBAR_H + 14 + 58 + 12 + 4 * 16 + 3 * 7 + 14;
}

export function ghStats(doc, { x, y, w, h }, data) {
  const box = panel(doc, { x, y, w, h, title: "GITHUB STATS & TOP LANGS" });
  const g = data.github;
  const cx = box.cx + 14;
  const cw = box.cw - 28;
  let cy = box.cy + 14;

  const rows = [
    ["⭐ Stars", compact(g.stars)],
    ["🏆 Commits", g.commits.toLocaleString("en-US")],
    ["🔀 PRs", String(g.prs)],
  ];
  rows.forEach(([label, value], i) => {
    const ly = cy + i * 21;
    const base = topline("vt", 17, ly);
    const [icon, ...rest] = label.split(" ");
    doc.add(doc.emoji(icon, { x: cx, y: base, size: 15 }));
    doc.add(doc.text("vt", rest.join(" "), { x: cx + 22, y: base, size: 17, fill: C.ink }));
    doc.add(
      doc.text("vt", value, {
        x: cx + 22 + measure("vt", rest.join(" ") + " ", 17),
        y: base,
        size: 17,
        fill: C.ink,
        cls: "b",
      }),
    );
  });

  // Grade medallion.
  const grade = overallGrade(g);
  const r = 29;
  const mx = cx + cw - r;
  const my = cy + r;
  doc.add(
    `<circle cx="${mx}" cy="${my}" r="${r}" fill="${C.teal}" stroke="${C.hi}" stroke-width="2"/>`,
    doc.text("ps2p", grade, {
      x: mx,
      y: midline("ps2p", 13, my - r, r * 2),
      size: 13,
      fill: C.titlebarText,
      anchor: "middle",
    }),
  );
  doc.extraCss += `.b{font-weight:700}`;

  cy += 58 + 12;
  for (const lang of data.github.languages) {
    meterRow(doc, {
      x: cx,
      y: cy,
      w: cw,
      label: lang.name,
      pct: lang.pct / 100,
      value: `${lang.pct}%`,
      pattern: true,
    });
    cy += 16 + 7;
  }
}

/* ------------------------------------------------------------------ leetcode */

export function leetHeight(w) {
  const lines = wrap("vt", CONFIG.dsaBlurb, 16, w - 28 - 20);
  return TITLEBAR_H + 14 + 3 * 16 + 2 * 11 + 11 + (16 + lines.length * 20) + 11 + 26 + 14;
}

export function leetcode(doc, { x, y, w, h }, data) {
  const lc = data.leetcode;
  const box = panel(doc, {
    x,
    y,
    w,
    h,
    title: `LEETCODE · ${lc.total} SOLVED`,
  });
  const cx = box.cx + 14;
  const cw = box.cw - 28;
  let cy = box.cy + 14;

  const tiers = [
    ["EASY", lc.easy, C.green],
    ["MEDIUM", lc.medium, C.amber],
    ["HARD", lc.hard, C.red],
  ];
  // Bars are scaled against the largest tier rather than the whole problem set:
  // solved/total-available renders every bar as a nearly invisible sliver.
  // The exact count is printed at the end of each row regardless.
  const peak = Math.max(1, ...tiers.map(([, solved]) => solved));
  for (const [label, solved, color] of tiers) {
    meterRow(doc, {
      x: cx,
      y: cy,
      w: cw,
      label,
      pct: solved / peak,
      value: String(solved),
      color,
      labelW: 60,
    });
    cy += 16 + 11;
  }

  const lines = wrap("vt", CONFIG.dsaBlurb, 16, cw - 20);
  const wellH = 16 + lines.length * 20;
  doc.add(bevel(cx, cy, cw, wellH, { raised: false, fill: C.inset }));
  lines.forEach((line, i) => {
    doc.add(
      doc.text("vt", line, {
        x: cx + 10,
        y: topline("vt", 16, cy + 8 + i * 20),
        size: 16,
        fill: C.inkSoft,
      }),
    );
  });
  cy += wellH + 11;

  chip(doc, {
    x: cx,
    y: cy,
    text: "▸ Solve with me on LeetCode",
    size: 12,
    font: "px7",
    bg: C.green,
    fg: C.onGreen,
    h: 24,
  });
}

/* ------------------------------------------------------------------ trophies */

export function trophyHeight() {
  return TITLEBAR_H + 12 + 4 * 32 + 3 * 6 + 12;
}

export function trophies(doc, { x, y, w, h }, data) {
  const box = panel(doc, { x, y, w, h, title: "TROPHIES" });
  const g = data.github;
  const rows = [
    ["🥇", "Commits", rank(g.commits, [4000, 2500, 1500, 800, 400, 200, 50])],
    ["⭐", "Stars", rank(g.stars, [1000, 500, 200, 100, 50, 20, 5])],
    ["🔀", "Pull Requests", rank(g.prs, [500, 300, 150, 80, 40, 15, 3])],
    ["👥", "Followers", rank(g.followers, [500, 300, 150, 80, 40, 15, 3])],
  ];

  let cy = box.cy + 12;
  for (const [icon, label, tier] of rows) {
    doc.add(bevel(box.cx + 12, cy, box.cw - 24, 32, { raised: false, fill: C.inset }));
    doc.add(doc.emoji(icon, { x: box.cx + 23, y: midline("vt", 18, cy, 32) + 2, size: 18 }));
    doc.add(
      doc.text("px6", `${label} — Rank ${tier}`, {
        x: box.cx + 49,
        y: midline("px6", 13, cy, 32),
        size: 13,
        fill: C.ink,
      }),
      doc.text("px6", "›", {
        x: box.cx + box.cw - 24,
        y: midline("px6", 13, cy, 32),
        size: 13,
        fill: C.muted2,
        anchor: "end",
      }),
    );
    cy += 32 + 6;
  }
}

/* ------------------------------------------------------------------- connect */

const CONNECT_ROW_H = 30;
const CONNECT_ROW_GAP = 8;

export function connectHeight() {
  const rows = CONFIG.connect.length;
  return TITLEBAR_H + 14 + rows * CONNECT_ROW_H + (rows - 1) * CONNECT_ROW_GAP + 14;
}

export function connect(doc, { x, y, w, h }) {
  const box = panel(doc, { x, y, w, h, title: "LET'S CONNECT" });
  const rows = CONFIG.connect.length;
  const stackH = rows * CONNECT_ROW_H + (rows - 1) * CONNECT_ROW_GAP;
  const top = box.cy + (box.ch - stackH) / 2;

  // Floating action button, centred against the stack.
  const r = 26;
  const fabX = box.cx + 14 + r;
  doc.add(
    `<circle cx="${fabX}" cy="${top + stackH / 2}" r="${r}" fill="${C.green}" stroke="${C.hi}" stroke-width="2"/>`,
    doc.text("px", "+", {
      x: fabX,
      y: midline("px", 30, top + stackH / 2 - r, r * 2),
      size: 30,
      fill: C.onGreen,
      anchor: "middle",
    }),
  );

  const gx = box.cx + 14 + r * 2 + 14;
  const gw = box.cx + box.cw - 14 - gx;
  CONFIG.connect.forEach((item, i) => {
    const gy = top + i * (CONNECT_ROW_H + CONNECT_ROW_GAP);
    doc.add(bevel(gx, gy, gw, CONNECT_ROW_H, { raised: true, fill: C.face }));
    doc.add(doc.emoji(item.icon, { x: gx + 11, y: midline("px6", 12, gy, CONNECT_ROW_H) + 1, size: 12 }));
    doc.add(
      doc.text("px6", item.label, {
        x: gx + 30,
        y: midline("px6", 12.5, gy, CONNECT_ROW_H),
        size: 12.5,
        fill: C.ink,
      }),
      doc.text("px6", "›", {
        x: gx + gw - 11,
        y: midline("px6", 13, gy, CONNECT_ROW_H),
        size: 13,
        fill: C.muted2,
        anchor: "end",
      }),
    );
  });
}

/* ------------------------------------------------------------ quote + notify */

export function quoteHeight(w) {
  const lines = wrap("vt", CONFIG.quote.text, 18, w - 28 - 46);
  return WINBAR_H + 4 + 14 + Math.max(34, lines.length * 23 + 18) + 14;
}

export function quote(doc, { x, y, w, h }) {
  const inner = windowFrame(doc, { x, y, w, h, title: "Info", buttons: ["×"], barH: 21 });
  const ix = inner.cx + 14;
  const iy = inner.cy + 14;

  const r = 17;
  doc.add(
    `<circle cx="${ix + r}" cy="${iy + r}" r="${r}" fill="${C.teal}" stroke="${C.hi}" stroke-width="2"/>`,
    doc.text("ps2p", "i", {
      x: ix + r,
      y: midline("ps2p", 13, iy, r * 2),
      size: 13,
      fill: C.titlebarText,
      anchor: "middle",
    }),
  );

  const tx = ix + r * 2 + 12;
  const tw = inner.cx + inner.cw - 14 - tx;
  let ty = iy;
  for (const line of wrap("vt", CONFIG.quote.text, 18, tw)) {
    doc.add(doc.text("vt", line, { x: tx, y: topline("vt", 18, ty), size: 18, fill: C.ink }));
    ty += 23;
  }
  doc.add(
    doc.text("px", CONFIG.quote.author, {
      x: tx,
      y: topline("px", 11, ty + 4),
      size: 11,
      fill: C.muted,
    }),
  );
}

export function notifyHeight() {
  return TITLEBAR_H + 12 + 50 + 12;
}

export function notify(doc, { x, y, w, h }, data) {
  const box = panel(doc, { x, y, w, h, title: "NOTIFICATIONS" });
  const iy = box.cy + 12;
  doc.add(bevel(box.cx + 12, iy, box.cw - 24, 50, { raised: false, fill: C.inset }));

  doc.add(bevel(box.cx + 23, iy + 9, 32, 32, { raised: true, fill: C.green }));
  doc.add(
    doc.text("px", "↓", {
      x: box.cx + 39,
      y: midline("px", 16, iy + 9, 32),
      size: 16,
      fill: C.onGreen,
      anchor: "middle",
    }),
  );

  doc.add(
    doc.text("px7", CONFIG.notification.title, {
      x: box.cx + 66,
      y: topline("px7", 13, iy + 12),
      size: 13,
      fill: C.ink,
    }),
  );
  richText(doc, {
    str: CONFIG.notification.body,
    x: box.cx + 66,
    y: topline("vt", 15, iy + 29),
    size: 15,
    fill: C.muted,
  });

  const stamp = data.builtAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  doc.add(
    doc.text("vt", stamp, {
      x: box.cx + box.cw - 24,
      y: midline("vt", 14, iy, 50),
      size: 14,
      fill: C.muted2,
      anchor: "end",
    }),
  );
}

/* ---------------------------------------------------- contribution heatmap */

const CELL = 14;
const CELL_GAP = 3;
const CELL_STEP = CELL + CELL_GAP;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
// 0 → inset well, then a cream→teal ramp matching the palette.
const HEAT = [C.inset, "#b9c79c", "#87a983", "#4f8265", "#2f5449"];

/** 53 empty weeks ending today, so the grid renders even without API data. */
function emptyWeeks(now) {
  const weeks = [];
  for (let i = 52; i >= 0; i--) {
    const start = new Date(now.getTime() - i * 7 * 86_400_000);
    weeks.push({ start: start.toISOString().slice(0, 10), days: [0, 0, 0, 0, 0, 0, 0] });
  }
  return weeks;
}

/** Longest and current run of non-zero days. */
function streaks(weeks) {
  const days = weeks.flatMap((w) => w.days);
  let best = 0;
  let run = 0;
  for (const d of days) {
    run = d > 0 ? run + 1 : 0;
    if (run > best) best = run;
  }
  // Current streak may still be alive: ignore today if it has no commits yet.
  let cur = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i] > 0) cur++;
    else if (i === days.length - 1) continue;
    else break;
  }
  return { cur, best };
}

export function contribHeight() {
  return TITLEBAR_H + 12 + 20 + 7 * CELL_STEP - CELL_GAP + 10 + 20 + 12;
}

export function contributions(doc, { x, y, w, h }, data) {
  const cal = data.github.calendar;
  const box = panel(doc, {
    x,
    y,
    w,
    h,
    title: cal ? `CONTRIBUTIONS · ${cal.total} IN THE LAST YEAR` : "CONTRIBUTIONS",
  });
  const cx = box.cx + 14;
  const cw = box.cw - 28;
  let cy = box.cy + 12;

  const weeks = (cal?.weeks?.length ? cal.weeks : emptyWeeks(data.builtAt)).slice(
    -Math.floor((cw + CELL_GAP) / CELL_STEP),
  );
  const gridW = weeks.length * CELL_STEP - CELL_GAP;
  const gx = cx + Math.floor((cw - gridW) / 2);

  // Month labels along the top, at each month boundary.
  let lastMonth = -1;
  let lastLabelX = -Infinity;
  const monthBase = topline("vt", 14, cy);
  weeks.forEach((wk, i) => {
    if (!wk.start) return;
    const m = new Date(wk.start).getMonth();
    if (m === lastMonth) return;
    lastMonth = m;
    const lx = gx + i * CELL_STEP;
    if (lx - lastLabelX < 44 || lx + 34 > gx + gridW) return;
    doc.add(doc.text("vt", MONTHS[m], { x: lx, y: monthBase, size: 14, fill: C.muted }));
    lastLabelX = lx;
  });
  cy += 20;

  // The pixel grid itself.
  const max = Math.max(1, ...weeks.flatMap((wk) => wk.days));
  weeks.forEach((wk, i) => {
    wk.days.forEach((count, j) => {
      const level =
        count === 0 ? 0 : count >= max * 0.75 ? 4 : count >= max * 0.5 ? 3 : count >= max * 0.25 ? 2 : 1;
      doc.add(rect(gx + i * CELL_STEP, cy + j * CELL_STEP, CELL, CELL, HEAT[level]));
    });
  });
  cy += 7 * CELL_STEP - CELL_GAP + 10;

  // Footer: streaks on the left, LESS→MORE legend on the right.
  const footBase = midline("vt", 16, cy, 20);
  const { cur, best } = cal ? streaks(weeks) : { cur: 0, best: 0 };
  const footText = cal
    ? `STREAK ${cur} DAY${cur === 1 ? "" : "S"} · BEST ${best} DAYS`
    : "SYNC PENDING — LIVE GRID APPEARS AFTER THE FIRST CI BUILD";
  doc.add(doc.emoji("⚡", { x: gx, y: footBase, size: 13 }));
  doc.add(doc.text("vt", footText, { x: gx + 20, y: footBase, size: 16, fill: C.inkSoft }));

  let lx = gx + gridW - 5 * CELL_STEP - measure("px6", "LESS", 11) - measure("px6", "MORE", 11) - 16;
  doc.add(doc.text("px6", "LESS", { x: lx, y: midline("px6", 11, cy, 20), size: 11, fill: C.muted }));
  lx += measure("px6", "LESS", 11) + 8;
  HEAT.forEach((color, i) => {
    doc.add(rect(lx + i * CELL_STEP, cy + (20 - CELL) / 2, CELL, CELL, color));
  });
  lx += 5 * CELL_STEP + 8 - CELL_GAP;
  doc.add(doc.text("px6", "MORE", { x: lx, y: midline("px6", 11, cy, 20), size: 11, fill: C.muted }));
}

/* --------------------------------------------------------- featured projects */

export const PROJ_HEAD_H = 30;

export function projectsHeader(doc, { x, y, w }) {
  doc.add(bevel(x, y, w, PROJ_HEAD_H, { raised: true, fill: C.titlebar }));
  doc.add(doc.emoji("📌", { x: x + 12, y: midline("px6", 13, y, PROJ_HEAD_H) + 1, size: 13 }));
  doc.add(
    doc.text("px6", "FEATURED PROJECTS", {
      x: x + 32,
      y: midline("px6", 13, y, PROJ_HEAD_H),
      size: 13,
      fill: C.titlebarText,
      ls: 1,
    }),
    doc.text("vt", "▸ click a row to open it", {
      x: x + w - 12,
      y: midline("vt", 16, y, PROJ_HEAD_H),
      size: 16,
      fill: C.heroSub,
      anchor: "end",
    }),
  );
}

export const PROJ_ROW_H = 52;

export function projectRow(doc, { x, y, w }, repo, now) {
  doc.add(bevel(x, y, w, PROJ_ROW_H, { raised: true, fill: C.face }));
  doc.add(doc.emoji("📦", { x: x + 14, y: midline("px7", 20, y, PROJ_ROW_H) + 5, size: 20 }));

  const meta = [repo.language, `★ ${compact(repo.stars)}`, ago(repo.pushedAt, now)]
    .filter(Boolean)
    .join(" · ");
  const metaW = measure("vt", meta, 16);
  doc.add(
    doc.text("vt", meta, {
      x: x + w - 34,
      y: midline("vt", 16, y, PROJ_ROW_H),
      size: 16,
      fill: C.muted,
      anchor: "end",
    }),
    doc.text("px6", "›", {
      x: x + w - 14,
      y: midline("px6", 14, y, PROJ_ROW_H),
      size: 14,
      fill: C.muted2,
      anchor: "end",
    }),
  );

  const tx = x + 46;
  const maxW = x + w - 34 - metaW - 16 - tx;
  doc.add(
    doc.text("px7", truncate("px7", repo.name, 14, maxW), {
      x: tx,
      y: topline("px7", 14, y + 8),
      size: 14,
      fill: C.ink,
    }),
    doc.text("vt", truncate("vt", repo.description || "// no description yet", 15, maxW), {
      x: tx,
      y: topline("vt", 15, y + 28),
      size: 15,
      fill: C.muted,
    }),
  );
}

/* -------------------------------------------------------- SYNTHXX.AMP player */

export const WINAMP_H = 136;

export function winamp(doc, { x, y, w, h }) {
  const m = CONFIG.music;
  const inner = windowFrame(doc, { x, y, w, h, title: m.app, buttons: ["_", "□", "×"], barH: 22 });
  const pad = 10;
  const px = inner.cx + pad;
  const py = inner.cy + pad;
  const screenH = inner.ch - pad * 2 - 8 - 24;
  const screenW = Math.round(inner.cw * 0.55);

  /* --- track screen with scrolling marquee ------------------------------ */
  well(doc, { x: px, y: py, w: screenW, h: screenH, fill: C.heroShadow });
  doc.add(doc.text("px6", m.status, { x: px + 12, y: topline("px6", 11, py + 9), size: 11, fill: C.heroSub }));

  const tSize = 20;
  const tw = measure("vt", m.track, tSize);
  doc.add(`<clipPath id="scr"><rect x="${px + 2}" y="${py + 2}" width="${screenW - 4}" height="${screenH - 4}"/></clipPath>`);
  doc.add(
    `<g clip-path="url(#scr)"><g class="mq">` +
      doc.text("vt", m.track, { x: 0, y: topline("vt", tSize, py + 27), size: tSize, fill: C.heroTerm }) +
      `</g></g>`,
  );
  const period = Math.max(8, Math.round((screenW + tw) / 55));
  doc.extraCss +=
    `.mq{animation:mq ${period}s linear infinite}` +
    `@keyframes mq{from{transform:translateX(${px + screenW}px)}to{transform:translateX(${Math.round(px - tw)}px)}}`;

  // CRT scanlines over the whole screen.
  doc.add(
    `<pattern id="scan" width="1" height="3" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="#000" opacity="0.22"/></pattern>`,
    rect(px + 2, py + 2, screenW - 4, screenH - 4, "url(#scan)"),
  );

  /* --- animated EQ bars ------------------------------------------------- */
  const eq = well(doc, {
    x: px + screenW + 10,
    y: py,
    w: inner.cx + inner.cw - pad - (px + screenW + 10),
    h: screenH,
    fill: C.heroShadow,
  });
  doc.add(
    `<linearGradient id="eqg" x1="0" y1="1" x2="0" y2="0">` +
      `<stop offset="0" stop-color="${C.green}"/><stop offset="0.55" stop-color="${C.amber}"/>` +
      `<stop offset="1" stop-color="${C.red}"/></linearGradient>`,
  );
  const barW = 9;
  const barGap = 4;
  const bx0 = eq.cx + 8;
  const bTop = eq.cy + 6;
  const bH = eq.ch - 12;
  const bars = Math.floor((eq.cw - 16 + barGap) / (barW + barGap));
  for (let i = 0; i < bars; i++) {
    const delay = ((i * 137) % 90) / 100;
    const dur = (65 + ((i * 53) % 55)) / 100;
    doc.add(
      `<rect class="eq" x="${bx0 + i * (barW + barGap)}" y="${bTop}" width="${barW}" height="${bH}" ` +
        `fill="url(#eqg)" style="animation-duration:${dur}s;animation-delay:-${delay}s"/>`,
    );
  }
  doc.extraCss +=
    `.eq{transform-box:fill-box;transform-origin:50% 100%;animation:eq 1s ease-in-out infinite alternate}` +
    `@keyframes eq{from{transform:scaleY(0.12)}to{transform:scaleY(1)}}`;
  doc.add(rect(eq.cx, eq.cy, eq.cw, eq.ch, "url(#scan)"));

  /* --- transport controls ----------------------------------------------- */
  const rowY = py + screenH + 8;
  let bx = px;
  for (const glyph of ["◄◄", "►", "■", "►►"]) {
    bx += chip(doc, { x: bx, y: rowY, text: glyph, size: 15, font: "vt", h: 24, padX: 10 }) + 6;
  }
  bx += 8;
  doc.add(doc.text("px6", "VOL", { x: bx, y: midline("px6", 11, rowY, 24), size: 11, fill: C.muted }));
  bx += measure("px6", "VOL", 11) + 8;
  const trackW = 110;
  doc.add(
    bevel(bx, rowY + 9, trackW, 7, { raised: false, fill: C.inset }),
    bevel(bx + trackW * 0.7 - 5, rowY + 2, 10, 20, { raised: true, fill: C.face }),
  );
  doc.add(
    doc.text("vt", "STEREO · 44.1kHz · LOOP ∞", {
      x: inner.cx + inner.cw - pad,
      y: midline("vt", 16, rowY, 24),
      size: 16,
      fill: C.muted,
      anchor: "end",
    }),
  );
}

/* ---------------------------------------------------------------- status bar */

export const STATUSBAR_H = 24;

export function statusBar(doc, { x, y, w }, data) {
  doc.add(bevel(x, y, w, STATUSBAR_H, { raised: false, fill: C.panel }));
  doc.add(
    doc.text("px6", CONFIG.statusBar.left, {
      x: x + 10,
      y: midline("px6", 12, y, STATUSBAR_H),
      size: 12,
      fill: C.muted,
    }),
    doc.text("vt", `${CONFIG.statusBar.right} · SYNCED ${data.builtAt.toISOString().slice(0, 10)}`, {
      x: x + w - 10,
      y: midline("vt", 15, y, STATUSBAR_H),
      size: 15,
      fill: C.muted,
      anchor: "end",
    }),
  );
}
