// verify/e2e/_harness.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Shared Playwright harness for the Alki sprint-fix verification specs.
//
// Reuses the SAME approach the project already uses (tests/smoke.spec.mjs):
// the raw `playwright` library (the @playwright/test runner is NOT installed),
// a mobile viewport (Austin tests on mobile), and an ensureServer() that reuses
// a running dev/start server or boots one. NEVER imports app source.
//
// Result bucket discipline (this is the whole point of the suite):
//   PASS    — we reached the UI state AND the behavioural assertion held.
//   FAIL    — we reached the UI state AND the assertion did NOT hold
//             (a claimed fix that isn't, or a confirmed regression).
//   MANUAL  — only a human can honestly judge (visual / external / email).
//   BLOCKED — we could NOT reach the UI state / locate the control, so we
//             refuse to claim PASS or FAIL. A BLOCKED is a "go look yourself",
//             never a silent pass.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import { spawn, execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..", "..");
export const BASE_URL = process.env.SMOKE_URL || process.env.VERIFY_URL || "http://localhost:3000";

export function res(feedback_id, sprint, check, result, detail) {
  return { feedback_id, sprint, check, result, detail: String(detail).slice(0, 600) };
}

export function gitTree() {
  try {
    const sha = execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim();
    const dirty = execSync("git status --porcelain", { cwd: ROOT }).toString().trim().length > 0;
    return { sha, dirty };
  } catch { return { sha: "unknown", dirty: false }; }
}

export function readEnvLocal() {
  const out = {};
  const p = path.join(ROOT, ".env.local");
  if (!existsSync(p)) return out;
  for (const raw of readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

async function serverUp(url) {
  try { const r = await fetch(url, { method: "GET" }); return r.status < 500; }
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
export function killTree(child) {
  if (!child) return;
  try {
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else process.kill(-child.pid, "SIGTERM");
  } catch { /* ignore */ }
}

// Reuse a running server if one answers; otherwise boot one (prod start first,
// dev fallback). Returns the child (to kill later) or null (not owned) or
// undefined (couldn't start).
export async function ensureServer() {
  if (await serverUp(BASE_URL)) { console.log(`verify: reusing server at ${BASE_URL}`); return null; }
  for (const script of ["start", "dev"]) {
    console.log(`verify: starting "npm run ${script}"…`);
    const child = spawn("npm", ["run", script], {
      cwd: ROOT, stdio: "ignore", shell: true, detached: process.platform !== "win32",
    });
    const ok = await waitForServer(BASE_URL, script === "start" ? 60000 : 120000);
    if (ok) { console.log(`verify: server ready (${script}).`); return child; }
    killTree(child);
  }
  return undefined;
}

// ── per-page plumbing ─────────────────────────────────────────────────────────
export async function newPage(context) {
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", e => pageErrors.push(e?.message || String(e)));
  return { page, consoleErrors, pageErrors };
}

export async function visible(loc, timeout = 4000) {
  try { await loc.first().waitFor({ state: "visible", timeout }); return true; } catch { return false; }
}
export async function safeClick(loc, timeout = 6000) {
  try { await loc.first().click({ timeout }); return true; } catch { return false; }
}
async function fillNum(page, placeholder, value) {
  const inp = page.getByPlaceholder(placeholder, { exact: true }).first();
  if (!(await visible(inp, 4000))) return false;
  try {
    await inp.click({ timeout: 4000 });
    await inp.fill(String(value), { timeout: 4000 });
    if ((await inp.inputValue()) !== String(value)) {
      await inp.fill("", { timeout: 2000 }).catch(() => {});
      await inp.pressSequentially(String(value), { timeout: 4000 });
    }
    return (await inp.inputValue()) === String(value);
  } catch { return false; }
}
async function selectIdx(page, i, value) {
  try { await page.locator("select").nth(i).selectOption(value, { timeout: 4000 }); return true; } catch { return false; }
}

// Drive splash → age gate → guest → onboarding → dashboard with a deterministic
// profile (male / 5'10" / 185lb / 20% BF / fat_loss+muscle+recovery). Returns
// { ok, reachedAt } so a spec can mark dependent checks BLOCKED if onboarding
// itself fell over (which is a different failure than the check failing).
export async function onboardToDashboard(page) {
  try { await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 }); }
  catch (e) { return { ok: false, reachedAt: `goto failed: ${e.message}` }; }

  const enter = page.getByRole("button", { name: /Enter Platform/i });
  if (await visible(enter, 8000)) await safeClick(enter); else return { ok: false, reachedAt: "splash" };

  const ageBtn = page.getByRole("button", { name: /I am 18 or older/i });
  if (await visible(ageBtn, 6000)) await safeClick(ageBtn); else return { ok: false, reachedAt: "agegate" };

  const guest = page.getByRole("button", { name: /Continue without account/i });
  if (await visible(guest, 4000)) await safeClick(guest);

  if (await visible(page.getByRole("heading", { name: /Biological Sex/i }), 8000)) {
    await safeClick(page.getByRole("button", { name: /^male$/i }));
  } else return { ok: false, reachedAt: "onboarding-sex" };

  if (await visible(page.getByRole("heading", { name: /Biometrics/i }), 6000)) {
    await fillNum(page, "28", 28);
    await selectIdx(page, 0, "5");
    await selectIdx(page, 1, "10");
    await fillNum(page, "185", 185);
    if (!(await safeClick(page.getByRole("button", { name: /^Continue$/i })))) return { ok: false, reachedAt: "biometrics" };
  } else return { ok: false, reachedAt: "biometrics" };

  if (await visible(page.getByRole("heading", { name: /Body Fat Percentage/i }), 6000)) {
    await fillNum(page, "18", 20);
    if (!(await safeClick(page.getByRole("button", { name: /^Continue$/i })))) return { ok: false, reachedAt: "bodyfat" };
  } else return { ok: false, reachedAt: "bodyfat" };

  if (await visible(page.getByRole("heading", { name: /Primary Goals/i }), 6000)) {
    for (const g of [/Fat Loss/i, /Muscle Gain/i, /Recovery/i]) {
      const b = page.getByRole("button", { name: g });
      if (await visible(b, 2000)) await safeClick(b);
    }
    if (!(await safeClick(page.getByRole("button", { name: /Generate Research Protocol/i })))) return { ok: false, reachedAt: "goals" };
  } else return { ok: false, reachedAt: "goals" };

  const dashMark = page.getByText(/Recommend a Stack|Build My Own|How do you want to build/i);
  if (!(await visible(dashMark, 10000))) return { ok: false, reachedAt: "dashboard" };
  return { ok: true, reachedAt: "dashboard" };
}

// In the builder path chooser, pick "Build My Own" to get the filterable list.
export async function chooseBuildMyOwn(page) {
  const b = page.getByText(/Build My Own/i);
  if (!(await visible(b, 6000))) return false;
  await b.first().click().catch(() => {});
  // search box appears in build mode
  return visible(page.getByPlaceholder("Search compounds by name…"), 6000);
}

// Select a compound by its exact display name by clicking the card's +/✓ toggle.
// Uses an in-page walk (robust to the inline-style DOM) and dispatches a real
// click that React handles. Returns "clicked:+", "already" (✓), or a reason.
export async function selectCompoundByName(page, name) {
  return page.evaluate((nm) => {
    const spans = Array.from(document.querySelectorAll("span"));
    const nameSpan = spans.find(s => s.textContent.trim() === nm);
    if (!nameSpan) return "no-name";
    let el = nameSpan;
    for (let i = 0; i < 8 && el; i++) {
      el = el.parentElement;
      if (!el) break;
      const btn = Array.from(el.querySelectorAll("button")).find(b => ["+", "✓"].includes(b.textContent.trim()));
      if (btn) {
        if (btn.textContent.trim() === "✓") return "already";
        btn.click();
        return "clicked:+";
      }
    }
    return "no-button";
  }, name);
}

// Type into the builder search box (activates filtersActive), then return matches.
export async function searchCompounds(page, text) {
  const inp = page.getByPlaceholder("Search compounds by name…").first();
  if (!(await visible(inp, 4000))) return false;
  await inp.fill("", { timeout: 3000 }).catch(() => {});
  await inp.fill(text, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(350);
  return true;
}

// Count selected compounds by reading the "Start Protocol (N)" / "Clear (N)"
// labels (the two places the live count is rendered). Returns a number or null.
export async function selectedCount(page) {
  return page.evaluate(() => {
    const txt = document.body.innerText;
    let m = txt.match(/(?:Start Protocol|Confirm Changes)\s*\((\d+)\)/);
    if (m) return parseInt(m[1], 10);
    m = txt.match(/Clear\s*\((\d+)\)/);
    if (m) return parseInt(m[1], 10);
    return null;
  });
}

// Onboard → Build My Own → select one compound → lock in → committed home.
// Returns true if the committed home ("View Full Protocol") was reached.
export async function reachCommittedHome(page, compoundName = "Tesamorelin") {
  const onb = await onboardToDashboard(page);
  if (!onb.ok) return false;
  if (!(await chooseBuildMyOwn(page))) return false;
  await searchCompounds(page, compoundName);
  const sel = await selectCompoundByName(page, compoundName);
  await searchCompounds(page, "");
  if (!(sel.startsWith("clicked") || sel === "already")) return false;
  await page.waitForTimeout(300);
  const lockIn = page.getByRole("button", { name: /(?:Start Protocol|Confirm Changes)\s*\(\d+\)/ });
  if (!(await visible(lockIn, 4000))) return false;
  await lockIn.click();
  await page.waitForTimeout(700);
  return visible(page.getByRole("button", { name: /View Full Protocol/i }), 6000);
}

// Count occurrences of the canonical disclaimer sentence currently in the DOM.
export const CANONICAL_DISCLAIMER_OPENING = "All information is for research and educational purposes only.";
export async function canonicalDisclaimerCount(page) {
  return page.evaluate((needle) => {
    const t = document.body.innerText;
    let n = 0, i = 0;
    while ((i = t.indexOf(needle, i)) !== -1) { n++; i += needle.length; }
    return n;
  }, CANONICAL_DISCLAIMER_OPENING);
}
