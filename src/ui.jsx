import React from "react";

// Capital Frontier Travel — shared UI primitives

const { useState } = React;

// ──────────── Arrow brackets (the ← TRAVEL → mark) ────────────
function ArrowLeft({ color = "currentColor", w = 28 }) {
  return (
    <svg width={w} height="10" viewBox="0 0 28 10" aria-hidden="true">
      <path d="M0 5 L24 5 M2 1 L0 5 L2 9" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
function ArrowRight({ color = "currentColor", w = 28 }) {
  return (
    <svg width={w} height="10" viewBox="0 0 28 10" aria-hidden="true">
      <path d="M4 5 L28 5 M26 1 L28 5 L26 9" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ──────────── Eyebrow with optional arrow brackets ────────────
function Eyebrow({ children, brackets = true, color }) {
  const c = color || "var(--sunset-orange)";
  return (
    <div className="eyebrow" style={{ color: c }}>
      {brackets && <ArrowLeft color={c} />}
      <span>{children}</span>
      {brackets && <ArrowRight color={c} />}
    </div>
  );
}

// ──────────── Buttons ────────────
function Button({ variant = "primary", size, onDark, children, onClick, type = "button", ...rest }) {
  const cls = [
    "btn",
    `btn--${variant}`,
    size === "sm" && "btn--sm",
    onDark && "btn--on-dark",
  ].filter(Boolean).join(" ");
  return (
    <button type={type} className={cls} onClick={onClick} {...rest}>
      {children}
    </button>
  );
}

// ──────────── Tag / Chip ────────────
function Tag({ variant = "neutral", children }) {
  return <span className={`chip chip--${variant}`}>{children}</span>;
}

// ──────────── Diamond rule, dot leader ────────────
function DiamondRule() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, color: "var(--slate-cobalt)" }}>
      <span style={{ flex: 1, borderTop: "1px solid var(--cream-dune)" }} />
      <span style={{ fontFamily: "var(--font-display)", color: "var(--sunset-orange)", fontWeight: 700 }}>◆</span>
      <span style={{ flex: 1, borderTop: "1px solid var(--cream-dune)" }} />
    </div>
  );
}

// ──────────── Sunset disc graphic ────────────
function SunsetDisc({ size = 160 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "radial-gradient(circle at 50% 32%, #F9BB5E 0%, #E87846 85%)",
      flexShrink: 0,
    }} />
  );
}

// ──────────── Lucide-style icons (inline so we don't ship a CDN) ────────────
function Icon({ name, size = 20, stroke = 1.5, ...rest }) {
  const paths = {
    mountain: <path d="M8 3l4 8 5-5 4 14H3z" />,
    compass: <><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></>,
    map: <><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></>,
    tent: <path d="M3.5 21 12 3l8.5 18M12 3v18M8 21l4-6 4 6" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
    backpack: <path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM8 6V4a2 2 0 1 1 4 0v2M8 21v-5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5M8 10h8" />,
    arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
    arrowLeft: <path d="M19 12H5M11 18l-6-6 6-6" />,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    minus: <line x1="5" y1="12" x2="19" y2="12" />,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>,
    instagram: <><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></>,
    facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
    linkedin: <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {paths[name]}
    </svg>
  );
}

// ──────────── Form field ────────────
function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
      <span style={{
        fontFamily: "var(--font-display)", fontWeight: 600,
        fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase",
        color: "var(--slate-cobalt)",
      }}>{label}</span>
      {children}
    </label>
  );
}
function TextInput(props) {
  return <input {...props} style={{
    fontFamily: "var(--font-sans)", fontSize: 15, padding: "12px 14px",
    background: "#fff", border: "1px solid var(--cream-sand)",
    borderRadius: 4, color: "var(--navy-night)", outline: "none",
    width: "100%",
    ...props.style,
  }} />;
}

export { ArrowLeft, ArrowRight, Eyebrow, Button, Tag, DiamondRule, SunsetDisc, Icon, Field, TextInput };
