import React from "react";
import { Eyebrow, DiamondRule, Field } from "./ui.jsx";

const journalStyles = {
  section: { background: "var(--cream-canvas)", padding: "120px 0" },
  header: { textAlign: "center", marginBottom: 64 },
  title: {
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: "clamp(48px, 6vw, 80px)", lineHeight: 0.95, letterSpacing: "0.01em",
    textTransform: "uppercase", color: "var(--navy-night)", margin: "12px 0 0",
  },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 40 },
  entry: { display: "flex", flexDirection: "column", gap: 14, cursor: "pointer" },
  thumb: {
    aspectRatio: "5 / 4",
    borderRadius: 6, overflow: "hidden",
    border: "1px solid var(--border)",
  },
  meta: {
    fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--slate-blue)",
    display: "flex", justifyContent: "space-between",
  },
  entryTitle: {
    fontFamily: "var(--font-serif)", fontStyle: "italic", fontWeight: 500,
    fontSize: 24, lineHeight: 1.2, color: "var(--navy-night)", margin: 0,
    textWrap: "pretty",
  },
  excerpt: { fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg2)", lineHeight: 1.6, textWrap: "pretty" },
  byline: { fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--slate-cobalt)" },
};

const ENTRIES = [
  {
    id: "jenny-lake",
    title: "A morning above Jenny Lake",
    excerpt: "There is a quiet that only arrives at 5:42 a.m. above an alpine lake. It is not the absence of sound — it is the presence of distance.",
    author: "Maren Cole",
    date: "12 Sep 2025",
    read: "6 min read",
    gradient: "linear-gradient(170deg, #1B3036 0%, #44606E 50%, #BCD8D3 100%)",
    ridge: 0,
  },
  {
    id: "patagonia",
    title: "On the long road to Torres del Paine",
    excerpt: "We crossed a border so quiet the guard stamped our books while a kettle whistled in the back. The wind picked up before we reached the truck.",
    author: "Diego Reyes",
    date: "30 Aug 2025",
    read: "8 min read",
    gradient: "linear-gradient(170deg, #2D4A5B 0%, #589F98 70%, #E8D9B6 100%)",
    ridge: 1,
  },
  {
    id: "packing",
    title: "What to pack — and what to leave behind",
    excerpt: "After fifteen seasons in the field, our lead guide's gear list has gotten shorter, not longer. The thing she will not travel without may surprise you.",
    author: "CFT Field Team",
    date: "08 Aug 2025",
    read: "4 min read",
    gradient: "linear-gradient(170deg, #44606E 0%, #C5552A 70%, #F9BB5E 100%)",
    ridge: 2,
  },
];

const RIDGES = [
  "M0 200 L40 130 L100 160 L170 60 L240 100 L320 40 L400 80 L470 60 L550 120 L600 100 L600 200 Z",
  "M0 200 L60 140 L120 165 L200 80 L280 130 L360 50 L440 100 L520 70 L600 130 L600 200 Z",
  "M0 200 L80 100 L140 140 L210 50 L290 110 L370 30 L450 100 L530 70 L600 110 L600 200 Z",
];

function JournalList() {
  return (
    <section style={journalStyles.section}>
      <div className="container">
        <div style={journalStyles.header}>
          <Eyebrow>Field Notes</Eyebrow>
          <h2 style={journalStyles.title}>From the road.</h2>
          <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 19, color: "var(--slate-cobalt)", maxWidth: 540, margin: "20px auto 0", lineHeight: 1.55 }}>
            Dispatches from our guides — gear honestly tested, weather honestly described, places worth going back to.
          </p>
        </div>
        <div style={journalStyles.grid}>
          {ENTRIES.map((e, i) => (
            <article key={e.id} style={journalStyles.entry}>
              <div style={{ ...journalStyles.thumb, background: e.gradient, position: "relative" }}>
                <div style={{ position: "absolute", width: "55%", aspectRatio: 1, borderRadius: "50%",
                  background: "radial-gradient(circle at 50% 35%, rgba(249,187,94,0.95) 0%, rgba(232,120,70,0.85) 60%, rgba(232,120,70,0) 78%)",
                  left: "50%", top: "20%", transform: "translateX(-50%)", filter: "blur(1px)" }} />
                <svg style={{ position: "absolute", bottom: 0, left: 0, right: 0, width: "100%", height: "55%" }} viewBox="0 0 600 200" preserveAspectRatio="none" aria-hidden="true">
                  <path d={RIDGES[e.ridge]} fill="#1B3036" opacity="0.9"/>
                </svg>
              </div>
              <div style={journalStyles.meta}>
                <span>{e.date}</span>
                <span>{e.read}</span>
              </div>
              <h3 style={journalStyles.entryTitle}>{e.title}</h3>
              <p style={journalStyles.excerpt}>{e.excerpt}</p>
              <div style={journalStyles.byline}>— {e.author}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default JournalList;
