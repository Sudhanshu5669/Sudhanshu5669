/**
 * Screenshots .preview.html (written by build.mjs, mirroring the README's
 * slice layout) through headless Chrome exactly the way GitHub renders it —
 * SVGs inside <img>, external resources blocked, only inlined base64 fonts.
 * Catches font/layout regressions that opening the .svg directly would hide.
 *
 *   node scripts/preview.mjs
 */
import { readFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, ".preview");

const BROWSERS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
];
const browser = BROWSERS.find((b) => existsSync(b));
if (!browser) throw new Error("no Chrome/Edge found for preview rendering");

await mkdir(OUT, { recursive: true });

// build.mjs embeds the page size as <!--size:WxH-->.
const html = await readFile(path.join(ROOT, ".preview.html"), "utf8");
const size = html.match(/<!--size:(\d+)x(\d+)-->/);
if (!size) throw new Error(".preview.html missing size marker — run `npm run build` first");
const [, width, height] = size.map(Number);

const png = path.join(OUT, "card.png");
execFileSync(
  browser,
  [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--screenshot=${png}`,
    `--window-size=${width},${height}`,
    `file:///${path.join(ROOT, ".preview.html").replace(/\\/g, "/")}`,
  ],
  { stdio: "pipe" },
);

console.log(`preview → ${png}  (${width}×${height})`);
