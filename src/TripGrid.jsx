import React from "react";
import { Eyebrow, Tag } from "./ui.jsx";
import TripCard from "./TripCard.jsx";

const TRIPS = [
  { id: "tetons",   code: "CFT-TET-12", title: "Tetons in Autumn",   region: "Wyoming",        days: 12, season: "Sep–Oct",  maxGuests: 10, from: 6800, featured: true,  photo: "warm",  ridge: 0 },
  { id: "torres",   code: "CFT-PAT-09", title: "Torres in Bloom",     region: "Patagonia",      days: 9,  season: "Apr–Oct",  maxGuests: 8,  from: 7200, featured: false, photo: "cool",  ridge: 1 },
  { id: "atacama",  code: "CFT-ATA-08", title: "Atacama High",        region: "Northern Chile", days: 8,  season: "Apr–Nov",  maxGuests: 8,  from: 5400, featured: false, photo: "desert",ridge: 2 },
  { id: "iceland",  code: "CFT-ICE-10", title: "Westfjords by Foot",  region: "Iceland",        days: 10, season: "Jun–Aug",  maxGuests: 8,  from: 8100, featured: false, photo: "mist",  ridge: 1 },
  { id: "olympic",  code: "CFT-OLY-07", title: "Olympic Peninsula",   region: "Washington",     days: 7,  season: "May–Sep",  maxGuests: 10, from: 4200, featured: false, photo: "sea",   ridge: 0 },
  { id: "highsier", code: "CFT-SIE-09", title: "The High Sierra",     region: "California",     days: 9,  season: "Jul–Sep",  maxGuests: 8,  from: 5800, featured: false, photo: "dusk",  ridge: 2 },
];

const tripGridStyles = {
  section: { background: "var(--cream-bone)", padding: "96px 0 120px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 56, gap: 32, flexWrap: "wrap" },
  title: {
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: "clamp(40px, 5vw, 64px)", lineHeight: 1, letterSpacing: "0.01em",
    textTransform: "uppercase", color: "var(--navy-night)", margin: "10px 0 0",
  },
  filters: {
    display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 36 },
};

function TripGrid({ onTripClick }) {
  const [filter, setFilter] = React.useState("all");
  const filters = ["all", "Wyoming", "Patagonia", "Iceland", "California"];
  const filtered = filter === "all" ? TRIPS : TRIPS.filter(t => t.region === filter);

  return (
    <section style={tripGridStyles.section}>
      <div className="container">
        <div style={tripGridStyles.header}>
          <div>
            <Eyebrow>The 2026 Lineup</Eyebrow>
            <h2 style={tripGridStyles.title}>Routes worth<br/>the slow road.</h2>
          </div>
          <div style={tripGridStyles.filters}>
            {filters.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{
                  border: filter === f ? "1px solid var(--navy-night)" : "1px solid var(--cream-dune)",
                  background: filter === f ? "var(--navy-night)" : "transparent",
                  color: filter === f ? "var(--cream-bone)" : "var(--slate-cobalt)",
                  borderRadius: 999, padding: "7px 14px",
                  fontFamily: "var(--font-display)", fontWeight: 600,
                  fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase",
                  cursor: "pointer",
                }}>
                {f === "all" ? "All routes" : f}
              </button>
            ))}
          </div>
        </div>
        <div style={tripGridStyles.grid}>
          {filtered.map(t => <TripCard key={t.id} trip={t} onClick={() => onTripClick && onTripClick(t)} />)}
        </div>
      </div>
    </section>
  );
}

export { TRIPS };
export default TripGrid;
