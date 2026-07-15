import React from "react";
import { Eyebrow, Button, DiamondRule, Icon } from "./ui.jsx";

const refundStyles = {
  hero: { background: "var(--navy-ridge)", color: "var(--cream-bone)", padding: "100px 0 90px", position: "relative", overflow: "hidden" },
  sun: {
    position: "absolute", width: 460, aspectRatio: 1, borderRadius: "50%",
    background: "radial-gradient(circle at 50% 35%, rgba(249,187,94,0.55) 0%, rgba(232,120,70,0.4) 60%, rgba(232,120,70,0) 80%)",
    right: -110, top: -130, filter: "blur(4px)",
  },
  body: { background: "var(--cream-bone)", padding: "80px 0 120px" },
  h2: {
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: 30, lineHeight: 1.05, letterSpacing: "0.01em",
    textTransform: "uppercase", color: "var(--navy-night)", margin: "0 0 16px",
  },
  p: { fontFamily: "var(--font-sans)", fontSize: 16, lineHeight: 1.7, color: "var(--navy-night)", margin: "0 0 16px", textWrap: "pretty" },
  meta: { fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.12em", color: "var(--slate-blue)", textTransform: "uppercase" },
  block: { marginBottom: 48 },
};

// The refund tiers
const TIERS = [
  { window: "60+ days before departure", refund: "Full refund", note: "Minus the non-refundable deposit ($800).", tone: "positive" },
  { window: "45 – 59 days", refund: "75% refund", note: "Deposit forfeited. Balance refunded within 10 business days.", tone: "positive" },
  { window: "30 – 44 days", refund: "50% refund", note: "We've committed guides, permits, and lodging by now.", tone: "warning" },
  { window: "15 – 29 days", refund: "25% refund", note: "Most in-country costs are locked at this point.", tone: "warning" },
  { window: "0 – 14 days", refund: "No refund", note: "Transferable to another traveller at no charge — see below.", tone: "danger" },
];

const TONE = {
  positive: { bg: "#DFEDE3", fg: "#2F5C45", bar: "#4F8A6F" },
  warning:  { bg: "#FBE7C4", fg: "#7A5418", bar: "#F9BB5E" },
  danger:   { bg: "#F5DAD0", fg: "#7E2E20", bar: "#B84A35" },
};

function PolicyBlock({ n, title, children }) {
  return (
    <div style={refundStyles.block}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14 }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: "var(--sunset-orange)", letterSpacing: "0.02em", minWidth: 34 }}>{String(n).padStart(2, "0")}</span>
        <h2 style={refundStyles.h2}>{title}</h2>
      </div>
      <div style={{ paddingLeft: 48 }}>{children}</div>
    </div>
  );
}

function RefundPolicy({ setRoute }) {
  return (
    <article>
      <section style={refundStyles.hero}>
        <div style={refundStyles.sun} />
        <div className="container container--narrow" style={{ position: "relative" }}>
          <Eyebrow color="var(--sunset-gold)">Booking Terms</Eyebrow>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(48px, 7vw, 88px)", lineHeight: 0.92, letterSpacing: "0.01em", textTransform: "uppercase", color: "var(--cream-bone)", margin: "14px 0 20px" }}>
            Refund &<br/>Cancellation<br/>Policy.
          </h1>
          <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 20, color: "#C8D6DB", lineHeight: 1.5, maxWidth: 560, margin: 0 }}>
            Plans change — we get it. Here's exactly what happens to your money if you need to cancel, move, or hand off a trip. No fine print, no surprises.
          </p>
          <div style={{ ...refundStyles.meta, marginTop: 28, color: "#8FA1A8" }}>Last updated · 01 June 2026</div>
        </div>
      </section>

      <section style={refundStyles.body}>
        <div className="container container--narrow">

          {/* Refund tier table */}
          <PolicyBlock n={1} title="Cancellation by you">
            <p style={refundStyles.p}>
              Every trip carries a non-refundable <strong>$800 deposit</strong> that holds your spot. Beyond that,
              what you get back depends on how far out you cancel — because that's when our own costs lock in.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "24px 0 8px" }}>
              {TIERS.map((t) => {
                const tone = TONE[t.tone];
                return (
                  <div key={t.window} style={{ display: "flex", alignItems: "stretch", background: "#fff", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ width: 6, background: tone.bar, flexShrink: 0 }} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "16px 18px", flex: 1, alignItems: "center" }}>
                      <div>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--navy-night)" }}>{t.window}</div>
                        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg2)", marginTop: 4, lineHeight: 1.5 }}>{t.note}</div>
                      </div>
                      <div style={{ justifySelf: "end" }}>
                        <span style={{ background: tone.bg, color: tone.fg, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, letterSpacing: "0.06em", textTransform: "uppercase", padding: "7px 14px", borderRadius: 999, whiteSpace: "nowrap" }}>{t.refund}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ ...refundStyles.meta, marginTop: 14 }}>Windows are counted from your trip's first departure date.</p>
          </PolicyBlock>

          <DiamondRule />
          <div style={{ height: 40 }} />

          <PolicyBlock n={2} title="Transfer your spot">
            <p style={refundStyles.p}>
              Can't go but know someone who can? You may transfer your booking to another traveller at
              <strong> no charge up to 7 days before departure</strong>, as long as they meet the trip's fitness
              and experience requirements. The new traveller inherits your deposit and balance — settle up
              between yourselves. Just email us the handoff.
            </p>
          </PolicyBlock>

          <PolicyBlock n={3} title="Move to another departure">
            <p style={refundStyles.p}>
              Prefer a different date? One free date change is allowed per booking if requested
              <strong> 30 or more days out</strong>, subject to availability and any price difference between
              departures. Inside 30 days, a date change is treated as a cancellation under Section 1.
            </p>
          </PolicyBlock>

          <PolicyBlock n={4} title="Cancellation by us">
            <p style={refundStyles.p}>
              We rarely cancel — but weather, wildfire, political instability, or too few sign-ups can force our hand.
              If <strong>we</strong> cancel a departure, you choose: a <strong>full refund including your deposit</strong>,
              or a credit for any future trip valid for 24 months. We are not responsible for separately-booked
              flights or non-refundable travel costs, which is why we require insurance (Section 5).
            </p>
          </PolicyBlock>

          <PolicyBlock n={5} title="Travel insurance is required">
            <p style={refundStyles.p}>
              Comprehensive travel insurance — covering trip cancellation, medical evacuation, and lost gear —
              is <strong>mandatory</strong> for every traveller and must be in place within 14 days of booking.
              It's the single best protection against the costs this policy can't refund. We'll send two
              recommended providers after you book.
            </p>
          </PolicyBlock>

          <PolicyBlock n={6} title="How refunds are paid">
            <p style={refundStyles.p}>
              Approved refunds return to your original payment method within <strong>10 business days</strong> of
              written confirmation. International card refunds may take an extra billing cycle to appear — that's
              your bank, not us.
            </p>
          </PolicyBlock>

          {/* Contact CTA */}
          <div style={{ background: "var(--surface-warm)", border: "1px solid var(--cream-sand)", borderRadius: 14, padding: "32px 36px", marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, letterSpacing: "0.01em", textTransform: "uppercase", color: "var(--navy-night)", marginBottom: 6 }}>Need to cancel or change?</div>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 15, color: "var(--fg2)", margin: 0, lineHeight: 1.5 }}>
                Write to us — a real person reads every message. We reply within two business days.
              </p>
            </div>
            <Button variant="primary" onClick={() => setRoute && setRoute("contact")}>Contact us <Icon name="arrowRight" size={16}/></Button>
          </div>

          <p style={{ ...refundStyles.meta, marginTop: 40, lineHeight: 1.6 }}>
            This policy is a plain-language summary of the cancellation terms in your booking agreement. Where the two
            differ, the signed booking agreement governs. Capital Frontier Travel · Jackson, WY · IATA 12345678.
          </p>
        </div>
      </section>
    </article>
  );
}

export default RefundPolicy;
