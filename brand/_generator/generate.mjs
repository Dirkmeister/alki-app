// Alki brand-asset generator.
//
// Renders the ALKI brand mark in Playwright with the Syne font (bundled locally
// as a woff2 so the headless browser never falls back to a serif), screenshots
// it, then composites/downscales the final assets with sharp.
//
// Brand truth, pulled from src/app/AlkiApp.jsx:
//   - Wordmark: Syne, font-weight 800, letter-spacing -0.03em.
//     "AL" in #fff, "KI" in S.accent (#1ae87a). Ground #0a0a0a.
//   - Icon: a single bold Syne "A" in #1ae87a on solid #0a0a0a.
//
// Run from repo root:  node brand/_generator/generate.mjs

import { chromium } from "playwright";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const BRAND = path.resolve(here, "..");           // brand/
const OUT = (f) => path.join(BRAND, f);

// Brand constants (match the app exactly)
const ACCENT = "#1ae87a";
const WHITE = "#ffffff";
const GROUND = "#0a0a0a";

// Bundle the Syne woff2 as a data URI so rendering is deterministic and offline.
const woff2 = fs.readFileSync(path.join(here, "fonts", "Syne-ExtraBold.woff2"));
const FONT_CSS = `
@font-face {
  font-family: 'Syne';
  font-style: normal;
  font-weight: 800;
  font-display: block;
  src: url(data:font/woff2;base64,${woff2.toString("base64")}) format('woff2');
}
html, body { margin: 0; padding: 0; }
`;

// Render some inline HTML into a fixed viewport and return a PNG buffer.
// omitBackground=true gives a transparent screenshot.
async function shoot(browser, { width, height, bodyBg, html, omitBackground }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>${FONT_CSS}
     body { width:${width}px; height:${height}px; background:${bodyBg}; }</style></head>
     <body>${html}</body></html>`,
    { waitUntil: "load" }
  );
  // Force the font to load before we paint anything.
  await page.evaluate(async () => {
    await document.fonts.load("800 100px Syne");
    await document.fonts.ready;
  });
  const buf = await page.screenshot({ omitBackground: !!omitBackground });
  await page.close();
  return buf;
}

async function main() {
  const browser = await chromium.launch();

  // ---- 1. APP ICON MASTER (1024, opaque, square corners) ----------------
  // Render the "A" big on the ground colour, trim to the glyph's ink box, then
  // recompose centered with a clean 12% margin. Trimming + recomposing makes the
  // centering pixel-exact and the padding precise regardless of font metrics.
  const ICON = 1024;
  const PAD = 0.12;                                   // 12% margin on each side
  const inner = Math.round(ICON * (1 - 2 * PAD));     // glyph fits in inner box

  const glyphShot = await shoot(browser, {
    width: 1400, height: 1400, bodyBg: GROUND,
    html: `<div style="width:1400px;height:1400px;display:flex;align-items:center;justify-content:center;">
             <span style="font-family:'Syne';font-weight:800;font-size:1000px;line-height:1;color:${ACCENT};">A</span>
           </div>`,
  });

  // Trim the solid ground away to get a tight crop of the "A".
  const glyph = await sharp(glyphShot).trim().toBuffer();
  const glyphMeta = await sharp(glyph).metadata();

  // Scale the glyph so its larger side == inner box, keep aspect.
  const scaled = await sharp(glyph)
    .resize({ width: inner, height: inner, fit: "inside", kernel: "lanczos3" })
    .toBuffer();
  const scaledMeta = await sharp(scaled).metadata();

  const left = Math.round((ICON - scaledMeta.width) / 2);
  const top = Math.round((ICON - scaledMeta.height) / 2);

  await sharp({ create: { width: ICON, height: ICON, channels: 3, background: GROUND } })
    .composite([{ input: scaled, left, top }])
    .removeAlpha()                                   // fully opaque, no alpha channel
    .png()
    .toFile(OUT("icon-1024.png"));

  // ---- 2. Downscaled icons (from the 1024 master, not re-rendered) -------
  const master = fs.readFileSync(OUT("icon-1024.png"));
  for (const size of [512, 128, 32]) {
    await sharp(master)
      .resize(size, size, { kernel: "lanczos3" })
      .removeAlpha()
      .png()
      .toFile(OUT(`icon-${size}.png`));
  }

  // ---- 3. WORDMARK (1200x400, transparent) -------------------------------
  // "AL" white + "KI" accent, Syne 800, letter-spacing -0.03em (the app header).
  // Render big on transparent, trim, then center inside 1200x400 with margin.
  const W = 1200, H = 400;
  const markHtml = `
    <div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
      <span style="font-family:'Syne';font-weight:800;font-size:280px;line-height:1;letter-spacing:-0.03em;white-space:nowrap;">
        <span style="color:${WHITE};">AL</span><span style="color:${ACCENT};">KI</span>
      </span>
    </div>`;

  const wordShot = await shoot(browser, {
    width: 1600, height: 700, bodyBg: "transparent", omitBackground: true, html: markHtml,
  });

  const word = await sharp(wordShot).trim().toBuffer();   // tight transparent crop
  // Fit within an inner box that leaves a comfortable margin in the 1200x400 frame.
  const wordScaled = await sharp(word)
    .resize({ width: Math.round(W * 0.86), height: Math.round(H * 0.66), fit: "inside", kernel: "lanczos3" })
    .toBuffer();
  const wm = await sharp(wordScaled).metadata();
  const wLeft = Math.round((W - wm.width) / 2);
  const wTop = Math.round((H - wm.height) / 2);

  // Transparent version
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: wordScaled, left: wLeft, top: wTop }])
    .png()
    .toFile(OUT("wordmark.png"));

  // Opaque-ground version
  await sharp({ create: { width: W, height: H, channels: 4, background: GROUND } })
    .composite([{ input: wordScaled, left: wLeft, top: wTop }])
    .flatten({ background: GROUND })
    .removeAlpha()
    .png()
    .toFile(OUT("wordmark-dark.png"));

  await browser.close();

  // ---- 4. Verify ---------------------------------------------------------
  const report = {};

  // Icon master: opaque (no alpha channel) + square + corner == ground.
  const iconMeta = await sharp(OUT("icon-1024.png")).metadata();
  const corner = await sharp(OUT("icon-1024.png"))
    .extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
  report.icon = {
    size: `${iconMeta.width}x${iconMeta.height}`,
    hasAlpha: iconMeta.hasAlpha,
    channels: iconMeta.channels,
    cornerRGB: [corner[0], corner[1], corner[2]],   // expect ~[10,10,10]
  };

  // Wordmark: real transparency (alpha min == 0) + correct size.
  const wMeta = await sharp(OUT("wordmark.png")).metadata();
  const wStats = await sharp(OUT("wordmark.png")).stats();
  const alphaCh = wStats.channels[3];
  report.wordmark = {
    size: `${wMeta.width}x${wMeta.height}`,
    hasAlpha: wMeta.hasAlpha,
    alphaMin: alphaCh ? alphaCh.min : "no-alpha",
    alphaMax: alphaCh ? alphaCh.max : "no-alpha",
  };

  // Echo glyph trim info so we can sanity-check Syne actually rendered something.
  report.glyphTrim = { width: glyphMeta.width, height: glyphMeta.height };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
