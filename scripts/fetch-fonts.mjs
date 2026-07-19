/**
 * Downloads the latin subset of each pixel font as .woff2 into assets/fonts/.
 * Run once (or when you want to refresh); the files are committed so the
 * daily build never needs to hit Google Fonts.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "assets", "fonts");

// A modern UA is required or Google serves legacy .ttf instead of .woff2.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const FONTS = [
  { file: "press-start-2p.woff2", query: "family=Press+Start+2P" },
  { file: "vt323.woff2", query: "family=VT323" },
  { file: "pixelify-sans-400.woff2", query: "family=Pixelify+Sans:wght@400", weight: "400" },
  { file: "pixelify-sans-600.woff2", query: "family=Pixelify+Sans:wght@600", weight: "600" },
  { file: "pixelify-sans-700.woff2", query: "family=Pixelify+Sans:wght@700", weight: "700" },
];

/** Pull the `latin` subset URL out of a Google Fonts css2 response. */
function latinUrl(css) {
  // Each @font-face block is preceded by a `/* subset */` comment.
  const blocks = css.split("/*").map((b) => "/*" + b);
  const latin = blocks.find((b) => b.startsWith("/* latin */"));
  const match = (latin ?? css).match(/url\((https:\/\/[^)]+\.woff2)\)/);
  if (!match) throw new Error("no woff2 url found in css response");
  return match[1];
}

await mkdir(OUT, { recursive: true });

for (const font of FONTS) {
  const css = await fetch(`https://fonts.googleapis.com/css2?${font.query}&display=swap`, {
    headers: { "User-Agent": UA },
  }).then((r) => r.text());

  const res = await fetch(latinUrl(css), { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${font.file}: ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(path.join(OUT, font.file), buf);
  console.log(`${font.file.padEnd(28)} ${(buf.length / 1024).toFixed(1)} KB`);
}
