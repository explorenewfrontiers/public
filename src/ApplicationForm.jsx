import React from "react";
import { Eyebrow, Button, Icon } from "./ui.jsx";

const { useState } = React;

/* Netlify Forms: this posts to "/" with the form-name so Netlify captures it.
   The hidden "subject" field sets the notification email subject line to
   "New sub-agent application submitted". Configure the recipient
   (hr@capitalfrontiertravel.com) once in Netlify → Forms → notifications.
   A matching hidden static form lives in index.html so Netlify detects it. */
const FORM_NAME = "subagent-application";

/* ---- DISC forced-choice rows (Most / Least like you) ---- */
const DISC_ROWS = [
  ["Bold", "Lively", "Patient", "Precise"],
  ["Direct", "Playful", "Loyal", "Analytical"],
  ["Competitive", "Persuasive", "Steady", "Careful"],
  ["Decisive", "Optimistic", "Calm", "Accurate"],
  ["Driven", "Sociable", "Supportive", "Systematic"],
  ["Independent", "Enthusiastic", "Reliable", "Cautious"],
  ["Forceful", "Expressive", "Easygoing", "Detailed"],
  ["Results-focused", "Inspiring", "Team-oriented", "Quality-focused"],
];

const st = {
  overlay: { position: "fixed", inset: 0, zIndex: 200, background: "rgba(27,48,54,0.62)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" },
  panel: { background: "var(--cream-bone)", width: "100%", maxWidth: 760, borderRadius: 12, boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)", overflow: "hidden", marginBottom: 40 },
  head: { background: "linear-gradient(165deg, var(--navy-night), var(--navy-ridge))", color: "var(--cream-bone)", padding: "26px 28px", position: "relative" },
  title: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 30, letterSpacing: "0.02em", textTransform: "uppercase", margin: "8px 0 6px" },
  headSub: { fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 15, color: "#C8D6DB", lineHeight: 1.5, maxWidth: 560 },
  close: { position: "absolute", top: 18, right: 18, width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.06)", color: "var(--cream-bone)", cursor: "pointer", display: "grid", placeItems: "center" },
  body: { padding: "26px 28px 32px" },
  sectionTitle: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--sunset-ember)", margin: "26px 0 4px", borderBottom: "1px solid var(--border)", paddingBottom: 8 },
  sectionHint: { fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--slate-blue)", margin: "0 0 14px" },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  label: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 },
  labelText: { fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--slate-cobalt)" },
  input: { fontFamily: "var(--font-sans)", fontSize: 15, padding: "11px 13px", background: "#fff", border: "1px solid var(--cream-sand)", borderRadius: 4, color: "var(--navy-night)", outline: "none", width: "100%" },
  textarea: { fontFamily: "var(--font-sans)", fontSize: 15, padding: "11px 13px", background: "#fff", border: "1px solid var(--cream-sand)", borderRadius: 4, color: "var(--navy-night)", outline: "none", width: "100%", minHeight: 92, resize: "vertical", lineHeight: 1.5 },
  discRow: { display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" },
  discWords: { fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--navy-night)" },
  discSel: { fontFamily: "var(--font-sans)", fontSize: 13, padding: "7px 8px", border: "1px solid var(--cream-sand)", borderRadius: 4, background: "#fff", color: "var(--navy-night)" },
  discHeadRow: { display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--slate-blue)", padding: "0 0 4px" },
  ack: { display: "flex", gap: 10, alignItems: "flex-start", margin: "22px 0 6px", fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--slate-cobalt)", lineHeight: 1.5 },
  actions: { display: "flex", gap: 12, alignItems: "center", marginTop: 22, flexWrap: "wrap" },
  err: { color: "var(--danger)", fontFamily: "var(--font-sans)", fontSize: 13.5, marginTop: 10 },
  successWrap: { padding: "56px 32px", textAlign: "center" },
  successTitle: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 34, letterSpacing: "0.02em", textTransform: "uppercase", color: "var(--navy-night)", margin: "16px 0 10px" },
  successText: { fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 18, color: "var(--slate-cobalt)", lineHeight: 1.55, maxWidth: 440, margin: "0 auto 24px" },
};

function Text({ label, name, type = "text", required, placeholder }) {
  return (
    <label style={st.label}>
      <span style={st.labelText}>{label}{required && " *"}</span>
      <input style={st.input} name={name} type={type} required={required} placeholder={placeholder} />
    </label>
  );
}
function Area({ label, name, required, placeholder, hint }) {
  return (
    <label style={st.label}>
      <span style={st.labelText}>{label}{required && " *"}</span>
      {hint && <span style={{ ...st.sectionHint, margin: "2px 0 2px" }}>{hint}</span>}
      <textarea style={st.textarea} name={name} required={required} placeholder={placeholder} />
    </label>
  );
}
function Select({ label, name, options, required }) {
  return (
    <label style={st.label}>
      <span style={st.labelText}>{label}{required && " *"}</span>
      <select style={st.input} name={name} required={required} defaultValue="">
        <option value="" disabled>Choose…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function ApplicationForm({ open, onClose }) {
  const [status, setStatus] = useState("idle"); // idle | submitting | done | error

  if (!open) return null;

  const encode = (data) =>
    Object.keys(data).map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(data[k])).join("&");

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus("submitting");
    const formEl = e.target;
    const data = {};
    new FormData(formEl).forEach((v, k) => { data[k] = v; });
    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encode(data),
    })
      .then((r) => { if (!r.ok) throw new Error("bad status"); setStatus("done"); })
      .catch(() => setStatus("error"));
  };

  return (
    <div style={st.overlay} onClick={onClose}>
      <div style={st.panel} onClick={(e) => e.stopPropagation()}>
        {status === "done" ? (
          <div style={st.successWrap}>
            <Eyebrow>Application received</Eyebrow>
            <h2 style={st.successTitle}>Thank you.</h2>
            <p style={st.successText}>
              Your application is in. Our Sales Team Lead reviews every submission personally —
              we'll be in touch by email about next steps.
            </p>
            <Button variant="primary" onClick={onClose}>Close <Icon name="check" size={16} /></Button>
          </div>
        ) : (
          <>
            <div style={st.head}>
              <button style={st.close} onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
              <Eyebrow color="var(--sunset-gold)">Sub-Agent Application</Eyebrow>
              <h2 style={st.title}>Tell us who you are</h2>
              <p style={st.headSub}>
                This isn't a quick form — and that's the point. We read every word. Be honest,
                be yourself, and take your time.
              </p>
            </div>

            <form
              name={FORM_NAME}
              method="POST"
              data-netlify="true"
              netlify-honeypot="bot-field"
              onSubmit={handleSubmit}
              style={st.body}
            >
              {/* Netlify plumbing */}
              <input type="hidden" name="form-name" value={FORM_NAME} />
              <input type="hidden" name="subject" value="New sub-agent application submitted" />
              <p hidden>
                <label>Leave blank: <input name="bot-field" /></label>
              </p>

              {/* Demographics */}
              <div style={st.sectionTitle}>The basics</div>
              <div style={st.row2}>
                <Text label="Full name" name="name" required />
                <Text label="Email" name="email" type="email" required />
              </div>
              <div style={st.row2}>
                <Text label="Phone" name="phone" type="tel" />
                <Text label="City & State" name="location" placeholder="Austin, TX" />
              </div>
              <div style={st.row2}>
                <Select label="Age range" name="age_range" options={["Under 21", "21–29", "30–39", "40–49", "50–59", "60+"]} />
                <Text label="How did you hear about us?" name="referral_source" />
              </div>

              {/* Personality */}
              <div style={st.sectionTitle}>A little personality</div>
              <p style={st.sectionHint}>No wrong answers. We're getting to know you.</p>
              <Area label="What's your personal superpower?" name="personality_superpower" />
              <Area label="What kind of work makes you lose track of time?" name="personality_energizes" />
              <Area label="A client is stressed and upset the day before their trip — what do you do?" name="personality_client" />
              <Area label="If you could send anyone, anywhere — who, where, and why?" name="personality_dreamtrip" />

              {/* DISC */}
              <div style={st.sectionTitle}>Quick DISC snapshot</div>
              <p style={st.sectionHint}>For each row, pick the word MOST like you and the one LEAST like you.</p>
              <div style={st.discHeadRow}><span>Words</span><span>Most</span><span>Least</span></div>
              {DISC_ROWS.map((words, i) => {
                const n = i + 1;
                return (
                  <div style={st.discRow} key={n}>
                    <span style={st.discWords}>{words.join(" · ")}</span>
                    <select style={st.discSel} name={`disc${n}_most`} defaultValue="" aria-label={`Row ${n} most`}>
                      <option value="" disabled>Most</option>
                      {words.map((w) => <option key={w} value={w}>{w}</option>)}
                    </select>
                    <select style={st.discSel} name={`disc${n}_least`} defaultValue="" aria-label={`Row ${n} least`}>
                      <option value="" disabled>Least</option>
                      {words.map((w) => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                );
              })}

              {/* Sales & commitment */}
              <div style={st.sectionTitle}>Sales & commitment</div>
              <Area label="Describe your sales, customer service, or persuasion experience." name="sales_experience" />
              <Area label="Tell us about your relationship with travel." name="travel_passion" />
              <div style={st.row2}>
                <Select label="Hours/week you can commit" name="hours_per_week" options={["Under 10", "10–20", "20–30", "30+"]} />
                <Text label="Monthly income you're aiming for" name="income_goal" placeholder="$" />
              </div>

              {/* Story / history */}
              <div style={st.sectionTitle}>Your story</div>
              <Area label="Tell us your life story — the version you'd tell a new friend." name="life_story" />
              <Area label="Walk us through your work history." name="work_history" />
              <Area label="Your education — formal and self-taught." name="education_history" />

              {/* Deep questions */}
              <div style={st.sectionTitle}>Deeper questions</div>
              <Area label="Why do you really want to do this? The honest reason." name="deep_why" />
              <Area label="Tell us about a real failure and what you did next." name="deep_failure" />
              <Area label="Describe a goal you chased with no one holding you accountable." name="deep_accountability" />
              <Area label="When people describe working with you, what do you hope they say?" name="deep_legacy" />

              {/* Acknowledgment */}
              <label style={st.ack}>
                <input type="checkbox" name="acknowledge" value="yes" required style={{ marginTop: 3 }} />
                <span>
                  I understand the Starter phase carries a $49.99/month fee, that residency
                  restrictions may apply, and that the details above are true to the best of my knowledge.
                </span>
              </label>

              {status === "error" && (
                <div style={st.err}>Something went wrong submitting. Please try again, or email hr@capitalfrontiertravel.com.</div>
              )}

              <div style={st.actions}>
                <Button variant="primary" type="submit">
                  {status === "submitting" ? "Submitting…" : "Submit application"} <Icon name="arrowRight" size={16} />
                </Button>
                <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default ApplicationForm;
