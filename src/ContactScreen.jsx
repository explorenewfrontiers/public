import React from "react";
import { Eyebrow, Button, DiamondRule, Icon, Field, TextInput } from "./ui.jsx";

function ContactScreen({ setRoute }) {
  const [sent, setSent] = React.useState(false);
  return (
    <section style={{ background: "var(--cream-bone)", padding: "100px 0 120px" }}>
      <div className="container container--narrow">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <Eyebrow>Get in touch</Eyebrow>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(48px, 7vw, 88px)", lineHeight: 0.92, letterSpacing: "0.01em", textTransform: "uppercase", color: "var(--navy-night)", margin: "14px 0 20px" }}>
            Say hello.
          </h1>
          <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 20, color: "var(--slate-cobalt)", lineHeight: 1.55, maxWidth: 560, margin: "0 auto", textWrap: "pretty" }}>
            Trip questions, custom routes, cancellations, press, partnerships. A real person reads every message — we reply within two business days.
          </p>
        </div>

        {sent ? (
          <div style={{ background: "var(--surface-warm)", border: "1px solid var(--cream-sand)", borderRadius: 14, padding: "48px 40px", textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
            <Eyebrow>Message sent</Eyebrow>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 36, letterSpacing: "0.01em", textTransform: "uppercase", color: "var(--navy-night)", margin: "16px 0 12px" }}>Thanks — we're on it.</h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 15, color: "var(--fg2)", lineHeight: 1.6, margin: "0 0 28px" }}>
              We'll reply to you within two business days. In the meantime, the trail's still there.
            </p>
            <Button variant="secondary" onClick={() => setRoute && setRoute("home")}>Back to routes</Button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 56, alignItems: "start" }}>
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: 32, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "flex", gap: 14 }}>
                <Field label="Name"><TextInput placeholder="Your name" required /></Field>
                <Field label="Email"><TextInput type="email" placeholder="you@example.com" required /></Field>
              </div>
              <Field label="Trip you're considering">
                <select style={{ fontFamily: "var(--font-sans)", fontSize: 15, padding: "12px 14px", background: "#fff", border: "1px solid var(--cream-sand)", borderRadius: 4, color: "var(--navy-night)", outline: "none", width: "100%" }}>
                  <option>Not sure yet</option>
                  <option>Tetons in Autumn</option>
                  <option>Torres in Bloom</option>
                  <option>Atacama High</option>
                  <option>Westfjords by Foot</option>
                  <option>A custom route</option>
                  <option>Cancellation / refund</option>
                </select>
              </Field>
              <Field label="Message">
                <textarea rows={5} placeholder="Tell us what you're thinking." required
                  style={{ fontFamily: "var(--font-sans)", fontSize: 15, padding: "12px 14px", background: "#fff", border: "1px solid var(--cream-sand)", borderRadius: 4, color: "var(--navy-night)", outline: "none", width: "100%", resize: "vertical" }} />
              </Field>
              <Button variant="primary" type="submit" style={{ width: "100%", justifyContent: "center" }}>Send <Icon name="arrowRight" size={16}/></Button>
            </form>

            <aside style={{ fontFamily: "var(--font-sans)" }}>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--sunset-orange)", marginBottom: 10 }}>By email</div>
                <a href="mailto:hello@capitalfrontier.travel" style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--navy-night)", border: "none" }}>hello@capitalfrontier.travel</a>
              </div>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--sunset-orange)", marginBottom: 10 }}>By phone</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--navy-night)" }}>+1 307 555 0142</div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg3)", marginTop: 4 }}>Mon–Fri · 9–5 Mountain</div>
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--sunset-orange)", marginBottom: 10 }}>The office</div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--navy-night)", lineHeight: 1.6 }}>245 W Broadway<br/>Jackson, WY 83001</div>
              </div>
              <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
                <button onClick={() => setRoute && setRoute("refund")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--sunset-orange)", display: "inline-flex", alignItems: "center", gap: 8 }}>Read our refund policy →</button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}

export default ContactScreen;
