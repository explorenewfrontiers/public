import React from "react";
import { Tag, Icon } from "./ui.jsx";

const tripCardStyles = {
  card: { display: "flex", flexDirection: "column", cursor: "pointer", textAlign: "left", border: "none", padding: 0, background: "transparent", width: "100%" },
  photo: {
    position: "relative",
    aspectRatio: "4 / 5",
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-sm)",
  },
  innerFrame: {
    position: "absolute", inset: 8,
    border: "1px solid rgba(252,242,224,0.35)",
    borderRadius: 4, pointerEvents: "none", zIndex: 3,
  },
  topRow: { position: "absolute", top: 14, left: 14, right: 14, display: "flex", justifyContent: "space-between", zIndex: 2 },
  ridge: { position: "absolute", left: 0, right: 0, bottom: 0, width: "100%", height: "55%", pointerEvents: "none" },
  body: { padding: "16px 4px 0" },
  eyebrow: {
    fontFamily: "var(--font-display)", fontWeight: 600,
    fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase",
    color: "var(--sunset-orange)",
  },
  title: {
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: 28, lineHeight: 1.0, letterSpacing: "0.01em",
    textTransform: "uppercase",
    color: "var(--navy-night)",
    margin: "6px 0 10px",
  },
  meta: {
    fontFamily: "var(--font-mono)", fontSize: 12,
    color: "var(--slate-cobalt)",
    display: "flex", gap: 10, alignItems: "center",
  },
  priceLine: {
    marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline",
    fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--slate-cobalt)",
  },
  price: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--navy-night)", letterSpacing: "0.02em" },
};

const PHOTO_PRESETS = {
  warm: "linear-gradient(170deg, #44606E 0%, #C5552A 60%, #F9BB5E 110%)",
  cool: "linear-gradient(170deg, #1B3036 0%, #2D4A5B 55%, #589F98 110%)",
  desert: "linear-gradient(180deg, #44606E 0%, #C9B68C 45%, #E87846 100%)",
  mist:  "linear-gradient(170deg, #44606E 0%, #6A8794 55%, #BCD8D3 110%)",
  dusk:  "linear-gradient(180deg, #1B3036 0%, #2D4A5B 40%, #C5552A 100%)",
  sea:   "linear-gradient(180deg, #1B3036 0%, #3B6C73 50%, #7BB8AE 100%)",
};

const RIDGE_VARIANTS = [
  "M0 200 L60 140 L120 165 L200 80 L280 130 L360 50 L440 100 L520 70 L600 130 L600 200 Z",
  "M0 200 L40 130 L100 160 L170 60 L240 100 L320 40 L400 80 L470 60 L550 120 L600 100 L600 200 Z",
  "M0 200 L80 100 L140 140 L210 50 L290 110 L370 30 L450 100 L530 70 L600 110 L600 200 Z",
];

function TripCard({ trip, onClick }) {
  const ridge = RIDGE_VARIANTS[trip.ridge ?? 0];
  return (
    <button style={tripCardStyles.card} onClick={onClick}>
      <div className="card" style={{ ...tripCardStyles.photo, background: PHOTO_PRESETS[trip.photo] || PHOTO_PRESETS.warm }}>
        <div style={tripCardStyles.innerFrame} />
        <div style={tripCardStyles.topRow}>
          {trip.featured ? <Tag variant="accent">Featured</Tag> : <span />}
          {trip.code && <Tag variant="code">{trip.code}</Tag>}
        </div>
        {/* sun behind peaks */}
        <div style={{
          position: "absolute", width: "55%", aspectRatio: 1, borderRadius: "50%",
          background: "radial-gradient(circle at 50% 35%, rgba(249,187,94,0.95) 0%, rgba(232,120,70,0.85) 60%, rgba(232,120,70,0) 78%)",
          left: "50%", top: "22%", transform: "translateX(-50%)",
          filter: "blur(1px)", zIndex: 1,
        }} />
        <svg style={tripCardStyles.ridge} viewBox="0 0 600 200" preserveAspectRatio="none" aria-hidden="true">
          <path d={ridge} fill="#1B3036" opacity="0.92" />
        </svg>
      </div>
      <div style={tripCardStyles.body}>
        <div style={tripCardStyles.eyebrow}>{trip.region}</div>
        <h3 style={tripCardStyles.title}>{trip.title}</h3>
        <div style={tripCardStyles.meta}>
          <span>{trip.days} days</span><span>·</span>
          <span>{trip.season}</span><span>·</span>
          <span>{trip.maxGuests} guests max</span>
        </div>
        <div style={tripCardStyles.priceLine}>
          <span>From</span>
          <span style={tripCardStyles.price}>${trip.from.toLocaleString()}</span>
        </div>
      </div>
    </button>
  );
}

export default TripCard;
