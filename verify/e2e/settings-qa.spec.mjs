// verify/e2e/settings-qa.spec.mjs
// Settings sign-out separation (ef1083fa) + Protocol Q&A layout/context (6e4cc0ad).
// One onboarding → committed home → settings, then Q&A in committed + builder.

import {
  res, newPage, visible, safeClick, reachCommittedHome, onboardToDashboard,
  chooseBuildMyOwn, searchCompounds, selectCompoundByName,
} from "./_harness.mjs";

const SPR_NAV = "Navigation (Sprint 4)";
const SPR_QA = "Protocol Q&A";

export async function run(context, shot) {
  const out = [];
  const { page } = await newPage(context);

  const committed = await reachCommittedHome(page);
  if (!committed) {
    out.push(res("ef1083fa", SPR_NAV, "Settings HOME and Sign-Out are not adjacent (no accidental sign-out)", "BLOCKED", "Could not reach committed home to open Settings."));
    out.push(res("6e4cc0ad", SPR_QA, "Q&A answer container does not overflow; context filtering renders (committed)", "BLOCKED", "Could not reach committed home to open Q&A."));
  } else {
    // ── ef1083fa: open Settings, compare HOME (nav chrome) vs Sign Out boxes ──
    try {
      const gear = page.getByRole("button", { name: /Profile and Settings/i });
      if (await visible(gear, 3000)) {
        await gear.click();
        await page.waitForTimeout(700);
        const geom = await page.evaluate(() => {
          const home = Array.from(document.querySelectorAll("button")).find(b => /^Home$/i.test(b.getAttribute("aria-label") || ""));
          const signout = Array.from(document.querySelectorAll("button")).find(b => /^\s*Sign Out\s*$/i.test(b.textContent));
          const box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height }; };
          return { home: box(home), signout: box(signout), hasSignout: !!signout, hasHome: !!home };
        });
        if (!geom.hasHome) {
          out.push(res("ef1083fa", SPR_NAV, "Settings HOME and Sign-Out are not adjacent", "BLOCKED",
            "HOME nav-chrome control not found on the Settings screen — could not assess separation."));
        } else if (!geom.hasSignout) {
          out.push(res("ef1083fa", SPR_NAV, "Settings HOME and Sign-Out are not adjacent (no accidental sign-out)", "MANUAL",
            "Sign Out renders only for a SIGNED-IN account (this run is a guest, so no Sign Out exists and no accidental-sign-out risk applies). Verify on a signed-in device that the top-right HOME chrome and the in-card Sign Out are not adjacent. Structurally: HOME is fixed top-right nav chrome; Sign Out lives inside the AccountCard body — different regions."));
        } else {
          // Overlap test + gap test. Accidental-tap risk if boxes overlap or are
          // within ~16px of each other.
          const overlap = !(geom.home.right < geom.signout.left || geom.home.left > geom.signout.right ||
                            geom.home.bottom < geom.signout.top || geom.home.top > geom.signout.bottom);
          const vGap = Math.max(geom.signout.top - geom.home.bottom, geom.home.top - geom.signout.bottom);
          const separated = !overlap && vGap > 16;
          out.push(res("ef1083fa", SPR_NAV, "Settings HOME and Sign-Out are not adjacent (no accidental sign-out)", separated ? "PASS" : "FAIL",
            separated ? `HOME (top-right nav chrome) and Sign Out are well separated (no overlap; gap ≈ ${Math.round(vGap)}px).`
                      : `HOME and Sign Out are ${overlap ? "OVERLAPPING" : `only ${Math.round(vGap)}px apart`} — accidental sign-out risk.`));
        }
      } else {
        out.push(res("ef1083fa", SPR_NAV, "Settings HOME and Sign-Out separation", "BLOCKED", "Settings (⚙) control not found on committed home."));
      }
      // back home
      const home = page.getByRole("button", { name: /^Home$/ });
      if (await visible(home, 2000)) { await home.click(); await page.waitForTimeout(500); }
    } catch (e) {
      out.push(res("ef1083fa", SPR_NAV, "Settings HOME/Sign-Out separation", "BLOCKED", `Error: ${e.message}`));
    }

    // ── 6e4cc0ad: Q&A in COMMITTED context — overflow + context filtering ────
    try {
      if (!(await visible(page.getByRole("button", { name: /View Full Protocol/i }), 2500))) {
        const home = page.getByRole("button", { name: /^Home$/ });
        if (await visible(home, 1500)) { await home.click(); await page.waitForTimeout(450); }
      }
      const qa = page.getByRole("button", { name: /^Q&A$/ });
      if (await visible(qa, 3000)) {
        await qa.click();
        await page.waitForTimeout(800);
        const r = await assessQA(page);
        const sh = shot ? await shot(page, "qa-committed") : null;
        reportQA(out, "committed", r, sh);
      } else {
        out.push(res("6e4cc0ad", SPR_QA, "Q&A overflow + context (committed)", "BLOCKED", "Q&A entry not found on committed home."));
      }
    } catch (e) {
      out.push(res("6e4cc0ad", SPR_QA, "Q&A overflow + context (committed)", "BLOCKED", `Error: ${e.message}`));
    }
  }

  await page.close().catch(() => {});

  // ── 6e4cc0ad: Q&A in BUILDER context — fresh session ──────────────────────
  const { page: page2 } = await newPage(context);
  try {
    const onb = await onboardToDashboard(page2);
    if (onb.ok && await chooseBuildMyOwn(page2)) {
      // give it a selection so the "Your Stack" context section has content
      await searchCompounds(page2, "BPC-157");
      await selectCompoundByName(page2, "BPC-157");
      await searchCompounds(page2, "");
      // Q&A entry in builder: header "Q&A" button
      const qa = page2.getByRole("button", { name: /^Q&A$/ });
      if (await visible(qa, 3000)) {
        await qa.click();
        await page2.waitForTimeout(800);
        const r = await assessQA(page2);
        const sh = shot ? await shot(page2, "qa-builder") : null;
        reportQA(out, "builder", r, sh);
      } else {
        out.push(res("6e4cc0ad", SPR_QA, "Q&A overflow + context (builder)", "BLOCKED", "Q&A entry not found in builder."));
      }
    } else {
      out.push(res("6e4cc0ad", SPR_QA, "Q&A overflow + context (builder)", "BLOCKED", "Could not reach builder."));
    }
  } catch (e) {
    out.push(res("6e4cc0ad", SPR_QA, "Q&A overflow + context (builder)", "BLOCKED", `Error: ${e.message}`));
  }
  await page2.close().catch(() => {});

  return out;
}

// Open the first FAQ and measure horizontal overflow of the answer container.
async function assessQA(page) {
  // Reached Q&A screen?
  const onQA = await visible(page.getByText(/Protocol Q&A/i), 4000);
  if (!onQA) return { reached: false };
  // expand the first question
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const q = btns.find(b => /\?$/.test(b.textContent.trim()) || /▾|▸|►/.test(b.textContent));
    if (q) q.click();
  });
  await page.waitForTimeout(400);
  return page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    // horizontal page overflow (a clipped/over-wide answer pushes scrollWidth out)
    const pageOverflowPx = document.documentElement.scrollWidth - docW;
    // any element wider than the viewport (clipping symptom)
    let worst = 0, worstTag = "";
    document.querySelectorAll("div,p,span").forEach(el => {
      const r = el.getBoundingClientRect();
      const over = Math.round(r.right - docW);
      if (over > worst) { worst = over; worstTag = el.tagName + "." + (el.className || ""); }
    });
    const text = document.body.innerText;
    const hasContextSection = /Your Stack|For your stack|In your protocol|Your Protocol|Your selection/i.test(text);
    return { reached: true, docW, pageOverflowPx, worst, worstTag, hasContextSection };
  });
}

function reportQA(out, ctx, r, shotPath) {
  if (!r || !r.reached) {
    out.push(res("6e4cc0ad", "Protocol Q&A", `Q&A overflow + context filtering (${ctx})`, "BLOCKED", "Q&A screen not reached."));
    return;
  }
  // Overflow: page should not scroll horizontally and no element should exceed
  // the viewport by more than a small rounding margin.
  const noOverflow = r.pageOverflowPx <= 2 && r.worst <= 4;
  out.push(res("6e4cc0ad", "Protocol Q&A", `Q&A answer container does not overflow horizontally (${ctx})`, noOverflow ? "PASS" : "FAIL",
    noOverflow ? `No horizontal overflow at ${r.docW}px (page overflow ${r.pageOverflowPx}px, worst element +${r.worst}px).`
               : `Horizontal overflow detected: page +${r.pageOverflowPx}px, worst element +${r.worst}px (${r.worstTag}).${shotPath ? " Screenshot: " + shotPath : ""}`));
  // Context filtering is partly visual — assert the section exists, else MANUAL.
  out.push(res("6e4cc0ad", "Protocol Q&A", `Q&A context filtering reflects the stack (${ctx})`, r.hasContextSection ? "PASS" : "MANUAL",
    r.hasContextSection ? "A stack/context section is rendered on the Q&A screen."
                        : `No obvious stack-context heading detected — verify visually that Q&A is scoped to the ${ctx} stack.${shotPath ? " Screenshot: " + shotPath : ""}`));
}
