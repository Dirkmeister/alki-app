"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";

// ──────────────────────────────────────────────────────────────
// Dev-only performance HUD + recorder. OPT-IN — never shows for real
// users. Enable with ?perf=1 in the URL, or localStorage.alkiPerf=1.
//
// Live readout: FPS, p95/max frame time, long-task count + worst,
// total blocking time.
//
// Recorder: type a label (e.g. "idle", "see-all scroll", "typing"),
// hit Start, stress-test, hit Stop. It captures one snapshot per second
// and writes the whole run (samples + summary) to Supabase perf_logs,
// so it can be pulled and reviewed directly. No eyeballing required.
// ──────────────────────────────────────────────────────────────
const BUILD_SHA = (process.env.NEXT_PUBLIC_COMMIT_SHA || "dev").slice(0, 7);

function perfEnabled() {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("perf") === "1") return true;
    return window.localStorage.getItem("alkiPerf") === "1";
  } catch { return false; }
}

function statsFrom(frameArr) {
  const f = frameArr.slice().sort((a, b) => a - b);
  const n = f.length;
  if (!n) return { fps: 0, p95: 0, max: 0 };
  const avg = frameArr.reduce((a, b) => a + b, 0) / n;
  return {
    fps: Math.round(1000 / avg),
    p95: +f[Math.min(n - 1, Math.floor(0.95 * n))].toFixed(1),
    max: +f[n - 1].toFixed(1),
  };
}

export default function PerfHUD({ screen }) {
  const [on, setOn] = useState(false);
  const [live, setLive] = useState(null);
  const [recording, setRecording] = useState(false);
  const [label, setLabel] = useState("idle");
  const [meta, setMeta] = useState({ elapsed: 0, samples: 0 });
  const [saveMsg, setSaveMsg] = useState(null);

  const R = useRef({
    frames: [], recFrames: [], longAll: [], secLong: [],
    samples: [], raf: 0, obs: null,
  });

  useEffect(() => { setOn(perfEnabled()); }, []);

  useEffect(() => {
    if (!on) return;
    const P = R.current;

    try {
      P.obs = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          P.longAll.push(Math.round(e.duration));
          if (P.recording) P.secLong.push(Math.round(e.duration));
        }
      });
      P.obs.observe({ entryTypes: ["longtask"] });
    } catch { /* unsupported */ }

    let last = performance.now();
    const tick = (now) => {
      const d = now - last; last = now;
      P.frames.push(d);
      if (P.frames.length > 300) P.frames.shift();
      if (P.recording) P.recFrames.push(d);
      P.raf = requestAnimationFrame(tick);
    };
    P.raf = requestAnimationFrame(tick);

    // Live display @2Hz.
    const liveTimer = setInterval(() => {
      const recent = P.frames.slice(-90);
      if (!recent.length) return;
      const s = statsFrom(recent);
      setLive({
        fps: s.fps, p95: s.p95, max: s.max,
        lt: P.longAll.length,
        ltMax: P.longAll.length ? Math.max(...P.longAll) : 0,
      });
    }, 500);

    // Per-second recorder snapshot.
    const recTimer = setInterval(() => {
      if (!P.recording) return;
      const s = statsFrom(P.recFrames);
      const ltMax = P.secLong.length ? Math.max(...P.secLong) : 0;
      const tbt = P.secLong.reduce((a, d) => a + Math.max(0, d - 50), 0);
      P.samples.push({
        t: P.samples.length + 1,
        fps: s.fps, p95: s.p95, maxFrame: s.max,
        longTasks: P.secLong.length, ltMax, blockingMs: Math.round(tbt),
      });
      P.recFrames = []; P.secLong = [];
      setMeta({ elapsed: P.samples.length, samples: P.samples.length });
    }, 1000);

    return () => {
      cancelAnimationFrame(P.raf);
      clearInterval(liveTimer);
      clearInterval(recTimer);
      if (P.obs) P.obs.disconnect();
    };
  }, [on]);

  if (!on) return null;

  const start = () => {
    const P = R.current;
    P.samples = []; P.recFrames = []; P.secLong = [];
    P.recording = true;
    setSaveMsg(null);
    setMeta({ elapsed: 0, samples: 0 });
    setRecording(true);
  };

  const stop = async () => {
    const P = R.current;
    P.recording = false;
    setRecording(false);
    const samples = P.samples.slice();
    if (!samples.length) { setSaveMsg("no samples"); return; }

    const fpsList = samples.map((s) => s.fps);
    const summary = {
      seconds: samples.length,
      minFPS: Math.min(...fpsList),
      avgFPS: Math.round(fpsList.reduce((a, b) => a + b, 0) / fpsList.length),
      maxFrameMs: Math.max(...samples.map((s) => s.maxFrame)),
      totalBlockingMs: samples.reduce((a, s) => a + s.blockingMs, 0),
      totalLongTasks: samples.reduce((a, s) => a + s.longTasks, 0),
    };

    const row = {
      label: label || "run",
      build_sha: BUILD_SHA,
      screen: screen || "unknown",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      viewport_width: typeof window !== "undefined" ? window.innerWidth : null,
      viewport_height: typeof window !== "undefined" ? window.innerHeight : null,
      duration_s: samples.length,
      samples,
      summary,
    };

    setSaveMsg("saving…");
    if (supabase) {
      try {
        const { error } = await supabase.from("perf_logs").insert([row]);
        setSaveMsg(error ? "save failed (see console)" : `saved ✓ ${summary.avgFPS} avg fps`);
        if (error) console.error("perf_logs save error:", error);
      } catch (e) {
        setSaveMsg("save failed (see console)");
        console.error("perf_logs save error:", e);
      }
    } else {
      setSaveMsg("no supabase — logged to console");
      console.log("PERF RUN", JSON.stringify(row));
    }
  };

  const fpsColor = live && live.fps >= 55 ? "#1ae87a" : live && live.fps >= 40 ? "#f59e0b" : "#ef4444";
  const btnStyle = (bg) => ({
    flex: 1, padding: "5px 0", borderRadius: 6, border: "none", cursor: "pointer",
    fontFamily: "inherit", fontSize: 11, fontWeight: 700, background: bg, color: "#08110d",
  });

  return (
    <div
      style={{
        position: "fixed", top: 12, right: 12, zIndex: 99999,
        background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 8, padding: "8px 10px",
        fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11,
        lineHeight: 1.5, color: "rgba(255,255,255,0.85)", letterSpacing: "0.02em",
        userSelect: "none", width: 188,
      }}
    >
      <div style={{ color: fpsColor, fontWeight: 700, fontSize: 13 }}>
        {live ? `${live.fps} FPS` : "…"}
      </div>
      {live && (
        <>
          <div>p95 {live.p95}ms · max {live.max}ms</div>
          <div>long tasks: {live.lt} (max {live.ltMax}ms)</div>
        </>
      )}
      <div style={{ height: 1, background: "rgba(255,255,255,0.12)", margin: "6px 0" }} />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="label"
        disabled={recording}
        style={{
          width: "100%", boxSizing: "border-box", marginBottom: 6, padding: "4px 6px",
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 11, outline: "none",
        }}
      />
      <div style={{ display: "flex", gap: 6 }}>
        {!recording ? (
          <button onClick={start} style={btnStyle("#1ae87a")}>● Start</button>
        ) : (
          <button onClick={stop} style={btnStyle("#ef4444")}>■ Stop &amp; save</button>
        )}
      </div>
      {recording && (
        <div style={{ color: "#ef4444", marginTop: 5 }}>● REC {meta.elapsed}s · {meta.samples} samples</div>
      )}
      {saveMsg && !recording && (
        <div style={{ color: "rgba(255,255,255,0.6)", marginTop: 5 }}>{saveMsg}</div>
      )}
    </div>
  );
}
