# Alki Brand Assets

Generated brand marks for Alki. Colors and typography match the live app exactly
(`src/app/AlkiApp.jsx`):

- **Typeface:** Syne ExtraBold (weight 800)
- **Accent green:** `#1ae87a` (the app's `S.accent` — what the wordmark actually renders)
- **Ground:** `#0a0a0a`
- **Wordmark:** "AL" in white, "KI" in accent green, letter-spacing `-0.03em`

## Files

| File | Size | Background | Intended use |
|------|------|------------|--------------|
| `icon-1024.png` | 1024×1024 | opaque `#0a0a0a` | **App Store icon master.** Single Syne "A", fully opaque, square corners (Apple applies its own rounded mask), ~12% margin. |
| `icon-512.png` | 512×512 | opaque `#0a0a0a` | **Stripe icon** (and any 512 app-icon slot). Downscaled from the master. |
| `icon-128.png` | 128×128 | opaque `#0a0a0a` | General-purpose small icon. Downscaled from the master. |
| `icon-32.png` | 32×32 | opaque `#0a0a0a` | **Favicon.** Downscaled from the master; still legible. |
| `wordmark.png` | 1200×400 | **transparent** | **Stripe logo** / any place needing the wordmark over its own background. |
| `wordmark-dark.png` | 1200×400 | opaque `#0a0a0a` | Wordmark for contexts that require an opaque image (e.g. light or unknown backgrounds). |

## Regenerating

```bash
node brand/_generator/generate.mjs
```

The generator (`_generator/generate.mjs`) renders the marks in Playwright with the
bundled Syne woff2 (`_generator/fonts/Syne-ExtraBold.woff2`), screenshots them,
then trims + recomposes with sharp so centering and padding are pixel-exact. The
icon master is rendered once at 1024 and the smaller icons are downscaled from it
(not re-rendered). The font is bundled locally so the headless browser never falls
back to a system serif.
