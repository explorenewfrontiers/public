import React from "react";
import { Button } from "./ui.jsx";

const headerStyles = {
  wrap: {
    position: "sticky", top: 0, zIndex: 50,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "18px 32px",
    transition: "background 220ms ease, border-color 220ms ease, color 220ms ease",
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  links: { display: "flex", gap: 28, alignItems: "center" },
  wordmark: {
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: 15, letterSpacing: "0.22em", textTransform: "uppercase",
    lineHeight: 1, whiteSpace: "nowrap",
  },
  sub: {
    fontFamily: "var(--font-display)", fontWeight: 600,
    fontSize: 10, letterSpacing: "0.4em", textTransform: "uppercase",
    color: "var(--sunset-orange)", marginTop: 3,
  },
};

function Header({ route, setRoute, mode = "paper" }) {
  const onDark = mode === "night";
  const fg = onDark ? "var(--cream-bone)" : "var(--navy-night)";
  const bg = onDark
    ? "rgba(27, 48, 54, 0.78)"
    : "rgba(252, 242, 224, 0.82)";
  const border = onDark
    ? "1px solid rgba(255,255,255,0.08)"
    : "1px solid var(--border)";
  const items = [
    { id: "home", label: "Routes" },
    { id: "journal", label: "Journal" },
    { id: "about", label: "About" },
    { id: "contact", label: "Contact" },
    { id: "agents", label: "Partner" },
  ];
  return (
    <header style={{ ...headerStyles.wrap, background: bg, color: fg, borderBottom: border, backdropFilter: "blur(14px)" }}>
      <button onClick={() => setRoute("home")} style={{ ...headerStyles.brand, background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
        <img src="/assets/logo-transparent.png" alt="CFT" style={{ height: 44, filter: onDark ? "brightness(1.05)" : "none" }} />
        <div style={{ textAlign: "left" }}>
          <div style={{ ...headerStyles.wordmark, color: fg }}>Capital Frontier</div>
          <div style={headerStyles.sub}>— Travel —</div>
        </div>
      </button>
      <nav style={headerStyles.links}>
        {items.map(it => (
          <button
            key={it.id}
            className="nav-link"
            aria-current={route === it.id ? "page" : undefined}
            onClick={() => setRoute(it.id)}
            style={{ color: fg }}
          >
            {it.label}
          </button>
        ))}
        <Button variant="primary" size="sm" onClick={() => setRoute("book")}>Book</Button>
      </nav>
    </header>
  );
}

export default Header;
