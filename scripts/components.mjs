/** Widgets composed from the retro-OS primitives. */
import { C, bevel, rect, measure, midline, topline } from "./theme.mjs";

export const TITLEBAR_H = 23; // flat panel header
export const WINBAR_H = 21; // beveled window header

/**
 * Flat panel with a teal caption bar — the `<div style="background:#d6cdb2">`
 * + header pattern used throughout the source design.
 */
export function panel(doc, { x, y, w, h, title }) {
  doc.add(
    rect(x, y, w, h, C.panel, `stroke="${C.panelBorder}" stroke-width="1"`),
    rect(x + 0.5, y + 0.5, w - 1, TITLEBAR_H, C.titlebar),
    doc.text("px6", title, {
      x: x + 10,
      y: midline("px6", 13, y, TITLEBAR_H),
      size: 13,
      fill: C.titlebarText,
      ls: 1,
    }),
  );
  return { cx: x, cy: y + TITLEBAR_H, cw: w, ch: h - TITLEBAR_H };
}

/** Beveled application window with a caption bar and control buttons. */
export function windowFrame(doc, { x, y, w, h, title, buttons = ["×"], barH = WINBAR_H }) {
  doc.add(bevel(x, y, w, h, { raised: true, fill: C.face }), rect(x + 2, y + 2, w - 4, barH, C.winbar));
  doc.add(
    doc.text("px6", title, {
      x: x + 8,
      y: midline("px6", 12.5, y + 2, barH),
      size: 12.5,
      fill: C.titlebarText,
    }),
  );

  // Control buttons, laid out right-to-left.
  const bw = 16;
  const bh = 14;
  let bx = x + w - 6 - bw;
  const by = y + 2 + (barH - bh) / 2;
  for (const glyph of [...buttons].reverse()) {
    doc.add(
      bevel(bx, by, bw, bh, { raised: true, fill: C.face }),
      doc.text("px6", glyph, {
        x: bx + bw / 2,
        y: midline("px6", glyph === "□" ? 9 : 11, by, bh),
        size: glyph === "□" ? 9 : 11,
        fill: C.ink,
        anchor: "middle",
      }),
    );
    bx -= bw + 3;
  }
  return { cx: x + 2, cy: y + 2 + barH, cw: w - 4, ch: h - 4 - barH };
}

/**
 * Beveled button / tag. Width is derived from real font metrics so the
 * padding is even regardless of label length.
 */
export function chip(
  doc,
  { x, y, text, size = 13, font = "px6", bg = C.face, fg = C.ink, padX = 12, h = 24, raised = true },
) {
  const w = Math.ceil(measure(font, text, size) + padX * 2);
  doc.add(
    bevel(x, y, w, h, { raised, fill: bg }),
    doc.text(font, text, {
      x: x + w / 2,
      y: midline(font, size, y, h),
      size,
      fill: fg,
      anchor: "middle",
    }),
  );
  return w;
}

/** Inset well containing a proportional fill. `pattern` draws the dithered bar. */
export function progressBar(doc, { x, y, w, h, pct, fill, pattern = false }) {
  doc.add(bevel(x, y, w, h, { raised: false, fill: C.inset }));
  const inner = Math.max(0, (w - 4) * Math.min(1, pct));
  if (inner > 0) {
    doc.add(
      rect(x + 2, y + 2, inner, h - 4, pattern ? "url(#dither)" : fill),
    );
  }
}

/** The repeating 8px/3px stripe used behind the language bars. */
export function ditherDef() {
  return (
    `<defs><pattern id="dither" width="11" height="1" patternUnits="userSpaceOnUse">` +
    `<rect width="8" height="1" fill="${C.teal}"/>` +
    `<rect x="8" width="3" height="1" fill="${C.tealLite}"/>` +
    `</pattern></defs>`
  );
}

/** Inset "sunken" content well. */
export function well(doc, { x, y, w, h, fill = C.inset }) {
  doc.add(bevel(x, y, w, h, { raised: false, fill }));
  return { cx: x + 2, cy: y + 2, cw: w - 4, ch: h - 4 };
}

/** Label + inset bar + right-aligned value, as used in the stats panels. */
export function meterRow(doc, { x, y, w, label, pct, value, color, labelW = 78, valueW = 36, pattern = false }) {
  const barX = x + labelW + 8;
  const barW = w - labelW - valueW - 16;
  doc.add(
    doc.text("px6", label, { x, y: midline("px6", 12, y, 16), size: 12, fill: color ?? C.inkSoft }),
  );
  progressBar(doc, { x: barX, y, w: barW, h: 16, pct, fill: color ?? C.teal, pattern });
  doc.add(
    doc.text("vt", value, {
      x: x + w,
      y: midline("vt", 16, y, 16),
      size: 16,
      fill: C.ink,
      anchor: "end",
    }),
  );
}

/** Word-wraps `text` to `maxWidth`, returning an array of lines. */
export function wrap(fontKey, text, size, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (measure(fontKey, next, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Indian flag drawn as vector. The 🇮🇳 emoji is a regional-indicator pair that
 * Windows has no glyph for, and the SVG is rasterised by the viewer's browser —
 * so relying on the emoji shows a bare "IN" to most visitors.
 */
export function flagIN(x, y, h) {
  const w = h * 1.5;
  const band = h / 3;
  return (
    `<g>` +
    rect(x, y, w, band, "#ff9933") +
    rect(x, y + band, w, band, "#ffffff") +
    rect(x, y + band * 2, w, band, "#138808") +
    `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${band * 0.42}" fill="none" stroke="#000080" stroke-width="${Math.max(0.7, h / 16)}"/>` +
    rect(x, y, w, h, "none", `stroke="${C.muted2}" stroke-width="0.5"`) +
    `</g>`
  );
}

/**
 * Draws text containing the `{IN}` token, substituting the vector flag.
 * Returns the total advance so callers can continue the line.
 */
export function richText(doc, { fontKey = "vt", str, x, y, size, fill, ...rest }) {
  const parts = String(str).split("{IN}");
  let cx = x;
  const out = [];
  parts.forEach((part, i) => {
    if (part) {
      out.push(doc.text(fontKey, part, { x: cx, y, size, fill, ...rest }));
      cx += measure(fontKey, part, size);
    }
    if (i < parts.length - 1) {
      const fh = size * 0.7;
      out.push(flagIN(cx + size * 0.1, y - fh * 0.95, fh));
      cx += fh * 1.5 + size * 0.25;
    }
  });
  doc.add(...out);
  return cx - x;
}

/** GitHub file-viewer chrome: traffic lights + breadcrumb. */
export function ghChrome(doc, { x, y, w, h, repo, file }) {
  doc.add(rect(x, y, w, h, C.ghHead), rect(x, y + h - 1, w, 1, C.ghRule));
  const dots = ["#ff5f56", "#ffbd2e", "#27c93f"];
  dots.forEach((color, i) => {
    doc.add(`<circle cx="${x + 20 + i * 20}" cy="${y + h / 2}" r="6" fill="${color}"/>`);
  });
  const tx = x + 20 + dots.length * 20 + 4;
  const by = midline("px6", 13, y, h);
  doc.add(doc.text("px6", `${repo} / `, { x: tx, y: by, size: 13, fill: C.ghDim }));
  doc.add(
    doc.text("px6", file, {
      x: tx + measure("px6", `${repo} / `, 13),
      y: by,
      size: 13,
      fill: C.ghText,
    }),
  );
}

export { midline, topline };
