import React from "react";
import { Eyebrow, Button, DiamondRule, Icon, Field } from "./ui.jsx";
import Header from "./Header.jsx";
import Hero from "./Hero.jsx";
import TripGrid, { TRIPS } from "./TripGrid.jsx";
import TripDetail from "./TripDetail.jsx";
import JournalList from "./JournalList.jsx";
import BookingSheet from "./BookingSheet.jsx";
import RefundPolicy from "./RefundPolicy.jsx";
import ContactScreen from "./ContactScreen.jsx";
import Footer from "./Footer.jsx";
import PrivacyPolicy from "./PrivacyPolicy.jsx";
import BecomeAgent from "./BecomeAgent.jsx";

const { useState } = React;

function HomeScreen({ onTripClick, onBook }) {
  return (
    <>
      <Hero onBook={onBook} />
      <PromiseStrip />
      <TripGrid onTripClick={onTripClick} />
      <NightCTA onBook={onBook} />
      <JournalList />
    </>
  );
}

function PromiseStrip() {
  const items = [
    { icon: "users",    title: "Eight at a table",     desc: "We cap every trip small. You'll know everyone's name by dinner one." },
    { icon: "compass",  title: "Field-tested guides",  desc: "WFR-certified, average twelve seasons in the field. Maps are their idiom." },
    { icon: "tent",     title: "All gear in",          desc: "Tents, sleeping systems, sat comms, transport. You bring a duffel." },
    { icon: "mountain", title: "Carbon-offset",        desc: "Every trip, every flight. We measure it, we file it, we share the receipts." },
  ];
  return (
    <section style={{ background: "var(--cream-bone)", padding: "96px 0 80px", borderBottom: "1px solid var(--border)" }}>
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <Eyebrow>What we promise</Eyebrow>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(40px, 5vw, 64px)", lineHeight: 1, letterSpacing: "0.01em", textTransform: "uppercase", color: "var(--navy-night)", margin: "10px 0 0" }}>
            The same four things,<br/>every trip.
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32 }}>
          {items.map(it => (
            <div key={it.title} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ color: "var(--sunset-orange)" }}><Icon name={it.icon} size={32} stroke={1.5}/></span>
              <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, letterSpacing: "0.02em", textTransform: "uppercase", color: "var(--navy-night)", margin: 0 }}>{it.title}</h4>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg2)", lineHeight: 1.55, margin: 0, textWrap: "pretty" }}>{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NightCTA({ onBook }) {
  return (
    <section style={{ background: "var(--navy-ridge)", color: "var(--cream-bone)", padding: "120px 0", position: "relative", overflow: "hidden" }}>
      <div style={{
        position: "absolute", width: 480, aspectRatio: 1, borderRadius: "50%",
        background: "radial-gradient(circle at 50% 35%, rgba(249,187,94,0.6) 0%, rgba(232,120,70,0.45) 60%, rgba(232,120,70,0) 80%)",
        right: -120, top: -120, filter: "blur(4px)",
      }} />
      <div className="container" style={{ position: "relative", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 60, alignItems: "center" }}>
        <div>
          <Eyebrow color="var(--sunset-gold)">A pre-trip call, on us</Eyebrow>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(48px, 7vw, 88px)", lineHeight: 0.92, letterSpacing: "0.01em", textTransform: "uppercase", color: "var(--cream-bone)", margin: "16px 0 24px" }}>
            Not sure<br/>where to go?
          </h2>
          <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 21, color: "#C8D6DB", lineHeight: 1.5, maxWidth: 520, marginBottom: 32 }}>
            Book a thirty-minute call with one of our lead guides. We'll talk through what kind of trip would actually suit you — even if it isn't ours.
          </p>
          <Button variant="primary" onClick={onBook}>Book a call <Icon name="arrowRight" size={16}/></Button>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 32 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.18em", color: "var(--sunset-gold)", textTransform: "uppercase", marginBottom: 14 }}>From a recent caller</div>
          <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 22, color: "var(--cream-bone)", lineHeight: 1.45, margin: 0, textWrap: "pretty" }}>
            "They talked me out of the trip I'd come to book and into a better one. That's how I knew."
          </p>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#C8D6DB", marginTop: 18 }}>— Anna, Brooklyn · CFT-PAT-09</div>
        </div>
      </div>
    </section>
  );
}

function AboutScreen() {
  return (
    <section style={{ background: "var(--cream-bone)", padding: "120px 0" }}>
      <div className="container container--narrow" style={{ textAlign: "center" }}>
        <Eyebrow>About</Eyebrow>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(56px, 8vw, 100px)", lineHeight: 0.92, letterSpacing: "0.01em", textTransform: "uppercase", color: "var(--navy-night)", margin: "14px 0 28px" }}>
          Twelve guides,<br/>fourteen routes,<br/>no rush.
        </h1>
        <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 22, color: "var(--slate-cobalt)", lineHeight: 1.55, maxWidth: 600, margin: "0 auto", textWrap: "pretty" }}>
          We started Capital Frontier Travel in 2014 because the trips we wanted to take didn't exist
          on the shelf. They still mostly don't. So we build them — one slow road at a time.
        </p>
        <div style={{ margin: "60px auto", maxWidth: 560 }}>
          <DiamondRule />
        </div>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 17, color: "var(--navy-night)", lineHeight: 1.7, textWrap: "pretty", maxWidth: 620, margin: "0 auto" }}>
          We're based in Jackson, Wyoming. We run small groups, hire local in every country we work in, and have
          a strict no-helicopter, no-resort-bookend policy on every itinerary. If you're looking for a five-star
          spa weekend in nature, we are emphatically not for you. If you're looking for the trip you'll
          still be talking about in a decade, that's what we do.
        </p>
      </div>
    </section>
  );
}

function App() {
  const [route, setRoute] = useState("home");
  const [selected, setSelected] = useState(TRIPS[0]);
  const [bookOpen, setBookOpen] = useState(false);

  const openTrip = (t) => { setSelected(t); setRoute("trip"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openBook = () => setBookOpen(true);

  // Header is dark on home (because hero is dark), trip (hero is dark), and refund (hero is dark); paper elsewhere
  const headerMode = (route === "home" || route === "trip" || route === "refund" || route === "agents") ? "night" : "paper";

  return (
    <>
      <Header route={route} setRoute={(r) => { setRoute(r); window.scrollTo({ top: 0, behavior: "smooth" }); }} mode={headerMode}/>
      {route === "home" && <HomeScreen onTripClick={openTrip} onBook={openBook}/>}
      {route === "trip" && <TripDetail trip={selected} onBook={openBook} />}
      {route === "journal" && <JournalList />}
      {route === "about" && <AboutScreen />}
      {route === "refund" && <RefundPolicy setRoute={setRoute} />}
      {route === "contact" && <ContactScreen setRoute={setRoute} />}
      {route === "privacy" && <PrivacyPolicy setRoute={setRoute} />}
      {route === "agents" && <BecomeAgent setRoute={setRoute} />}
      {route === "book" && (
        <section style={{ background: "var(--cream-bone)", padding: "120px 0", minHeight: 480 }}>
          <div className="container container--narrow" style={{ textAlign: "center" }}>
            <Eyebrow>Booking</Eyebrow>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(48px, 7vw, 88px)", lineHeight: 0.92, letterSpacing: "0.01em", textTransform: "uppercase", color: "var(--navy-night)", margin: "12px 0 24px" }}>
              Pick a trip to begin.
            </h1>
            <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 20, color: "var(--slate-cobalt)", marginBottom: 32, lineHeight: 1.55 }}>
              Choose a route from the lineup, then we'll hold a spot for seven days while you decide.
            </p>
            <Button variant="primary" onClick={() => setRoute("home")}>See the lineup <Icon name="arrowRight" size={16}/></Button>
          </div>
        </section>
      )}
      <Footer setRoute={setRoute} />
      <BookingSheet open={bookOpen} onClose={() => setBookOpen(false)} trip={selected} />
    </>
  );
}

export default App;
