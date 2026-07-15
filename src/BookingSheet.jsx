import React from "react";
import { Eyebrow, Button, Tag, Icon, Field, TextInput } from "./ui.jsx";

const { useState } = React;

const bookStyles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(27, 48, 54, 0.65)",
    backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 100,
    animation: "cftFade 220ms ease-out",
  },
  sheet: {
    width: "min(680px, 90vw)", maxHeight: "92vh", overflow: "auto",
    background: "var(--cream-bone)",
    border: "1px solid var(--border)", borderRadius: 14,
    boxShadow: "var(--shadow-lg)",
    padding: "36px 40px 32px",
    position: "relative",
  },
  close: {
    position: "absolute", top: 16, right: 16,
    background: "transparent", border: "none", cursor: "pointer",
    color: "var(--slate-cobalt)", padding: 6, borderRadius: 4,
  },
  title: {
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: 40, lineHeight: 1, letterSpacing: "0.01em",
    textTransform: "uppercase", color: "var(--navy-night)", margin: "10px 0 0",
  },
  subtitle: { fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 17, color: "var(--slate-cobalt)", marginTop: 10 },
  row: { display: "flex", gap: 14, marginTop: 16 },
  dateChip: {
    flex: 1,
    border: "1px solid var(--cream-sand)", background: "#fff",
    borderRadius: 6, padding: "12px 14px", cursor: "pointer",
    textAlign: "left",
  },
  dateChipActive: {
    border: "1px solid var(--sunset-orange)",
    boxShadow: "0 0 0 3px rgba(232, 120, 70, 0.18)",
  },
  dateLabel: { fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: "0.22em", color: "var(--slate-cobalt)", textTransform: "uppercase" },
  dateValue: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--navy-night)", marginTop: 4, letterSpacing: "0.01em", textTransform: "uppercase" },
  stepper: { display: "flex", alignItems: "center", border: "1px solid var(--cream-sand)", background: "#fff", borderRadius: 4, overflow: "hidden", width: "fit-content" },
  stepBtn: { background: "transparent", border: "none", padding: "10px 14px", cursor: "pointer", color: "var(--navy-night)" },
  stepVal: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, padding: "0 14px", color: "var(--navy-night)" },
  summary: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28, padding: "18px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" },
  total: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 36, color: "var(--navy-night)", lineHeight: 1 },
};

function BookingSheet({ open, onClose, trip }) {
  const [date, setDate] = useState(0);
  const [guests, setGuests] = useState(2);
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;
  const dates = ["09 Sep", "16 Sep", "23 Sep"];
  const total = (trip?.from || 6800) * guests;

  return (
    <div style={bookStyles.overlay} onClick={onClose}>
      <div style={bookStyles.sheet} onClick={(e) => e.stopPropagation()}>
        <button style={bookStyles.close} onClick={onClose}>
          <Icon name="x" size={20}/>
        </button>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <Eyebrow>You're going</Eyebrow>
            <h2 style={{ ...bookStyles.title, marginTop: 16 }}>See you on<br/>the trailhead.</h2>
            <p style={{ ...bookStyles.subtitle, maxWidth: 440, margin: "20px auto 0" }}>
              We've held your spot. Your full gear list and pre-trip call land six weeks before departure.
            </p>
            <div style={{ marginTop: 32 }}>
              <Button variant="secondary" onClick={onClose}>Back to the site</Button>
            </div>
          </div>
        ) : (
          <>
            <Eyebrow>Hold a spot</Eyebrow>
            <h2 style={bookStyles.title}>{trip?.title || "Tetons in Autumn"}</h2>
            <p style={bookStyles.subtitle}>No card charged today. We'll send a confirmation within 24 hours.</p>

            <div style={{ marginTop: 28 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--slate-cobalt)", marginBottom: 8 }}>Departures</div>
              <div style={bookStyles.row}>
                {dates.map((d, i) => (
                  <button key={i}
                    style={{ ...bookStyles.dateChip, ...(date === i ? bookStyles.dateChipActive : {}) }}
                    onClick={() => setDate(i)}>
                    <div style={bookStyles.dateLabel}>Departure</div>
                    <div style={bookStyles.dateValue}>{d}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
              <Field label="Guests">
                <div style={bookStyles.stepper}>
                  <button style={bookStyles.stepBtn} onClick={() => setGuests(g => Math.max(1, g - 1))}><Icon name="minus" size={16} /></button>
                  <span style={bookStyles.stepVal}>{guests}</span>
                  <button style={bookStyles.stepBtn} onClick={() => setGuests(g => Math.min(10, g + 1))}><Icon name="plus" size={16} /></button>
                </div>
              </Field>
              <Field label="Email">
                <TextInput placeholder="you@example.com" type="email" />
              </Field>
            </div>

            <div style={bookStyles.summary}>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--slate-blue)" }}>Total</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--slate-cobalt)", marginTop: 4 }}>${(trip?.from || 6800).toLocaleString()} × {guests} guests</div>
              </div>
              <div style={bookStyles.total}>${total.toLocaleString()}</div>
            </div>

            <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--fg3)" }}>
                We hold the spot for 7 days while you decide.
              </span>
              <Button variant="primary" onClick={() => setSubmitted(true)}>
                Send my booking <Icon name="arrowRight" size={16}/>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BookingSheet;
