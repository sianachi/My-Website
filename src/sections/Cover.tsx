import { Orbits } from "@/components/Orbits";
import { Stars } from "@/components/Stars";

export function Cover() {
  return (
    <section
      id="cover"
      className="page cover page--plain"
      data-label="01 Home"
    >
      <Stars />
      <Orbits />

      <div className="page-head">
        <div>Portfolio — 2026</div>
        <div>·</div>
        <div>Birmingham, UK</div>
      </div>

      <div className="page-body cover-body">
        <div className="cover-eyebrow label-accent" style={{ fontSize: 13 }}>
          <span className="chev">‹</span>
          <span>Software Engineer</span>
          <span className="dot" />
          <span>C# / .NET</span>
          <span className="dot" />
          <span>Azure &amp; AWS</span>
          <span className="dot" />
          <span>Edge / Jetson</span>
        </div>

        <h1>
          <span className="given">
            <em>Osi</em>nachi
          </span>
          <span className="family">Nwagboso</span>
        </h1>

        <div className="cover-meta">
          <p className="lede">
            I build <em>performance-sensitive</em> backends — encrypted
            pipelines, memory-constrained services, things that run quietly and
            don&apos;t fall over.
          </p>
          <div className="stack">
            <div>
              <span className="tab">C#</span>
              <span>.NET 10</span>
            </div>
            <div>
              <span className="tab">☁</span>
              <span>Azure · AWS</span>
            </div>
            <div>
              <span className="tab">⌘</span>
              <span>Jetson Orin</span>
            </div>
            <div>
              <span className="tab">§4</span>
              <span>yrs @ Redspeed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="page-foot">
        <div>↓ &nbsp; About</div>
        <div />
        <div>01 / 04</div>
      </div>
    </section>
  );
}
