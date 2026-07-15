import React from "react";
import { Eyebrow, Button, Tag, DiamondRule, Icon } from "./ui.jsx";
import ApplicationForm from "./ApplicationForm.jsx";

const { useState } = React;

const TIERS = [
  { name: "Starter",  band: "Through your first $5,000 sold · minimum 30 days", split: "50%", note: "The only phase with a $49.99/month platform fee. Full training + mentorship while you ramp." },
  { name: "Voyager",  band: "Through $10,000 sold · minimum 60 days",          split: "60%", note: "No monthly fee. A higher split as your volume grows." },
  { name: "Frontier", band: "Once you pass $10,000 sold",                       split: "70%", note: "Top sub-agent split — plus production bonuses (see below)." },
];

/* Frontier production bonuses, paid per $10,000 milestone */
const BONUS = [
  { milestone: "At $10,000 sold", amount: "$100" },
  { milestone: "Next $10,000 (→ $20,000)", amount: "$150" },
  { milestone: "Next $10,000 (→ $30,000)", amount: "$200" },
  { milestone: "Every $10,000 after that", amount: "$200" },
];

/* Career path beyond the sub-agent tiers */
const CAREER = [
  {
    tag: "Sub-agent",
    title: "Commission tiers",
    detail: "Start as a 1099 sub-agent and climb Starter → Voyager → Frontier on the splits above, earning production bonuses along the way.",
  },
  {
    tag: "Next step",
    title: "Contractor (30 hrs/week)",
    detail: "Top producers can move into a 30-hour/week contractor role: negotiable base pay, a 75% commission split, and a $750 sign-on bonus. Minimum 6-month commitment.",
  },
  {
    tag: "The goal",
    title: "VIP Account Manager (W-2)",
    detail: "About a year later, strong contractors can convert to a full-time W-2 VIP Account Manager with benefits. All advancement is performance-based, evaluated by the Sales Team Lead.",
  },
];

const c = {
  hero: { background: "linear-gradient(165deg, var(--navy-night) 0%, var(--navy-ridge) 60%, var(--teal-deep) 130%)", color: "var(--cream-bone)", padding: "96px 0 84px", position: "relative", overflow: "hidden" },
  heroInner: { position: "relative", zIndex: 2, maxWidth: 760 },
  title: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(48px, 7vw, 88px)", lineHeight: 0.92, letterSpacing: "0.01em", textTransform: "uppercase", margin: "14px 0 18px" },
  heroLead: { fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 21, lineHeight: 1.55, color: "#C8D6DB", maxWidth: 620, marginBottom: 30 },
  disc: { position: "absolute", right: "-90px", top: "-70px", width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle at 50% 35%, var(--sunset-gold) 0%, var(--sunset-orange) 75%)", opacity: 0.22, zIndex: 1 },

  section: { padding: "84px 0" },
  sectionCream: { background: "var(--cream-canvas)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" },
  center: { textAlign: "center", maxWidth: 680, margin: "0 auto 48px" },
  h2: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(34px, 4.5vw, 56px)", lineHeight: 1, letterSpacing: "0.01em", textTransform: "uppercase", color: "var(--navy-night)", margin: "10px 0 14px" },
  sub: { fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 19, color: "var(--slate-cobalt)", lineHeight: 1.55 },

  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 22 },
  card: { background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "26px 24px", boxShadow: "var(--shadow-sm)" },
  iconWrap: { display: "grid", placeItems: "center", width: 46, height: 46, borderRadius: 8, background: "var(--surface-warm)", color: "var(--sunset-ember)", marginBottom: 16 },
  cardTitle: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--navy-night)", marginBottom: 8 },
  cardText: { fontFamily: "var(--font-sans)", fontSize: 14.5, lineHeight: 1.6, color: "var(--slate-cobalt)" },

  tierWrap: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginTop: 8 },
  tier: { background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "30px 26px", boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 10 },
  tierName: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--navy-night)" },
  tierSplit: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 52, lineHeight: 1, color: "var(--sunset-orange)" },
  tierSplitLabel: { fontFamily: "var(--font-sans)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--slate-blue)", marginTop: 2 },
  tierBand: { fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--slate-cobalt)", lineHeight: 1.5 },
  tierNote: { fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 14, color: "var(--slate-cobalt)", borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 4 },
  footnote: { fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--slate-blue)", textAlign: "center", marginTop: 22, lineHeight: 1.6 },

  bonusBox: { maxWidth: 640, margin: "34px auto 0", background: "#fff", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-sm)", overflow: "hidden" },
  bonusHead: { background: "var(--navy-night)", color: "var(--cream-bone)", padding: "16px 22px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, letterSpacing: "0.14em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 10 },
  bonusRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 22px", borderTop: "1px solid var(--border)" },
  bonusMile: { fontFamily: "var(--font-sans)", fontSize: 14.5, color: "var(--navy-night)" },
  bonusAmt: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: "var(--sunset-orange)" },

  careerWrap: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginTop: 8 },
  careerCard: { background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "26px 24px", boxShadow: "var(--shadow-sm)", position: "relative" },
  careerTag: { display: "inline-block", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--sunset-ember)", background: "var(--surface-warm)", border: "1px solid var(--border)", borderRadius: 999, padding: "5px 12px", marginBottom: 14 },
  careerTitle: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, letterSpacing: "0.02em", textTransform: "uppercase", color: "var(--navy-night)", marginBottom: 8 },
  careerText: { fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.6, color: "var(--slate-cobalt)" },

  steps: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 },
  step: { position: "relative", padding: "8px 4px" },
  stepNum: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 40, color: "var(--sunset-orange)", lineHeight: 1, marginBottom: 10 },
  stepTitle: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--navy-night)", marginBottom: 8 },
  stepText: { fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.6, color: "var(--slate-cobalt)" },

  ctaBand: { background: "var(--navy-night)", color: "var(--cream-bone)", padding: "80px 0", textAlign: "center" },
  ctaTitle: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(36px, 5vw, 64px)", lineHeight: 0.95, letterSpacing: "0.01em", textTransform: "uppercase", margin: "12px 0 16px" },
  ctaLead: { fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 19, color: "#C8D6DB", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.55 },
};

const FIT = [
  { icon: "compass", title: "New to the industry", text: "No experience required. If you love travel and can talk to people, we train you on the tools, suppliers, and booking flow from day one." },
  { icon: "users", title: "Side-hustlers with a network", text: "Turn the trips your friends, family, and community already take into commissionable bookings — on your own schedule." },
  { icon: "backpack", title: "Hospitality & service pros", text: "Concierges, event planners, and customer-facing pros who already advise on travel and want to get paid for it." },
  { icon: "mountain", title: "Agents wanting a better split", text: "Independent agents looking for a supportive host, strong supplier access, and a clear path to a higher commission tier." },
];

const PERKS = [
  { icon: "map", title: "Supplier access", text: "Book flights, hotels, cruises, tours, and packages through the Gateway Travel network's supplier relationships." },
  { icon: "check", title: "Training & mentorship", text: "Structured onboarding plus ongoing support so you're never guessing on a booking." },
  { icon: "tent", title: "Back-office handled", text: "Commission tracking, supplier payments, and reconciliation run through the host — you focus on clients." },
  { icon: "sun", title: "Your brand, our engine", text: "Operate under the Capital Frontier Travel banner with marketing support behind you." },
];

const STEPS = [
  { n: "1", title: "Apply", text: "Submit a short application to join as a Capital Frontier Travel sub-agent under Gateway Travel." },
  { n: "2", title: "Onboard & train", text: "Complete host onboarding and our training so you know the tools, suppliers, and booking process." },
  { n: "3", title: "Get set up", text: "Receive your agent credentials, booking logins, and branded materials — everything you need to sell." },
  { n: "4", title: "Book & earn", text: "Start booking travel for clients and earn your commission split, growing into higher tiers as you scale." },
];

function BecomeAgent({ setRoute }) {
  const [applyOpen, setApplyOpen] = useState(false);
  const openApply = () => setApplyOpen(true);
  return (
    <>
      {/* HERO */}
      <section style={c.hero}>
        <div style={c.disc} />
        <div className="container">
          <div style={c.heroInner}>
            <Eyebrow color="var(--sunset-gold)">Partner Program</Eyebrow>
            <h1 style={c.title}>Become a<br />Sub-Agent</h1>
            <p style={c.heroLead}>
              Build your own travel business with a host behind you. Sell the trips you love,
              earn real commission, and grow into higher splits as you go — under the Capital
              Frontier Travel banner, powered by Gateway Travel.
            </p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Button variant="primary" onClick={openApply}>Apply to join <Icon name="arrowRight" size={16} /></Button>
              <Button variant="secondary" onDark onClick={() => setRoute && setRoute("contact")}>Ask a question</Button>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section style={c.section}>
        <div className="container">
          <div style={c.center}>
            <Eyebrow>Who it's ideal for</Eyebrow>
            <h2 style={c.h2}>Made for the curious &amp; the driven</h2>
            <p style={c.sub}>You don't need a license or a résumé in travel. You need people you can help and the will to learn.</p>
          </div>
          <div style={c.grid3}>
            {FIT.map((it) => (
              <div key={it.title} style={c.card}>
                <div style={c.iconWrap}><Icon name={it.icon} size={22} /></div>
                <div style={c.cardTitle}>{it.title}</div>
                <div style={c.cardText}>{it.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMISSION STRUCTURE */}
      <section style={{ ...c.section, ...c.sectionCream }}>
        <div className="container">
          <div style={c.center}>
            <Eyebrow>The commission structure</Eyebrow>
            <h2 style={c.h2}>You earn as you grow</h2>
            <p style={c.sub}>
              Suppliers pay a commission on the travel you book. That commission flows through Gateway
              Travel, and you keep your tier's share. The more you book, the bigger your split.
            </p>
          </div>
          <div style={c.tierWrap}>
            {TIERS.map((t) => (
              <div key={t.name} style={c.tier}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={c.tierName}>{t.name}</span>
                  {t.name === "Voyager" && <Tag variant="accent">Popular</Tag>}
                </div>
                <div>
                  <div style={c.tierSplit}>{t.split}</div>
                  <div style={c.tierSplitLabel}>of commission to you</div>
                </div>
                <div style={c.tierBand}>{t.band}</div>
                <div style={c.tierNote}>{t.note}</div>
              </div>
            ))}
          </div>
          {/* Frontier production bonuses */}
          <div style={c.bonusBox}>
            <div style={c.bonusHead}><Icon name="sun" size={17} /> Frontier production bonuses</div>
            {BONUS.map((b) => (
              <div key={b.milestone} style={c.bonusRow}>
                <span style={c.bonusMile}>{b.milestone}</span>
                <span style={c.bonusAmt}>{b.amount}</span>
              </div>
            ))}
          </div>
          <p style={c.footnote}>
            Thresholds are measured by travel sold. The $49.99/month platform fee applies only during the
            Starter phase. Final terms are confirmed in your enrollment agreement with Gateway Travel.
          </p>
        </div>
      </section>

      {/* CAREER PATH */}
      <section style={c.section}>
        <div className="container">
          <div style={c.center}>
            <Eyebrow>Where it can lead</Eyebrow>
            <h2 style={c.h2}>A real career path</h2>
            <p style={c.sub}>
              This isn't a dead-end side gig. Perform, and there's a defined road from sub-agent to
              salaried account manager — every step earned on results.
            </p>
          </div>
          <div style={c.careerWrap}>
            {CAREER.map((s, i) => (
              <div key={s.title} style={c.careerCard}>
                <span style={c.careerTag}>{s.tag}</span>
                <div style={c.careerTitle}>{s.title}</div>
                <div style={c.careerText}>{s.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section style={c.section}>
        <div className="container">
          <div style={c.center}>
            <Eyebrow>What you get</Eyebrow>
            <h2 style={c.h2}>A real business, not a guess</h2>
          </div>
          <div style={c.grid3}>
            {PERKS.map((it) => (
              <div key={it.title} style={c.card}>
                <div style={c.iconWrap}><Icon name={it.icon} size={22} /></div>
                <div style={c.cardTitle}>{it.title}</div>
                <div style={c.cardText}>{it.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ENROLLMENT STEPS */}
      <section style={{ ...c.section, ...c.sectionCream }}>
        <div className="container">
          <div style={c.center}>
            <Eyebrow>How to enroll</Eyebrow>
            <h2 style={c.h2}>Four steps to your first booking</h2>
          </div>
          <div style={{ margin: "0 auto 40px", maxWidth: 520 }}><DiamondRule /></div>
          <div style={c.steps}>
            {STEPS.map((st) => (
              <div key={st.n} style={c.step}>
                <div style={c.stepNum}>{st.n}</div>
                <div style={c.stepTitle}>{st.title}</div>
                <div style={c.stepText}>{st.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={c.ctaBand}>
        <div className="container container--narrow">
          <Eyebrow color="var(--sunset-gold)">Ready when you are</Eyebrow>
          <h2 style={c.ctaTitle}>Start your travel business</h2>
          <p style={c.ctaLead}>
            Apply to become a Capital Frontier Travel sub-agent and we'll walk you through enrollment,
            training, and your first booking.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Button variant="primary" onClick={openApply}>Apply to join <Icon name="arrowRight" size={16} /></Button>
            <Button variant="secondary" onDark onClick={() => setRoute && setRoute("contact")}>Contact us</Button>
          </div>
        </div>
      </section>

      <ApplicationForm open={applyOpen} onClose={() => setApplyOpen(false)} />
    </>
  );
}

export default BecomeAgent;
