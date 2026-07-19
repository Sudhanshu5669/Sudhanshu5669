/**
 * Renders the built SVGs through headless Chrome exactly the way GitHub does
 * — inside an <img>, where external resources are blocked and only the
 * inlined base64 fonts are available. Catches font/layout regressions that
 * opening the .svg directly would hide.
 *
 *   node scripts/preview.mjs
 */
import { writeFile, readFile, mkdir } from "node:fs/promises";
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

// Pull the intrinsic height out of the SVG so the screenshot isn't cropped.
const card = await readFile(path.join(ROOT, "assets", "card.svg"), "utf8");
const height = Number(card.match(/height="(\d+(?:\.\d+)?)"/)[1]);
const width = Number(card.match(/width="(\d+(?:\.\d+)?)"/)[1]);

const html = `<!doctype html><meta charset="utf-8">
<body style="margin:0;background:#fff">
<img src="assets/card.svg" width="${width}">
</body>`;
await writeFile(path.join(ROOT, ".preview.html"), html);

const png = path.join(OUT, "card.png");
execFileSync(
  browser,
  [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--screenshot=${png}`,
    `--window-size=${width},${Math.ceil(height)}`,
    `file:///${path.join(ROOT, ".preview.html").replace(/\\/g, "/")}`,
  ],
  { stdio: "pipe" },
);

console.log(`preview → ${png}  (${width}×${Math.ceil(height)})`);
