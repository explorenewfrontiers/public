import React from "react";
import { Eyebrow, Button, SunsetDisc, Icon } from "./ui.jsx";

const heroStyles = {
  wrap: {
    position: "relative",
    background: "var(--navy-ridge)",
    color: "var(--cream-bone)",
    overflow: "hidden",
    minHeight: 640,
    display: "flex",
    alignItems: "center",
  },
  bgPhoto: {
    position: "absolute", inset: 0,
    background: "linear-gradient(170deg, #1B3036 0%, #2D4A5B 40%, #44606E 70%, #C5552A 110%)",
  },
  // Big sun behind type
  sun: {
    position: "absolute",
    width: 720, height: 720,
    borderRadius: "50%",
    background: "radial-gradient(circle at 50% 35%, rgba(249,187,94,0.95) 0%, rgba(232,120,70,0.85) 60%, rgba(232,120,70,0) 75%)",
    right: -120, top: -180,
    filter: "blur(2px)",
  },
  ridge: {
    position: "absolute", left: 0, right: 0, bottom: -2, height: "42%",
    pointerEvents: "none",
  },
  inner: { position: "relative", maxWidth: 1240, margin: "0 auto", padding: "100px 32px", width: "100%", zIndex: 2 },
  display: {
    fontFamily: "var(--font-display)", fontWeight: 800,
    fontSize: "clamp(72px, 9vw, 132px)",
    lineHeight: 0.9, letterSpacing: "0.005em",
    textTransform: "uppercase",
    color: "var(--cream-bone)",
    margin: "18px 0 22px",
    textShadow: "0 4px 30px rgba(0,0,0,0.25)",
  },
  lead: {
    fontFamily: "var(--font-serif)", fontStyle: "italic",
    fontSize: 22, lineHeight: 1.5, maxWidth: 520,
    color: "#E6D9BD", marginBottom: 32,
  },
  meta: {
    display: "flex", gap: 28, alignItems: "center",
    fontFamily: "var(--font-mono)", fontSize: 12, color: "#C8D6DB", marginTop: 36,
    flexWrap: "wrap",
  },
  metaItem: { display: "flex", alignItems: "center", gap: 8 },
};

function Hero({ onBook }) {
  return (
    <section style={heroStyles.wrap}>
      <div style={heroStyles.bgPhoto} />
      <div style={heroStyles.sun} />
      {/* Mountain ridge silhouette */}
      <svg style={heroStyles.ridge} viewBox="0 0 1440 380" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 380 L0 240 L120 180 L220 220 L360 90 L520 140 L640 60 L760 130 L900 30 L1020 110 L1180 70 L1320 150 L1440 110 L1440 380 Z" fill="#1B3036" />
        <path d="M360 90 L520 140 L460 170 Z" fill="#3B6C73" opacity="0.85" />
        <path d="M640 60 L760 130 L700 160 Z" fill="#3B6C73" opacity="0.85" />
        <path d="M900 30 L1020 110 L960 140 Z" fill="#589F98" opacity="0.7" />
        <path d="M120 180 L220 220 L160 240 Z" fill="#589F98" opacity="0.6" />
      </svg>

      <div style={heroStyles.inner}>
        <Eyebrow color="var(--sunset-gold)">Spring 2026 Routes</Eyebrow>
        <h1 style={heroStyles.display}>All Roads,<br/>No Hurry.</h1>
        <p style={heroStyles.lead}>
          Small-group trips through the American West, the Andes,
          and everywhere a topo map gets interesting.
        </p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Button variant="primary" onClick={onBook}>
            See the 2026 lineup <Icon name="arrowRight" size={16} />
          </Button>
          <Button variant="secondary" onDark>Read field notes</Button>
        </div>

        <div style={heroStyles.meta}>
          <span style={heroStyles.metaItem}><Icon name="users" size={14}/> 8 travellers max</span>
          <span style={heroStyles.metaItem}><Icon name="calendar" size={14}/> Apr – Oct</span>
          <span style={heroStyles.metaItem}><Icon name="pin" size={14}/> 14 destinations</span>
          <span style={heroStyles.metaItem}><Icon name="check" size={14}/> Carbon-offset every trip</span>
        </div>
      </div>
    </section>
  );
}

export default Hero;
