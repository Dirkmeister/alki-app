"use client";

// Presentational eidolon switcher modal. Props-only, no state — extracted from
// AlkiApp.jsx (Group 3 cleanup) with no behavior change. The goal catalog
// (AlkiApp's inline GOALS) is passed in as `goalsCatalog` so this stays free of
// AlkiApp's module-scope constants.
export default function EidolonSwitcherModal({ eidolons, activeEidolonId, onSelect, onClose, onCreate, goalsCatalog = [] }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 360, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, maxHeight: '70vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Switch Eidolon</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>Select a research profile to load.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {eidolons.map(e => (
            <button
              key={e.id}
              onClick={() => onSelect(e.id)}
              style={{
                width: '100%', padding: '14px 16px', textAlign: 'left',
                background: e.id === activeEidolonId ? 'rgba(26,232,122,0.08)' : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${e.id === activeEidolonId ? '#1ae87a' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{e.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                  {e.goals?.length ? e.goals.map(gid => goalsCatalog.find(g => g.id === gid)?.label).filter(Boolean).join(', ') : 'No goals set'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {e.lockedAt && <span style={{ fontSize: 10, color: 'rgba(26,232,122,0.6)', fontWeight: 600 }}>LOCKED</span>}
                {e.id === activeEidolonId && <span style={{ color: '#1ae87a', fontSize: 16 }}>●</span>}
              </div>
            </button>
          ))}
        </div>
        {onCreate && (
          <button onClick={onCreate} style={{ width: '100%', marginTop: 12, padding: '12px 16px', background: 'rgba(26,232,122,0.08)', border: '1px solid rgba(26,232,122,0.25)', borderRadius: 10, color: '#1ae87a', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            + New Eidolon
          </button>
        )}
        <button onClick={onClose} style={{ width: '100%', marginTop: 12, padding: '12px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
