/**
 * Retro-OS design system, ported from the Claude Design source.
 * Palette and metrics are lifted 1:1 from "Readme Vaporwave.dc.html".
 */
import * as fontkit from "fontkit";
import subsetFont from "subset-font";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FONT_DIR = path.join(ROOT, "assets", "fonts");

/* ------------------------------------------------------------------ palette */

export const C = {
  desktop: "#cabf9f",
  panel: "#d6cdb2",
  panelBorder: "#a89e7e",
  titlebar: "#2f4b43",
  titlebarText: "#e9e1c6",
  face: "#cec5a8", // window / button face
  winbar: "#34524a",
  inset: "#e7dfc6",
  heroShadow: "#16302a",
  heroSub: "#8fb9a9",
  heroTerm: "#7ea695",
  teal: "#356257",
  tealLite: "#3f7365",
  green: "#3f9d5c",
  onGreen: "#f4f1e6",
  ink: "#23241f",
  inkSoft: "#3a3628",
  muted: "#5c5540",
  muted2: "#8a8064",
  amber: "#d19a3d",
  red: "#b34a3a",
  yamlKey: "#2f6b5c",
  // GitHub card chrome
  ghBg: "#0d1117",
  ghBorder: "#30363d",
  ghHead: "#161b22",
  ghRule: "#21262d",
  ghDim: "#7d8590",
  ghText: "#e6edf3",
  // bevel edges
  hi: "#f4eeda",
  lo: "#7c745a",
};

/* -------------------------------------------------------------------- fonts */

const FONT_FILES = {
  ps2p: { file: "press-start-2p.woff2", family: "PS2P", weight: 400 },
  vt: { file: "vt323.woff2", family: "VT", weight: 400 },
  px: { file: "pixelify-sans-400.woff2", family: "PX", weight: 400 },
  px6: { file: "pixelify-sans-600.woff2", family: "PX", weight: 600 },
  px7: { file: "pixelify-sans-700.woff2", family: "PX", weight: 700 },
};

const loaded = new Map();
function font(key) {
  if (!loaded.has(key)) {
    const meta = FONT_FILES[key];
    if (!meta) throw new Error(`unknown font "${key}"`);
    const buf = readFileSync(path.join(FONT_DIR, meta.file));
    loaded.set(key, { ...meta, buf, kit: fontkit.create(buf) });
  }
  return loaded.get(key);
}

/** Advance width of `str` at `size` px, in px. */
export function measure(key, str, size, ls = 0) {
  const f = font(key);
  // Strip characters the pixel font has no glyph for (emoji); they fall back to
  // a system font whose advance is roughly square.
  let width = 0;
  let fallback = 0;
  for (const ch of String(str)) {
    if (f.kit.hasGlyphForCodePoint(ch.codePointAt(0))) {
      width += f.kit.layout(ch).advanceWidth;
    } else {
      fallback += 1;
    }
  }
  return (
    (width / f.kit.unitsPerEm) * size + fallback * size * 1.15 + ls * Math.max(0, [...String(str)].length - 1)
  );
}

/** Baseline y that vertically centres cap-height text inside a box. */
export function midline(key, size, boxY, boxH) {
  const f = font(key);
  const cap = (f.kit.capHeight ?? f.kit.ascent * 0.7) / f.kit.unitsPerEm;
  return boxY + boxH / 2 + (cap * size) / 2;
}

/** Baseline y for text whose visual top should sit at `top`. */
export function topline(key, size, top) {
  const f = font(key);
  return top + (f.kit.ascent / f.kit.unitsPerEm) * size;
}

/* ------------------------------------------------------------------ escaping */

export const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* ---------------------------------------------------------------- primitives */

const n = (v) => Math.round(v * 100) / 100;

/**
 * Classic 2px chiselled border. `raised` mimics the .rz class (light top-left),
 * inset mimics .iz (dark top-left).
 */
export function bevel(x, y, w, h, { raised = true, fill = null } = {}) {
  const [tl, br] = raised ? [C.hi, C.lo] : [C.lo, C.hi];
  const t = 2;
  const topLeft = `M${n(x)},${n(y + h)} L${n(x)},${n(y)} L${n(x + w)},${n(y)} L${n(x + w - t)},${n(y + t)} L${n(x + t)},${n(y + t)} L${n(x + t)},${n(y + h - t)} Z`;
  const botRight = `M${n(x + w)},${n(y)} L${n(x + w)},${n(y + h)} L${n(x)},${n(y + h)} L${n(x + t)},${n(y + h - t)} L${n(x + w - t)},${n(y + h - t)} L${n(x + w - t)},${n(y + t)} Z`;
  return [
    fill ? `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}"/>` : "",
    `<path d="${topLeft}" fill="${tl}"/>`,
    `<path d="${botRight}" fill="${br}"/>`,
  ].join("");
}

export function rect(x, y, w, h, fill, extra = "") {
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}"${extra ? " " + extra : ""}/>`;
}

/* ------------------------------------------------------------------ document */

export class Doc {
  constructor(width) {
    this.width = width;
    this.parts = [];
    this.used = new Map(); // fontKey -> Set of chars
    this.extraCss = "";
  }

  add(...svg) {
    this.parts.push(...svg.filter(Boolean));
    return this;
  }

  /** Record glyph usage so the embedded font can be subset down to it. */
  #note(key, str) {
    if (!this.used.has(key)) this.used.set(key, new Set());
    const set = this.used.get(key);
    for (const ch of String(str)) set.add(ch);
  }

  /**
   * Text node. `y` is the baseline. `anchor` is start|middle|end.
   * Pixel fonts carry no emoji, so a system stack is appended for fallback.
   */
  text(key, str, { x, y, size, fill, anchor = "start", opacity, cls, ls = 0 } = {}) {
    const f = font(key);
    this.#note(key, str);
    const a = anchor === "start" ? "" : ` text-anchor="${anchor}"`;
    const o = opacity == null ? "" : ` opacity="${opacity}"`;
    const c = cls ? ` class="${cls}"` : "";
    const l = ls ? ` letter-spacing="${ls}"` : "";
    return `<text x="${n(x)}" y="${n(y)}" font-family="${f.family}, 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif" font-weight="${f.weight}" font-size="${size}" fill="${fill}"${a}${o}${c}${l}>${esc(str)}</text>`;
  }

  /** Emoji-only glyph: skip the pixel font entirely. */
  emoji(str, { x, y, size, anchor = "start" } = {}) {
    const a = anchor === "start" ? "" : ` text-anchor="${anchor}"`;
    return `<text x="${n(x)}" y="${n(y)}" font-family="'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif" font-size="${size}"${a}>${esc(str)}</text>`;
  }

  /** Build the @font-face block, subsetting each face to the glyphs used. */
  async #fontCss() {
    const faces = [];
    for (const [key, chars] of this.used) {
      const f = font(key);
      const text = [...chars].join("");
      if (!text) continue;
      let buf;
      try {
        buf = await subsetFont(f.buf, text, { targetFormat: "woff2" });
      } catch {
        buf = f.buf; // subsetting failed: ship the full face rather than break
      }
      faces.push(
        `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};` +
          `src:url(data:font/woff2;base64,${buf.toString("base64")}) format('woff2');}`,
      );
    }
    return faces.join("");
  }

  async render(height) {
    const css = (await this.#fontCss()) + this.extraCss;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${n(height)}" ` +
      `viewBox="0 0 ${this.width} ${n(height)}" role="img">` +
      `<style>${css}</style>` +
      this.parts.join("") +
      `</svg>`
    );
  }
}
