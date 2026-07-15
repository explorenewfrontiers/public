import React from "react";

const itineraryStyles = {
  block: {
    background: "var(--cream-bone)",
    border: "1px dashed var(--slate-blue)",
    borderRadius: 6,
    padding: "20px 24px",
    position: "relative",
    display: "flex", justifyContent: "space-between", gap: 24,
    alignItems: "flex-start",
  },
  notchL: {
    position: "absolute", left: -8, top: "50%", transform: "translateY(-50%)",
    width: 16, height: 16, borderRadius: "50%",
    background: "var(--cream-canvas)",
  },
  notchR: {
    position: "absolute", right: -8, top: "50%", transform: "translateY(-50%)",
    width: 16, height: 16, borderRadius: "50%",
    background: "var(--cream-canvas)",
  },
  dayLabel: {
    fontFamily: "var(--font-display)", fontWeight: 600,
    fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
    color: "var(--sunset-orange)",
  },
  title: {
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: 26, lineHeight: 1.05, letterSpacing: "0.01em",
    textTransform: "uppercase", color: "var(--navy-night)", margin: "6px 0 8px",
  },
  desc: { fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg2)", maxWidth: 480, lineHeight: 1.55 },
  stats: {
    textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12,
    color: "var(--slate-cobalt)", minWidth: 120, display: "flex", flexDirection: "column", gap: 4,
  },
};

function ItineraryDay({ day, title, desc, miles, gain, hours }) {
  return (
    <div style={itineraryStyles.block}>
      <span style={itineraryStyles.notchL} />
      <span style={itineraryStyles.notchR} />
      <div>
        <div style={itineraryStyles.dayLabel}>← Day {String(day).padStart(2, "0")} →</div>
        <h3 style={itineraryStyles.title}>{title}</h3>
        <p style={itineraryStyles.desc}>{desc}</p>
      </div>
      <div style={itineraryStyles.stats}>
        {miles && <div>{miles}</div>}
        {gain && <div>↑ {gain}</div>}
        {hours && <div>{hours}</div>}
      </div>
    </div>
  );
}

export { ItineraryDay };
