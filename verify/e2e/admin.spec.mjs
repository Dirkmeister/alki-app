// verify/e2e/admin.spec.mjs
// /admin must be gated when signed out (6.7-b): the access-restricted screen
// renders and the triage board does NOT mount.

import { res, newPage, BASE_URL } from "./_harness.mjs";

export async function run(context, shot) {
  const out = [];
  const { page } = await newPage(context);
  try {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: "domcontentloaded", timeout: 30000 });
    // The gate resolves "checking" → "denied" for an unauthenticated visitor.
    await page.waitForTimeout(2500);
    const info = await page.evaluate(() => {
      const t = document.body.innerText;
      return {
        restricted: /Access Restricted/i.test(t),
        checking: /Checking access/i.test(t),
        // Triage-board signals that must be ABSENT when denied.
        triageMounted: /Triage|feedback queue|open\s+bugs?|status:\s*(open|done)|category/i.test(t)
          && !/Access Restricted/i.test(t),
        sample: t.slice(0, 200),
      };
    });
    if (info.checking && !info.restricted) {
      // give it one more beat
      await page.waitForTimeout(2500);
    }
    const after = await page.evaluate(() => {
      const t = document.body.innerText;
      return { restricted: /Access Restricted/i.test(t), triage: /Triage|feedback queue|open\s+bugs?/i.test(t) && !/Access Restricted/i.test(t), sample: t.slice(0, 200) };
    });
    const ok = after.restricted && !after.triage;
    const sh = shot ? await shot(page, "admin-signed-out") : null;
    out.push(res("6.7-b", "Compliance", "/admin gated when signed out (access-restricted shown, triage board not mounted)", ok ? "PASS" : "FAIL",
      ok ? '"Access Restricted" screen renders and the triage board does not mount for an unauthenticated visitor.'
         : `Gate not enforced: restricted=${after.restricted}, triageMounted=${after.triage}. Body: "${after.sample}".${sh ? " Screenshot: " + sh : ""}`));
  } catch (e) {
    out.push(res("6.7-b", "Compliance", "/admin gated when signed out", "BLOCKED", `Error loading /admin: ${e.message}`));
  }
  await page.close().catch(() => {});
  return out;
}
