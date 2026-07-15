import React from "react";
import { Eyebrow, DiamondRule, Button, Icon } from "./ui.jsx";

const s = {
  hero: { background: "var(--cream-canvas)", padding: "88px 0 40px", borderBottom: "1px solid var(--border)" },
  title: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(44px, 6vw, 76px)", lineHeight: 0.95, letterSpacing: "0.01em", textTransform: "uppercase", color: "var(--navy-night)", margin: "12px 0 14px" },
  meta: { fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--slate-cobalt)", letterSpacing: "0.02em" },
  body: { background: "var(--cream-bone)", padding: "56px 0 96px" },
  lead: { fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 19, lineHeight: 1.6, color: "var(--slate-cobalt)", marginBottom: 8 },
  h2: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--navy-night)", margin: "40px 0 12px" },
  p: { fontFamily: "var(--font-sans)", fontSize: 15.5, lineHeight: 1.7, color: "var(--fg1)", margin: "0 0 14px" },
  li: { fontFamily: "var(--font-sans)", fontSize: 15.5, lineHeight: 1.65, color: "var(--fg1)", margin: "0 0 8px" },
  note: { background: "var(--surface-warm)", border: "1px solid var(--border)", borderRadius: 8, padding: "18px 20px", margin: "18px 0", fontFamily: "var(--font-sans)", fontSize: 14.5, lineHeight: 1.6, color: "var(--slate-cobalt)" },
};

function Section({ title, children }) {
  return (
    <>
      <h2 style={s.h2}>{title}</h2>
      {children}
    </>
  );
}

function PrivacyPolicy({ setRoute }) {
  return (
    <>
      <section style={s.hero}>
        <div className="container container--narrow">
          <Eyebrow>Legal</Eyebrow>
          <h1 style={s.title}>Privacy Policy</h1>
          <div style={s.meta}>Effective January 1, 2026 · Last updated January 1, 2026</div>
        </div>
      </section>

      <section style={s.body}>
        <div className="container container--narrow">
          <p style={s.lead}>
            Capital Frontier Travel respects your privacy. This policy explains what we collect,
            why we collect it, and the choices you have.
          </p>
          <div style={{ margin: "26px 0" }}><DiamondRule /></div>

          <Section title="Who we are">
            <p style={s.p}>
              Capital Frontier Travel ("Capital Frontier Travel," "we," "us," or "our") is an independent
              travel agency operating as a partner within the Gateway Travel host-agency network. This
              policy applies to our website, booking process, and related communications.
            </p>
          </Section>

          <Section title="Information we collect">
            <p style={s.p}>We collect information you provide directly and information gathered automatically as you use the site:</p>
            <ul>
              <li style={s.li}><strong>Contact and booking details</strong> — name, email, phone number, mailing address, travel dates, traveler preferences, and similar information you submit through forms or during trip planning.</li>
              <li style={s.li}><strong>Transaction information</strong> — booking history and payment status. Card and bank details are handled by our third-party payment processors and travel suppliers; we do not store full payment card numbers.</li>
              <li style={s.li}><strong>Usage and device data</strong> — IP address, browser type, pages viewed, referring links, and similar analytics collected through cookies and comparable technologies.</li>
            </ul>
          </Section>

          <Section title="How we use your information">
            <ul>
              <li style={s.li}>To plan, quote, book, and service your travel arrangements.</li>
              <li style={s.li}>To communicate with you about itineraries, confirmations, and support requests.</li>
              <li style={s.li}>To send updates or marketing (such as our Field Notes newsletter) where you have opted in; you can unsubscribe at any time.</li>
              <li style={s.li}>To operate, secure, and improve our website and services.</li>
              <li style={s.li}>To comply with legal, tax, and regulatory obligations.</li>
            </ul>
          </Section>

          <Section title="How we share information">
            <p style={s.p}>We share information only as needed to deliver your travel and run our business:</p>
            <ul>
              <li style={s.li}><strong>Gateway Travel</strong> — as our host agency, Gateway Travel may process booking and traveler information to facilitate reservations, commissions, and supplier relationships.</li>
              <li style={s.li}><strong>Travel suppliers</strong> — airlines, hotels, tour operators, cruise lines, and other providers required to fulfill your booking.</li>
              <li style={s.li}><strong>Service providers</strong> — payment processors, form and CRM tools, email platforms, and analytics providers acting on our behalf.</li>
              <li style={s.li}><strong>Legal and safety</strong> — when required by law, or to protect our rights, customers, or the public.</li>
            </ul>
            <p style={s.p}>We do not sell your personal information.</p>
          </Section>

          <Section title="Cookies and analytics">
            <p style={s.p}>
              We use cookies and similar technologies to keep the site working, remember preferences, and
              understand how visitors use our pages. Some pages may contain affiliate or partner links; when
              you click them, the partner may set its own cookies subject to its own privacy policy. You can
              control cookies through your browser settings.
            </p>
          </Section>

          <Section title="Data retention">
            <p style={s.p}>
              We keep personal information only as long as needed for the purposes described here, including
              servicing your travel, meeting legal and accounting requirements, and resolving disputes.
            </p>
          </Section>

          <Section title="Your choices and rights">
            <p style={s.p}>
              You may request access to, correction of, or deletion of your personal information, and you may
              opt out of marketing messages at any time. To make a request, contact us using the details below.
              Depending on where you live, additional rights may apply.
            </p>
          </Section>

          <Section title="Children's privacy">
            <p style={s.p}>
              Our services are intended for adults. We do not knowingly collect personal information from
              children under 13. If you believe a child has provided us information, please contact us and we
              will delete it.
            </p>
          </Section>

          <Section title="Security">
            <p style={s.p}>
              We use reasonable administrative, technical, and physical safeguards to protect your information.
              No method of transmission or storage is completely secure, so we cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p style={s.p}>
              We may update this policy from time to time. When we do, we will revise the "Last updated" date
              above. Material changes may be communicated through the website or by email.
            </p>
          </Section>

          <Section title="Contact us">
            <p style={s.p}>
              Questions about this policy or your information? Reach out and we'll be glad to help.
            </p>
          </Section>

          <div style={s.note}>
            This Privacy Policy is provided as a general template and is not legal advice. Please have it
            reviewed by qualified counsel and confirm it reflects your actual data practices and the
            requirements of Gateway Travel and your suppliers before relying on it.
          </div>

          <div style={{ marginTop: 28 }}>
            <Button variant="secondary" onClick={() => setRoute && setRoute("contact")}>
              Contact us <Icon name="arrowRight" size={16} />
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

export default PrivacyPolicy;
