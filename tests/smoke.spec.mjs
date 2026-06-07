#!/usr/bin/env node
// tests/smoke.spec.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Alki post-build smoke test. Run directly:  node tests/smoke.spec.mjs
//
// Drives the first-run flow  splash → age gate → (auth guest) → onboarding →
// dashboard, then best-effort sweeps the dashboard sub-screens. On every screen
// it checks for: console errors, uncaught page errors, visible "undefined"/"NaN"
// text, broken <img> elements, and 404 / 5xx network resources. Any screen with
// problems is screenshotted to tests/screenshots/ and auto-filed as one row in
// the Supabase `feedback` table.
//
// Uses the `playwright` library directly (the @playwright/test runner is NOT
// installed). Reads its own Supabase creds + build version — never imports app
// source. `tests/` is gitignored.
//
// Runs against a real production build (`next build` + `next start`) on a
// dedicated port — never the dev server — so a chunk 500 means a real build
// problem, not dev compile noise.
//
// Filed rows use the feedback table's `device` ("auto-smoke") and `build`
// (package.json version) columns. Dedupe is keyed on screen + a build-independent
// failure signature (embedded as "[sig:XXX]" in the description): at most one
// OPEN auto-smoke row per distinct failure, so one root cause can't spam the table.
// ─────────────────────────────────────────────────────────────────────────────

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
// Smoke always runs against a real PRODUCTION build on a DEDICATED port — never
// the dev server on 3000. `next dev` compiles chunks on demand, so the first hit
// to a route can transiently 500 (normal dev noise). Against `next start` a 500
// means a genuine build problem. Using our own port (not 3000) also stops us from
// silently reusing whatever dev server a developer happens to have running.
const SMOKE_PORT = process.env.SMOKE_PORT || '3210';
const BASE_URL = process.env.SMOKE_URL || `http://localhost:${SMOKE_PORT}`;
const SHOT_DIR = path.join(__dirname, 'screenshots');
// Dry run: walk + report but never touch Supabase (used while iterating on the harness).
const DRY_RUN = !!process.env.SMOKE_DRY_RUN;

// Known-benign noise we never want to file as a bug.
const IGNORE = [
  /ResizeObserver loop/i,
  /React DevTools/i,
  /favicon/i,
  /Download the React/i,
  /\/_next\/static\/.*\.map\b/i,
];

// ── small utilities ──────────────────────────────────────────────────────────
function readEnvLocal() {
  const out = {};
  const p = path.join(ROOT, '.env.local');
  if (!existsSync(p)) return out;
  for (const raw of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

function getVersion() {
  try { return JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version || 'unknown'; }
  catch { return 'unknown'; }
}

// Stable fingerprint of one screen's set of failures. We normalize away the
// volatile bits (ports, build/chunk hashes, ids, bare numbers, whitespace) so the
// SAME underlying failure produces the SAME signature across runs and builds. The
// signature is embedded in the filed row's description as "[sig:XXX]" and used to
// dedupe — at most one OPEN auto-smoke row per (screen + signature).
function failureSignature(errs) {
  const norm = errs.map(e => {
    const d = String(e.detail).toLowerCase()
      .replace(/https?:\/\/[^\s)]+/g, 'URL')   // whole URLs (ports/hashes/ids vary)
      .replace(/\b[0-9a-f]{8,}\b/g, 'HASH')      // build ids / chunk hashes
      .replace(/\b\d+\b/g, 'N')                  // any remaining bare numbers
      .replace(/\s+/g, ' ').trim();
    return `${e.type}:${d}`;
  });
  const uniq = Array.from(new Set(norm)).sort().join('|');
  // djb2 → base36, short and collision-resistant enough for a dedupe key.
  let h = 5381;
  for (let i = 0; i < uniq.length; i++) h = (((h << 5) + h) ^ uniq.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

async function serverUp(url) {
  try { const r = await fetch(url, { method: 'GET' }); return r.status < 500; }
  catch { return false; }
}

async function waitForServer(url, ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (await serverUp(url)) return true;
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

function killTree(child) {
  if (!child) return;
  try {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(-child.pid, 'SIGTERM');
  } catch { /* ignore */ }
}

// Bring up a PRODUCTION server on our dedicated smoke port. We never run against
// `next dev` (transient chunk 500s) and never reuse the developer's port-3000
// server. If a production build is missing, build it first (`next build`), then
// serve it (`next start -p SMOKE_PORT`). If something is already answering on our
// own smoke port we reuse it — that port is ours, so it's the prod server.
async function ensureServer() {
  if (await serverUp(BASE_URL)) {
    console.log(`Smoke: reusing production server already at ${BASE_URL}`);
    return null; // not owned — leave it running
  }
  // Ensure a production build exists. The post-build hook already ran `next build`,
  // so BUILD_ID is normally present and we skip straight to `next start`.
  if (!existsSync(path.join(ROOT, '.next', 'BUILD_ID'))) {
    console.log('Smoke: no production build found — running "npm run build"...');
    const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit', shell: true });
    if (b.status !== 0 || !existsSync(path.join(ROOT, '.next', 'BUILD_ID'))) {
      console.error('Smoke: production build failed — cannot smoke.');
      return undefined;
    }
  }
  console.log(`Smoke: starting "npm run start" (production) on port ${SMOKE_PORT}...`);
  const child = spawn('npm', ['run', 'start', '--', '-p', String(SMOKE_PORT)], {
    cwd: ROOT, stdio: 'ignore', shell: true, detached: process.platform !== 'win32',
  });
  const ok = await waitForServer(BASE_URL, 60000);
  if (ok) { console.log('Smoke: production server ready.'); return child; }
  killTree(child);
  return undefined; // couldn't start one
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  mkdirSync(SHOT_DIR, { recursive: true });
  const env = readEnvLocal();
  const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Dedupe has to READ existing rows. The feedback table's RLS only lets the
  // `authenticated` role SELECT; the anon key authenticates as `anon`, so an
  // anon-key read returns ZERO rows and dedupe silently fails — every run then
  // files a fresh duplicate (this is exactly how 28 copies of each failure piled
  // up). The service-role key bypasses RLS, so we prefer it for the harness
  // client. It's read at runtime from the gitignored .env.local and is never
  // committed or hardcoded. Fall back to the anon key (insert still works via the
  // public INSERT policy, but dedupe will be unreliable — we warn below).
  const SUPA_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SUPA_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const SUPA_KEY = SUPA_SERVICE_KEY || SUPA_ANON_KEY;
  const SUPA_KEY_KIND = SUPA_SERVICE_KEY ? 'service-role' : 'anon';
  const VERSION = getVersion();

  const owned = await ensureServer();
  if (owned === undefined) {
    console.error(`Smoke: could not reach or start a server at ${BASE_URL}. Build first (npm run build) or start the app.`);
    process.exit(0);
  }

  const errors = [];          // { screen, type, detail }
  const shotTaken = new Set();
  let currentScreen = 'boot';
  const pushErr = (type, detail) => {
    const d = String(detail).slice(0, 600);
    if (IGNORE.some(rx => rx.test(d))) return;
    errors.push({ screen: currentScreen, type, detail: d });
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); // mobile (Austin tests on mobile)
  // Sprint 6.5 — the first-run intro overlay blocks the dashboard. Pre-set its
  // per-device "seen" flag (and the projection nudge flag) before any page
  // script runs so the sweep reaches the dashboard cleanly. addInitScript runs
  // before page load on every navigation in this context.
  await context.addInitScript(() => {
    try {
      localStorage.setItem('alki_tutorial_seen', '1');
      localStorage.setItem('alki_nudge_projection_seen', '1');
    } catch (e) { /* ignore */ }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000); // never hang 30s on a missing/disabled control

  page.on('console', msg => { if (msg.type() === 'error') pushErr('console', msg.text()); });
  page.on('pageerror', err => pushErr('pageerror', err?.message || err));
  page.on('requestfailed', req => pushErr('network', `requestfailed ${req.url()} (${req.failure()?.errorText || ''})`));
  page.on('response', resp => {
    const s = resp.status();
    if (s === 404 || s >= 500) pushErr('network', `HTTP ${s} ${resp.url()}`);
  });

  const visible = async (loc, timeout = 4000) => {
    try { await loc.first().waitFor({ state: 'visible', timeout }); return true; } catch { return false; }
  };
  const screenshot = async (label) => {
    const safe = label.replace(/[^a-z0-9_-]+/gi, '_');
    const file = path.join(SHOT_DIR, `${safe}-${Date.now()}.png`);
    try { await page.screenshot({ path: file, fullPage: true }); return file; } catch { return null; }
  };
  // A click that never hangs: returns false (not throws) if not clickable.
  const safeClick = async (loc, timeout = 6000) => {
    try { await loc.first().click({ timeout }); return true; } catch { return false; }
  };
  // Fill a number input by its (exact) placeholder, verifying the value stuck.
  // React controlled inputs sometimes ignore .fill(); fall back to typing.
  const fillNum = async (placeholder, value) => {
    const inp = page.getByPlaceholder(placeholder, { exact: true }).first();
    if (!(await visible(inp, 4000))) { pushErr('navigation', `input placeholder "${placeholder}" not found`); return false; }
    try {
      await inp.click({ timeout: 4000 });
      await inp.fill(String(value), { timeout: 4000 });
      if ((await inp.inputValue()) !== String(value)) {
        await inp.fill('', { timeout: 2000 }).catch(() => {});
        await inp.pressSequentially(String(value), { timeout: 4000 });
      }
      const ok = (await inp.inputValue()) === String(value);
      if (!ok) pushErr('navigation', `could not set "${placeholder}" to ${value}`);
      return ok;
    } catch (e) { pushErr('navigation', `fill "${placeholder}" failed: ${e.message}`); return false; }
  };
  const selectIdx = async (i, value) => {
    try { await page.locator('select').nth(i).selectOption(value, { timeout: 4000 }); return true; } catch { return false; }
  };
  async function checkScreen(label) {
    currentScreen = label;
    await page.waitForTimeout(500); // let the screen settle + async errors flush
    try {
      const txt = await page.evaluate(() => (document.body ? document.body.innerText : ''));
      if (/\bundefined\b/.test(txt)) pushErr('dom', 'Visible "undefined" text in DOM');
      if (/\bNaN\b/.test(txt)) pushErr('dom', 'Visible "NaN" text in DOM');
    } catch { /* ignore */ }
    try {
      const broken = await page.evaluate(() =>
        Array.from(document.images).filter(i => i.complete && i.naturalWidth === 0).map(i => i.currentSrc || i.src),
      );
      for (const b of broken) pushErr('image', `Broken image: ${b}`);
    } catch { /* ignore */ }
    if (errors.some(e => e.screen === label) && !shotTaken.has(label)) {
      shotTaken.add(label);
      const f = await screenshot(label);
      if (f) console.log(`  ↳ screenshot (${label}): ${f}`);
    }
  }

  try {
    // ── load ──
    try { await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }); }
    catch (e) { pushErr('navigation', `App failed to load: ${e.message}`); }

    // ── splash ──
    await checkScreen('splash');
    const enter = page.getByRole('button', { name: /Enter Platform/i });
    if (await visible(enter, 8000)) await safeClick(enter);
    else pushErr('navigation', 'Splash "Enter Platform" button not found');

    // ── age gate ──
    await checkScreen('agegate');
    const ageBtn = page.getByRole('button', { name: /I am 18 or older/i });
    if (await visible(ageBtn, 6000)) await safeClick(ageBtn);
    else pushErr('navigation', 'Age gate confirm button not found');

    // ── auth (present only when Supabase is baked into the build) ──
    const guest = page.getByRole('button', { name: /Continue without account/i });
    if (await visible(guest, 4000)) { await checkScreen('auth'); await safeClick(guest); }

    // ── onboarding step 0: sex (selecting auto-advances to biometrics) ──
    if (await visible(page.getByRole('heading', { name: /Biological Sex/i }), 8000)) {
      await checkScreen('onboarding-sex');
      await safeClick(page.getByRole('button', { name: /^male$/i }));
    } else pushErr('navigation', 'Onboarding "Biological Sex" step not reached');

    // ── onboarding step 1: biometrics ──
    if (await visible(page.getByRole('heading', { name: /Biometrics/i }), 6000)) {
      await checkScreen('onboarding-biometrics');
      await fillNum('28', 28);   // age (required to enable Continue)
      await selectIdx(0, '5');   // height feet
      await selectIdx(1, '10');  // height inches
      await fillNum('185', 185); // weight (required to enable Continue)
      const cont = page.getByRole('button', { name: /^Continue$/i });
      if (!(await safeClick(cont))) pushErr('navigation', 'Biometrics "Continue" not clickable (still disabled?)');
    } else pushErr('navigation', 'Onboarding "Biometrics" step not reached');

    // ── onboarding step 2: body fat ──
    if (await visible(page.getByRole('heading', { name: /Body Fat Percentage/i }), 6000)) {
      await checkScreen('onboarding-bodyfat');
      await fillNum('18', 20);   // body fat % (required to enable Continue)
      const cont = page.getByRole('button', { name: /^Continue$/i });
      if (!(await safeClick(cont))) pushErr('navigation', 'Body Fat "Continue" not clickable (still disabled?)');
    } else pushErr('navigation', 'Onboarding "Body Fat" step not reached');

    // ── onboarding step 3: goals ──
    if (await visible(page.getByRole('heading', { name: /Primary Goals/i }), 6000)) {
      await checkScreen('onboarding-goals');
      for (const g of [/Fat Loss/i, /Muscle Gain/i, /Recovery/i]) {
        const b = page.getByRole('button', { name: g });
        if (await visible(b, 2000)) await safeClick(b);
      }
      const gen = page.getByRole('button', { name: /Generate Research Protocol/i });
      if (!(await safeClick(gen))) pushErr('navigation', 'Goals "Generate Research Protocol" not clickable');
    } else pushErr('navigation', 'Onboarding "Primary Goals" step not reached');

    // ── dashboard ──
    const dashMark = page.getByText(/How do you want to build this protocol|εἰδωλον|Recommend a Stack|Build My Own/i);
    if (!(await visible(dashMark, 10000))) pushErr('navigation', 'Dashboard not reached after onboarding');
    await checkScreen('dashboard');

    // ── best-effort sub-screen sweep ──
    // Returns home via in-app controls; we never reload (profile is in-memory
    // only, so a reload would bounce us back to splash). If we can't get back,
    // we stop the sweep — navigation gaps are warnings, not filed bugs.
    const subs = [
      { label: 'timeline',       name: /Protocol Timeline/i },
      { label: 'analytics',      name: /Analytics/i },
      { label: 'qa',             name: /Q&A/i },
      { label: 'protocol-guide', name: /View Full Protocol/i },
      { label: 'photos',         name: /Progress Photos/i },
    ];
    for (const s of subs) {
      const entry = page.getByRole('button', { name: s.name });
      if (!(await visible(entry, 2500))) continue;
      try {
        await entry.first().click();
        await checkScreen(s.label);
        const back = page.getByRole('button', { name: /←|Back|Home|Done|Dashboard/i });
        if (await visible(back, 3000)) {
          await back.first().click();
          if (!(await visible(dashMark, 4000))) { console.log(`  (could not return home after ${s.label} — ending sweep)`); break; }
        } else { console.log(`  (no back control on ${s.label} — ending sweep)`); break; }
      } catch (e) { console.log(`  (sub-screen ${s.label} sweep error: ${e.message})`); break; }
    }
  } finally {
    await browser.close().catch(() => {});
    if (owned) killTree(owned);
  }

  // ── report ──
  const byScreen = new Map();
  for (const e of errors) {
    if (!byScreen.has(e.screen)) byScreen.set(e.screen, []);
    byScreen.get(e.screen).push(e);
  }

  if (byScreen.size === 0) {
    console.log('Smoke: all clear');
    process.exit(0);
  }

  console.error('\nSmoke: FAILURES detected');
  console.error('========================');
  for (const [screen, errs] of byScreen) {
    console.error(`\n[${screen}] ${errs.length} issue(s):`);
    for (const e of errs) console.error(`  • (${e.type}) ${e.detail}`);
  }

  // ── auto-file to Supabase (one OPEN row per distinct failure, deduped) ──
  // Dedupe key is (screen + failureSignature), NOT the build version. A single
  // root failure that cascades across screens still files at most one row per
  // distinct screen-signature, and re-running the build never piles up duplicates
  // of a failure that's already open. The signature is build-independent, so a
  // version bump doesn't re-file an identical failure either.
  if (DRY_RUN) {
    console.error('\n(SMOKE_DRY_RUN set — not filing to Supabase. Would file:)');
    for (const [screen, errs] of byScreen) {
      console.error(`  • [${screen}] sig=${failureSignature(errs)} — ${errs.length} issue(s)`);
    }
  } else if (SUPA_URL && SUPA_KEY) {
    const supabase = createClient(SUPA_URL, SUPA_KEY);
    const DEVICE = 'auto-smoke';
    console.error(`\n(filing with ${SUPA_KEY_KIND} key)`);
    if (SUPA_KEY_KIND !== 'service-role') {
      console.error('  ⚠ anon key in use: feedback RLS blocks anon SELECT, so the open-row dedupe below cannot see existing rows and may file duplicates. Add SUPABASE_SERVICE_ROLE_KEY to .env.local to enable dedupe.');
    }
    for (const [screen, errs] of byScreen) {
      const sig = failureSignature(errs);
      const summary = errs.map(e => `(${e.type}) ${e.detail}`).join(' | ').slice(0, 1500);
      const description = `[auto-smoke][sig:${sig}] build ${VERSION} — smoke failure on "${screen}":\n${summary}`;
      try {
        // dedupe: skip if an OPEN auto-smoke row with this exact signature already
        // exists for this screen (any build). Matches the [sig:XXX] token we embed.
        const { data: dupes } = await supabase.from('feedback')
          .select('id').eq('category', 'bug').eq('screen', screen).eq('device', DEVICE)
          .eq('status', 'open').ilike('description', `%[sig:${sig}]%`).limit(1);
        if (dupes && dupes.length) { console.error(`  ↳ already open for "${screen}" (sig ${sig}) — skipping`); continue; }
      } catch { /* dedupe is best-effort */ }
      try {
        const { error } = await supabase.from('feedback').insert([{
          category: 'bug',
          screen,
          description,
          status: 'open',
          device: DEVICE,
          build: VERSION,
          user_email: 'auto-smoke',
        }]);
        if (error) console.error(`  ↳ Supabase insert failed for "${screen}": ${error.message}`);
        else console.error(`  ↳ filed bug for "${screen}" (sig ${sig}) → Supabase feedback`);
      } catch (e) { console.error(`  ↳ Supabase insert threw for "${screen}": ${e.message}`); }
    }
  } else {
    console.error('\n(Supabase creds not found in .env.local — skipped auto-filing.)');
  }

  process.exit(0);
}

// Hard safety net so a hung browser can never wedge the build hook.
const guard = setTimeout(() => { console.error('Smoke: hard timeout (150s) — aborting.'); process.exit(0); }, 150000);
guard.unref?.();

main().catch(err => { console.error('Smoke: fatal error —', err?.stack || err); process.exit(0); });
