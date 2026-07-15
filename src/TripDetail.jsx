import React from "react";
import { Eyebrow, Button, Tag, DiamondRule, Icon } from "./ui.jsx";
import { ItineraryDay } from "./Itinerary.jsx";

const detailStyles = {
  hero: {
    position: "relative",
    height: 520,
    overflow: "hidden",
    background: "linear-gradient(180deg, #44606E 0%, #C5552A 60%, #F9BB5E 100%)",
    color: "var(--cream-bone)",
  },
  heroInner: { position: "relative", height: "100%", maxWidth: 1240, margin: "0 auto", padding: "0 32px", display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 60, zIndex: 2 },
  title: {
    fontFamily: "var(--font-display)", fontWeight: 800,
    fontSize: "clamp(64px, 9vw, 120px)", lineHeight: 0.9, letterSpacing: "0.005em",
    textTransform: "uppercase", color: "var(--cream-bone)", margin: "16px 0 0",
  },
  body: { padding: "80px 0 120px", background: "var(--cream-bone)" },
  cols: { display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 80, alignItems: "start" },
  sectionTitle: {
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: 36, lineHeight: 1, letterSpacing: "0.01em",
    textTransform: "uppercase", color: "var(--navy-night)", margin: "8px 0 24px",
  },
  lead: {
    fontFamily: "var(--font-serif)", fontStyle: "italic",
    fontSize: 22, lineHeight: 1.5, color: "var(--slate-cobalt)",
    marginBottom: 40, maxWidth: 580, textWrap: "pretty",
  },
  bookCard: {
    position: "sticky", top: 100,
    background: "var(--cream-bone)",
    border: "1px solid var(--border)", borderRadius: 8,
    padding: 28, boxShadow: "var(--shadow-md)",
  },
  price: {
    fontFamily: "var(--font-display)", fontWeight: 800,
    fontSize: 52, lineHeight: 1, color: "var(--navy-night)", letterSpacing: "0.01em",
  },
  priceLabel: { fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg3)", marginBottom: 8 },
  facts: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14,
    margin: "24px 0",
    fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--slate-cobalt)",
  },
  factLabel: { fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--slate-blue)", marginBottom: 3 },
  factVal: { fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--navy-night)", fontWeight: 500 },
  gearList: { display: "flex", flexDirection: "column", gap: 10, marginTop: 12 },
  gearItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--navy-night)" },
};

const TETONS_ITINERARY = [
  { day: 1, title: "Arrive Jackson",          desc: "Welcome dinner at the inn. Maps and gear distribution. Easy walk to the river at dusk.", miles: "0 mi", gain: "0 ft", hours: "16:00 → 21:00" },
  { day: 2, title: "Bridger-Teton intro",     desc: "Acclimatize with a half-day hike along the moraine, lunch above Phelps Lake.", miles: "6 mi", gain: "900 ft", hours: "08:00 → 15:00" },
  { day: 4, title: "Jackson → Jenny Lake",    desc: "Picnic supplied. Cold-water swim if weather permits. Camp at the south shore.", miles: "38 mi", gain: "1,200 ft", hours: "06:30 → 17:00" },
  { day: 7, title: "String Lake basecamp",    desc: "Two nights at camp. Optional summit attempt with our lead guide; rest day for those who'd rather read.", miles: "12 mi", gain: "2,400 ft", hours: "05:00 → 18:00" },
  { day: 12, title: "Last morning, last light", desc: "Sunrise on Cascade Canyon, then back to Jackson. Closing dinner. Trades and journals.", miles: "4 mi", gain: "300 ft", hours: "05:30 → 20:00" },
];

function TripDetail({ trip, onBook }) {
  return (
    <article>
      <section style={detailStyles.hero}>
        {/* sun */}
        <div style={{ position: "absolute", width: 800, aspectRatio: 1, borderRadius: "50%",
          background: "radial-gradient(circle at 50% 35%, rgba(249,187,94,0.95) 0%, rgba(232,120,70,0.85) 60%, rgba(232,120,70,0) 75%)",
          right: -200, top: -240, filter: "blur(2px)" }} />
        {/* ridges */}
        <svg style={{ position: "absolute", bottom: 0, left: 0, right: 0, width: "100%", height: "55%" }} viewBox="0 0 1440 400" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 400 L0 280 L100 220 L260 270 L380 140 L520 190 L640 80 L780 160 L900 60 L1080 140 L1220 110 L1320 170 L1440 130 L1440 400 Z" fill="#1B3036"/>
          <path d="M380 140 L520 190 L460 220 Z" fill="#3B6C73"/>
          <path d="M640 80 L780 160 L720 180 Z" fill="#3B6C73" opacity="0.85"/>
          <path d="M900 60 L1080 140 L1000 170 Z" fill="#589F98" opacity="0.6"/>
        </svg>
        <div style={detailStyles.heroInner}>
          <Eyebrow color="var(--sunset-gold)">Wyoming · CFT-TET-12</Eyebrow>
          <h1 style={detailStyles.title}>Tetons in<br/>Autumn.</h1>
          <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Tag variant="accent">Featured</Tag>
            <Tag variant="teal">12 days</Tag>
            <Tag variant="teal">10 guests max</Tag>
            <Tag variant="teal">Sep – Oct</Tag>
          </div>
        </div>
      </section>

      <section style={detailStyles.body}>
        <div className="container" style={detailStyles.cols}>
          <div>
            <Eyebrow>The Route</Eyebrow>
            <h2 style={detailStyles.sectionTitle}>Twelve days through the range.</h2>
            <p style={detailStyles.lead}>
              We move slowly. Six trail days, two rest days, four nights under canvas at String Lake.
              Mornings start with French press on the porch.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, margin: "32px 0 56px" }}>
              {TETONS_ITINERARY.map(d => <ItineraryDay key={d.day} {...d} />)}
            </div>

            <DiamondRule />

            <div style={{ marginTop: 56 }}>
              <Eyebrow>What we bring</Eyebrow>
              <h2 style={detailStyles.sectionTitle}>The gear is on us.</h2>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 15, color: "var(--fg2)", lineHeight: 1.65, maxWidth: 600 }}>
                You arrive with a duffel and a daypack. We handle tents, sleeping systems,
                cooking kit, satellite comms, first aid, and all in-country transport.
              </p>
              <div style={detailStyles.gearList}>
                {[
                  ["Big Agnes Copper Spur", "tent, 2-person"],
                  ["Nemo Sonic 0°", "down sleeping bag"],
                  ["MSR Whisperlite", "stove + fuel"],
                  ["Garmin inReach", "satellite comms"],
                  ["Two-way radios", "for the group"],
                  ["First aid kit (WFR-staffed)", "with AED"],
                ].map(([item, desc]) => (
                  <div key={item} style={detailStyles.gearItem}>
                    <span style={{ fontWeight: 500 }}>{item}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--slate-blue)" }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside>
            <div style={detailStyles.bookCard}>
              <div style={detailStyles.priceLabel}>From</div>
              <div style={detailStyles.price}>$6,800<span style={{ fontSize: 16, fontWeight: 500, color: "var(--fg3)", letterSpacing: 0, fontFamily: "var(--font-sans)" }}> / person</span></div>
              <div style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />
              <div style={detailStyles.facts}>
                <div>
                  <div style={detailStyles.factLabel}>Starts</div>
                  <div style={detailStyles.factVal}>Jackson, WY</div>
                </div>
                <div>
                  <div style={detailStyles.factLabel}>Ends</div>
                  <div style={detailStyles.factVal}>Jackson, WY</div>
                </div>
                <div>
                  <div style={detailStyles.factLabel}>Group size</div>
                  <div style={detailStyles.factVal}>4 – 10</div>
                </div>
                <div>
                  <div style={detailStyles.factLabel}>Difficulty</div>
                  <div style={detailStyles.factVal}>Moderate</div>
                </div>
                <div>
                  <div style={detailStyles.factLabel}>Departures</div>
                  <div style={detailStyles.factVal}>9 / 16 / 23 Sep</div>
                </div>
                <div>
                  <div style={detailStyles.factLabel}>Deposit</div>
                  <div style={detailStyles.factVal}>$800</div>
                </div>
              </div>
              <Button variant="primary" onClick={onBook} style={{ width: "100%", justifyContent: "center" }}>
                Hold my spot <Icon name="arrowRight" size={16}/>
              </Button>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--fg3)", marginTop: 14, lineHeight: 1.5, textAlign: "center" }}>
                No card charged until you confirm. <br/>Full refund within 14 days.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </article>
  );
}

export default TripDetail;
