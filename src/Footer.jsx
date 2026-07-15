import React from "react";
import { Icon } from "./ui.jsx";

/* Live socials.
   Facebook is provided by the brand. No verified Capital Frontier Travel
   LinkedIn page exists yet, so it is a placeholder ("#") until one is created. */
const FACEBOOK_URL = "https://facebook.com/CapitalFrontierTravel";
const LINKEDIN_URL = "#"; // TODO: replace with live LinkedIn company URL when available
const INSTAGRAM_URL = "#";

const f = {
  wrap: { background: "var(--navy-night)", color: "var(--cream-bone)", padding: "80px 0 36px", marginTop: 0 },
  top: { display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 56, paddingBottom: 56, borderBottom: "1px solid rgba(255,255,255,0.08)" },
  brandBlock: { display: "flex", flexDirection: "column", gap: 18, maxWidth: 360 },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  wordmark: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, letterSpacing: "0.22em", textTransform: "uppercase", whiteSpace: "nowrap" },
  sub: { fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 10, letterSpacing: "0.4em", textTransform: "uppercase", color: "var(--sunset-orange)", marginTop: 3 },
  blurb: { fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 15, color: "#C8D6DB", lineHeight: 1.55 },
  colTitle: { fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--sunset-orange)", marginBottom: 18 },
  link: { display: "block", fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--cream-bone)", padding: "5px 0", textDecoration: "none", border: "none", background: "transparent", cursor: "pointer", textAlign: "left" },
  newsletter: { display: "flex", marginTop: 12, border: "1px solid rgba(255,255,255,0.18)", borderRadius: 4, overflow: "hidden", background: "rgba(255,255,255,0.04)" },
  nlInput: { flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--cream-bone)", padding: "10px 14px", fontFamily: "var(--font-sans)", fontSize: 14 },
  nlBtn: { background: "var(--sunset-orange)", border: "none", color: "var(--cream-bone)", padding: "0 18px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer" },

  // trust + partner band
  trustBand: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 28, flexWrap: "wrap", padding: "28px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  badges: { display: "flex", gap: 14, flexWrap: "wrap" },
  badge: { display: "flex", alignItems: "center", gap: 11, padding: "10px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.03)" },
  badgeMark: { display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 4, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, letterSpacing: "0.02em" },
  badgeLine1: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--cream-bone)", lineHeight: 1.1 },
  badgeLine2: { fontFamily: "var(--font-sans)", fontSize: 10.5, letterSpacing: "0.04em", color: "#8FA1A8", marginTop: 2 },
  partner: { fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 14.5, color: "#C8D6DB", lineHeight: 1.5, maxWidth: 360, textAlign: "right" },

  // residency disclaimer
  clause: { padding: "22px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  clauseText: { fontFamily: "var(--font-sans)", fontSize: 12.5, lineHeight: 1.6, color: "#B9C6CB", margin: 0 },
  clauseStrong: { color: "var(--sunset-gold)", fontWeight: 600 },

  bottom: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 26, flexWrap: "wrap", gap: 18 },
  legal: { fontFamily: "var(--font-mono)", fontSize: 11, color: "#8FA1A8", display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" },
  legalLink: { background: "none", border: "none", color: "#8FA1A8", fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer", padding: 0, borderBottom: "1px solid transparent" },
  social: { display: "flex", gap: 16, color: "var(--cream-bone)", alignItems: "center" },
  socialLink: { color: "inherit", border: "none", display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 999, background: "rgba(255,255,255,0.05)" },
};

function Badge({ mark, markBg, markColor, line1, line2 }) {
  return (
    <div style={f.badge}>
      <span style={{ ...f.badgeMark, background: markBg, color: markColor }}>{mark}</span>
      <span>
        <span style={f.badgeLine1}>{line1}</span>
        <span style={f.badgeLine2}>{line2}</span>
      </span>
    </div>
  );
}

function Footer({ setRoute }) {
  const go = (r) => setRoute && setRoute(r);
  return (
    <footer style={f.wrap}>
      <div className="container">
        {/* ---- columns ---- */}
        <div style={f.top}>
          <div style={f.brandBlock}>
            <div style={f.brand}>
              <img src="/assets/logo-transparent.png" alt="Capital Frontier Travel" style={{ height: 52 }} />
              <div>
                <div style={f.wordmark}>Capital Frontier</div>
                <div style={f.sub}>— Travel —</div>
              </div>
            </div>
            <p style={f.blurb}>
              Guided trips to mountain ranges, national parks, and far-flung frontier landscapes since 2014. Small groups, good gear, no rush.
            </p>
            <div style={{ marginTop: 8 }}>
              <div style={{ ...f.colTitle, marginBottom: 10 }}>Field Notes — weekly</div>
              <form style={f.newsletter} onSubmit={(e) => e.preventDefault()}>
                <input style={f.nlInput} placeholder="you@example.com" />
                <button style={f.nlBtn}>Send →</button>
              </form>
            </div>
          </div>

          <div>
            <div style={f.colTitle}>← Routes →</div>
            <button style={f.link} onClick={() => go("home")}>All trips</button>
            <button style={f.link} onClick={() => go("home")}>Wyoming</button>
            <button style={f.link} onClick={() => go("home")}>Patagonia</button>
            <button style={f.link} onClick={() => go("home")}>Iceland</button>
            <button style={f.link} onClick={() => go("home")}>Custom routes</button>
          </div>

          <div>
            <div style={f.colTitle}>← Outfitter →</div>
            <button style={f.link} onClick={() => go("about")}>About us</button>
            <button style={f.link} onClick={() => go("journal")}>Field notes</button>
            <button style={f.link} onClick={() => go("agents")}>Become a sub-agent</button>
            <button style={f.link} onClick={() => go("contact")}>Contact</button>
          </div>

          <div>
            <div style={f.colTitle}>← Support →</div>
            <button style={f.link} onClick={() => go("contact")}>Pre-trip call</button>
            <button style={f.link} onClick={() => go("refund")}>Refund policy</button>
            <button style={f.link} onClick={() => go("refund")}>Booking terms</button>
            <button style={f.link} onClick={() => go("privacy")}>Privacy policy</button>
          </div>
        </div>

        {/* ---- trust badges + Gateway partner mention ---- */}
        <div style={f.trustBand}>
          <div style={f.badges}>
            <Badge
              mark="D&B"
              markBg="linear-gradient(150deg, var(--slate-cobalt), var(--navy-ridge))"
              markColor="var(--cream-bone)"
              line1="D-U-N-S® Registered"
              line2="Verified business identity"
            />
            <Badge
              mark="BBB"
              markBg="linear-gradient(150deg, var(--teal-pine), var(--teal-deep))"
              markColor="var(--navy-night)"
              line1="BBB® Accredited Business"
              line2="Better Business Bureau"
            />
          </div>
          <p style={f.partner}>
            Capital Frontier Travel is a proud partner of Gateway Travel, booking through the Gateway Travel host-agency network.
          </p>
        </div>

        {/* ---- residency disclaimer ---- */}
        <div style={f.clause}>
          <p style={f.clauseText}>
            <span style={f.clauseStrong}>Service area notice:</span> Due to state licensing and seller-of-travel
            requirements, Capital Frontier Travel is unable to serve or sell travel to residents of{" "}
            <strong>Florida</strong>, <strong>Washington State</strong>, or <strong>California</strong> at this time.
          </p>
        </div>

        {/* ---- bottom bar ---- */}
        <div style={f.bottom}>
          <div style={f.legal}>
            <span>© 2026 Capital Frontier Travel</span>
            <span>·</span>
            <button style={f.legalLink} onClick={() => go("privacy")}>Privacy</button>
            <span>·</span>
            <button style={f.legalLink} onClick={() => go("agents")}>Sub-agents</button>
            <span>·</span>
            <button style={f.legalLink} onClick={() => go("refund")}>Terms</button>
          </div>
          <div style={f.social}>
            <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={f.socialLink}>
              <Icon name="facebook" size={17} />
            </a>
            <a href={LINKEDIN_URL} aria-label="LinkedIn" style={f.socialLink}>
              <Icon name="linkedin" size={17} />
            </a>
            <a href={INSTAGRAM_URL} aria-label="Instagram" style={f.socialLink}>
              <Icon name="instagram" size={17} />
            </a>
            <button aria-label="Contact" style={{ ...f.socialLink, cursor: "pointer" }} onClick={() => go("contact")}>
              <Icon name="mail" size={17} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
