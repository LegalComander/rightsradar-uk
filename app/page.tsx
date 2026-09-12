const regions = [
  {
    title: "Scotland",
    text: "Police, courts, housing, benefits, family law and everyday rights with Scotland-specific official sources.",
    href: "#scotland",
  },
  {
    title: "England & Wales",
    text: "Plain-English legal information covering the shared England and Wales legal system.",
    href: "#england-wales",
  },
  {
    title: "Northern Ireland",
    text: "Dedicated guidance for Northern Ireland, separated from the other UK legal systems.",
    href: "#northern-ireland",
  },
];

const topics = [
  "Police & arrest",
  "Housing & homelessness",
  "Benefits & appeals",
  "Family & children",
  "Work & employment",
  "Courts & legal process",
];

export default function Home() {
  return (
    <main>
      <header className="siteHeader">
        <a className="brand" href="#top" aria-label="RightsRadar UK home">
          <span className="radarMark">R</span>
          <span>RightsRadar <strong>UK</strong></span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#regions">Your area</a>
          <a href="#topics">Rights guides</a>
          <a href="#updates">Law updates</a>
          <a className="navButton" href="#alerts">Get alerts</a>
        </nav>
      </header>

      <section id="top" className="hero">
        <div className="heroCopy">
          <div className="eyebrow">Know your rights. Follow the law.</div>
          <h1>UK legal rights, explained in plain English.</h1>
          <p>
            RightsRadar helps you understand everyday legal rights and find the official source behind the answer — without legal jargon.
          </p>
          <div className="heroActions">
            <a className="primaryButton" href="#regions">Choose your UK legal system</a>
            <a className="secondaryButton" href="#topics">Browse rights guides</a>
          </div>
          <p className="disclaimer">Legal information, not individual legal advice.</p>
        </div>
        <div className="radarPanel" aria-hidden="true">
          <div className="radar radar1" />
          <div className="radar radar2" />
          <div className="radar radar3" />
          <div className="sweep" />
          <div className="radarDot dot1" />
          <div className="radarDot dot2" />
          <div className="radarDot dot3" />
        </div>
      </section>

      <section id="regions" className="section">
        <div className="sectionIntro">
          <span className="kicker">Start here</span>
          <h2>The law depends on where you are in the UK.</h2>
          <p>Choose the correct legal system before reading a guide.</p>
        </div>
        <div className="cardGrid">
          {regions.map((region, index) => (
            <article className="regionCard" id={region.href.slice(1)} key={region.title}>
              <span className="cardNumber">0{index + 1}</span>
              <h3>{region.title}</h3>
              <p>{region.text}</p>
              <a href="#topics">View guides <span aria-hidden="true">→</span></a>
            </article>
          ))}
        </div>
      </section>

      <section id="topics" className="section darkSection">
        <div className="sectionIntro">
          <span className="kicker">Rights guides</span>
          <h2>Find the issue you need help understanding.</h2>
        </div>
        <div className="topicGrid">
          {topics.map((topic) => (
            <a href="#sources" className="topic" key={topic}>{topic}<span>↗</span></a>
          ))}
        </div>
      </section>

      <section id="updates" className="section splitSection">
        <div>
          <span className="kicker">Law-change radar</span>
          <h2>See what changed — and what it could mean.</h2>
          <p>
            RightsRadar is being built to track new and amended legislation and turn official updates into clear summaries linked back to the source.
          </p>
        </div>
        <div className="statusBox">
          <span className="liveDot" />
          <div>
            <strong>Official-source tracking</strong>
            <p>Planned feeds: legislation.gov.uk, UK Parliament and jurisdiction-specific public bodies.</p>
          </div>
        </div>
      </section>

      <section id="sources" className="section sourceSection">
        <div className="sectionIntro">
          <span className="kicker">Source-first</span>
          <h2>Every important answer should lead back to evidence.</h2>
          <p>
            Our goal is to prioritise legislation, courts, government departments and other authoritative public sources — with clear dates and jurisdiction labels.
          </p>
        </div>
      </section>

      <section id="alerts" className="ctaSection">
        <div>
          <span className="kicker">Coming next</span>
          <h2>Personal law-change alerts.</h2>
          <p>Create an account, follow topics that matter to you, and get notified when relevant UK law changes.</p>
        </div>
        <button type="button" disabled>Alerts launching soon</button>
      </section>

      <footer>
        <div className="brand footerBrand"><span className="radarMark">R</span><span>RightsRadar <strong>UK</strong></span></div>
        <p>Independent legal-information project. Not a law firm and not a substitute for advice from a qualified professional.</p>
        <p>© {new Date().getFullYear()} RightsRadar UK</p>
      </footer>
    </main>
  );
}
