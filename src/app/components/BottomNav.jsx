"use client";
import { ACCENT } from "../theme";

// ── BOTTOM TAB BAR ─────────────────────────────────────────────────
// Four fixed tabs across the bottom of the app shell. Purely presentational:
// it renders the chrome and reports taps. Every routing decision (which screen
// a tab maps to, whether the nav is visible at all, whether Progress is behind
// the Pro gate) lives in AlkiApp, the state root.
//
// NAV_HEIGHT is exported because a `position: fixed` bar takes no layout space —
// AlkiApp pads the shell by exactly this much so no screen's last row hides
// underneath it.
export const NAV_HEIGHT = 62;

const INACTIVE = "#666666";

// Tab order is the user's mental order: where I am → what I'm looking up →
// how I'm doing → who I am.
export const NAV_TABS = [
  { id: "protocol", label: "Protocol", Icon: FlaskIcon },
  { id: "research", label: "Research", Icon: SearchIcon },
  { id: "progress", label: "Progress", Icon: ChartIcon },
  { id: "profile",  label: "Profile",  Icon: PersonIcon },
];

export default function BottomNav({ active, onSelect, lockedTabs = [] }) {
  return (
    <nav
      aria-label="Primary"
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 95,
        height: NAV_HEIGHT,
        background: "#111111",
        borderTop: "1px solid #1a1a1a",
        display: "flex",
        // The bar spans the viewport, but its tabs align to the same 480px
        // column the rest of the app uses, so they don't drift apart on desktop.
        justifyContent: "center",
        // Iron out the iOS home-indicator strip without changing the bar's own
        // height (padding would otherwise squash the icons).
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxSizing: "content-box",
      }}
    >
      <div style={{ display: "flex", width: "100%", maxWidth: 480 }}>
        {NAV_TABS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          const locked = lockedTabs.includes(id);
          const color = isActive ? ACCENT : INACTIVE;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              aria-current={isActive ? "page" : undefined}
              aria-label={locked ? `${label} (Alki Pro)` : label}
              style={{
                flex: 1,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 5,
                background: "none", border: "none", padding: 0,
                cursor: "pointer", fontFamily: "inherit",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span style={{ position: "relative", display: "flex", lineHeight: 0 }}>
                <Icon color={color} />
                {locked && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute", top: -4, right: -7,
                      fontSize: 8, lineHeight: 1, color: INACTIVE,
                    }}
                  >
                    🔒
                  </span>
                )}
              </span>
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10,
                fontWeight: isActive ? 600 : 500,
                letterSpacing: "0.5px",
                textIndent: "0.5px", // offset the trailing letter-space so it optically centers
                textTransform: "uppercase",
                color,
                transition: "color 0.15s ease",
              }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ── Icons ──────────────────────────────────────────────────────────
// Minimal geometric strokes on a shared 24px grid. Inline paths, no icon
// library. `color` drives stroke so the tab's active/inactive state is a
// single prop, not a second set of glyphs.
const base = (color) => ({
  width: 21,
  height: 21,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: color,
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
});

// Flask — narrow neck, shoulders flaring to a flat base, with the fill line.
function FlaskIcon({ color }) {
  return (
    <svg {...base(color)}>
      <path d="M9.5 3v6.2L4.6 17.4a1.6 1.6 0 0 0 1.4 2.4h12a1.6 1.6 0 0 0 1.4-2.4L14.5 9.2V3" />
      <line x1="8.4" y1="3" x2="15.6" y2="3" />
      <line x1="7.1" y1="14.4" x2="16.9" y2="14.4" />
    </svg>
  );
}

function SearchIcon({ color }) {
  return (
    <svg {...base(color)}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <line x1="15.4" y1="15.4" x2="20" y2="20" />
    </svg>
  );
}

// Bar chart — three rising columns on a shared baseline.
function ChartIcon({ color }) {
  return (
    <svg {...base(color)}>
      <line x1="4" y1="20" x2="20" y2="20" />
      <line x1="7.8" y1="20" x2="7.8" y2="13.5" />
      <line x1="12" y1="20" x2="12" y2="8.5" />
      <line x1="16.2" y1="20" x2="16.2" y2="11" />
    </svg>
  );
}

function PersonIcon({ color }) {
  return (
    <svg {...base(color)}>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
    </svg>
  );
}
