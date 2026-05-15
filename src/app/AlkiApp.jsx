"use client";
import { useState } from "react";
import { S } from "./styles/theme";
import SplashScreen from "./screens/SplashScreen";
import { AgeGate, AgeBlocked } from "./screens/AgeGate";
import Onboarding from "./screens/Onboarding";
import Dashboard from "./screens/Dashboard";

export default function AlkiApp() {
  const [screen, setScreen] = useState("splash");
  const [profile, setProfile] = useState(null);

  return (
    <div style={S.app}>
      {screen === "splash"     && <SplashScreen onEnter={() => setScreen("agegate")} />}
      {screen === "agegate"   && <AgeGate onConfirm={() => setScreen("onboarding")} onDeny={() => setScreen("blocked")} />}
      {screen === "blocked"   && <AgeBlocked />}
      {screen === "onboarding" && <Onboarding onComplete={(p) => { setProfile(p); setScreen("dashboard"); }} />}
      {screen === "dashboard"  && profile && <Dashboard profile={profile} onReset={() => { setProfile(null); setScreen("splash"); }} />}
    </div>
  );
}
