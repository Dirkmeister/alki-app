export const S = {
  app: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#e8e8e8",
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    overflow: "hidden"
  },
  inner: {
    maxWidth: 480,
    margin: "0 auto",
    padding: "0 20px",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column"
  },
  accent: "#22d68a",
  accentDim: "rgba(34,214,138,0.15)",
  accentBorder: "rgba(34,214,138,0.25)",
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 12
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    color: "#fff",
    fontSize: 16,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit"
  },
  btn: {
    width: "100%",
    padding: "16px 24px",
    background: "#22d68a",
    color: "#0a0a0a",
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.02em",
    fontFamily: "inherit",
    transition: "opacity 0.2s"
  },
  btnDisabled: {
    opacity: 0.35,
    cursor: "not-allowed"
  },
  btnOutline: {
    width: "100%",
    padding: "14px 24px",
    background: "transparent",
    color: "#22d68a",
    border: "2px solid rgba(34,214,138,0.3)",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit"
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.45)",
    marginBottom: 8,
    display: "block"
  },
  tag: {
    display: "inline-block",
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    marginRight: 8,
    marginBottom: 8
  },
  disclaimer: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    lineHeight: 1.5,
    textAlign: "center",
    padding: "16px 0"
  }
};
