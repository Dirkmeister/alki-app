"use client";
import { useState, useEffect, useRef } from "react";

// ──────────────────────────────────────────────────────────────
// Dev-only performance HUD. OPT-IN — never shows for real users.
// Enable by adding ?perf=1 to the URL, or running
// localStorage.setItem("alkiPerf","1") in the console.
// Shows: live FPS, 95th-percentile frame time (ms), long-task count
// and worst long task (ms), and total blocking time (ms) since reset.
// Tap the HUD to reset counters so you can measure a single action
// (e.g. reset → scroll the builder for 5s → read the numbers).
// ──────────────────────────────────────────────────────────────
function perfEnabled() {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("perf") === "1") return true;
    return window.localStorage.getItem("alkiPerf") === "1";
  } catch { return false; }
}

export default function PerfHUD() {
  const [on, setOn] = useState(false);
  const [stats, setStats] = useState(null);
  const ref = useRef({ frames: [], longtasks: [], tbt: 0, start: 0, raf: 0, obs: null });

  useEffect(() => {
    setOn(perfEnabled());
  }, []);

  useEffect(() => {
    if (!on) return;
    const P = ref.current;
    P.frames = []; P.longtasks = []; P.tbt = 0; P.start = performance.now();

    // Long-task observer — tasks >50ms block the main thread.
    try {
      P.obs = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          P.longtasks.push(Math.round(e.duration));
          P.tbt += Math.max(0, e.duration - 50);
        }
      });
      P.obs.observe({ entryTypes: ["longtask"] });
    } catch { /* longtask unsupported */ }

    // Frame sampler.
    let last = performance.now();
    const tick = (now) => {
      P.frames.push(now - last); last = now;
      if (P.frames.length > 600) P.frames.shift(); // cap memory (~10s @60fps)
      P.raf = requestAnimationFrame(tick);
    };
    P.raf = requestAnimationFrame(tick);

    // Recompute the display 2x/sec (cheap; doesn't drive the FPS itself).
    const display = setInterval(() => {
      const f = P.frames.slice().sort((a, b) => a - b);
      const n = f.length;
      if (!n) return;
      const p95 = f[Math.min(n - 1, Math.floor(0.95 * n))];
      const recent = P.frames.slice(-90); // ~last 1.5s for the live FPS read
      const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
      setStats({
        fps: Math.round(1000 / avgRecent),
        p95: +p95.toFixed(1),
        maxFrame: +f[n - 1].toFixed(1),
        lt: P.longtasks.length,
        ltMax: P.longtasks.length ? Math.max(...P.longtasks) : 0,
        tbt: Math.round(P.tbt),
        secs: +((performance.now() - P.start) / 1000).toFixed(0),
      });
    }, 500);

    return () => {
      cancelAnimationFrame(P.raf);
      clearInterval(display);
      if (P.obs) P.obs.disconnect();
    };
  }, [on]);

  if (!on || !stats) return null;

  const reset = () => {
    const P = ref.current;
    P.frames = []; P.longtasks = []; P.tbt = 0; P.start = performance.now();
  };
  const fpsColor = stats.fps >= 55 ? "#1ae87a" : stats.fps >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div
      onClick={reset}
      title="Tap to reset counters"
      style={{
        position: "fixed", top: 12, right: 12, zIndex: 99999,
        background: "rgba(0,0,0,0.82)", border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 8, padding: "8px 10px", cursor: "pointer",
        fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11,
        lineHeight: 1.5, color: "rgba(255,255,255,0.85)", letterSpacing: "0.02em",
        userSelect: "none", minWidth: 132,
      }}
    >
      <div style={{ color: fpsColor, fontWeight: 700, fontSize: 13 }}>{stats.fps} FPS</div>
      <div>p95 frame: {stats.p95}ms</div>
      <div>max frame: {stats.maxFrame}ms</div>
      <div>long tasks: {stats.lt} (max {stats.ltMax}ms)</div>
      <div>blocking: {stats.tbt}ms / {stats.secs}s</div>
      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, marginTop: 2 }}>tap = reset</div>
    </div>
  );
}
