"use client";

// Presentational eidolon switcher modal. Props-only, no state — extracted from
// AlkiApp.jsx (Group 3 cleanup) with no behavior change. The goal catalog
// (AlkiApp's inline GOALS) is passed in as `goalsCatalog` so this stays free of
// AlkiApp's module-scope constants.
export default function EidolonSwitcherModal({ eidolons, activeEidolonId, onSelect, onClose, onCreate, goalsCatalog = [], lockedIds = null, onPromote, atCap = false, maxEidolons = null }) {
  // Sprint 7 (slots) — `lockedIds` is the Set of eidolons over the current
  // allowance (e.g. a lapsed Pro). They stay VISIBLE here but are archived: not
  // loadable for editing. Tapping a locked one PROMOTES it into the active
  // window (swapping the trailing active eidolon out) — that's how the user
  // "chooses which stay active". Defensive `?.has` so a null set = nothing locked.
  const isLocked = (id) => !!(lockedIds && lockedIds.has && lockedIds.has(id));
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 360, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, maxHeight: '70vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Switch Eidolon</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>Select a research profile to load.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {eidolons.map(e => {
            const locked = isLocked(e.id);
            return (
            <button
              key={e.id}
              onClick={() => (locked ? onPromote?.(e.id) : onSelect(e.id))}
              title={locked ? 'Locked — tap to make this Eidolon active' : undefined}
              style={{
                width: '100%', padding: '14px 16px', textAlign: 'left',
                background: e.id === activeEidolonId ? 'rgba(26,232,122,0.08)' : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${e.id === activeEidolonId ? '#1ae87a' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                opacity: locked ? 0.55 : 1,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{e.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                  {locked
                    ? 'Locked — tap to make active'
                    : (e.goals?.length ? e.goals.map(gid => goalsCatalog.find(g => g.id === gid)?.label).filter(Boolean).join(', ') : 'No goals set')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {locked
                  ? <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.06em' }}>🔒 LOCKED</span>
                  : (e.lockedAt && <span style={{ fontSize: 10, color: 'rgba(26,232,122,0.6)', fontWeight: 600 }}>LOCKED</span>)}
                {e.id === activeEidolonId && <span style={{ color: '#1ae87a', fontSize: 16 }}>●</span>}
              </div>
            </button>
            );
          })}
        </div>
        {/* Sprint 7 (slots) — over-allowance note. When the user is over the cap,
            the trailing Eidolons above show as locked; this explains why. */}
        {lockedIds && lockedIds.size > 0 && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginTop: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
            You're running more Eidolons than your current plan allows{maxEidolons != null ? ` (${maxEidolons} active)` : ''}. None are deleted — tap a locked Eidolon to make it active, or add a slot / upgrade for more.
          </div>
        )}
        {onCreate && (
          <button onClick={onCreate} style={{ width: '100%', marginTop: 12, padding: '12px 16px', background: 'rgba(26,232,122,0.08)', border: '1px solid rgba(26,232,122,0.25)', borderRadius: 10, color: '#1ae87a', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {atCap ? '+ Add an Eidolon slot' : '+ New Eidolon'}
          </button>
        )}
        <button onClick={onClose} style={{ width: '100%', marginTop: 12, padding: '12px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
