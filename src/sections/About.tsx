type Pillar = {
  no: string;
  heading: string;
  body: React.ReactNode;
};

const PILLARS: Pillar[] = [
  {
    no: "No. 01",
    heading: "Measure, then cut",
    body: (
      <>
        Eliminated a memory leak in a .NET image pipeline by replacing per-frame
        allocations with pooled <em>IMemoryOwner</em> buffers — verified with
        dotMemory, not vibes.
      </>
    ),
  },
  {
    no: "No. 02",
    heading: "Contracts before code",
    body: (
      <>
        ASP.NET Core Minimal APIs using the REPR pattern. xUnit, Moq,
        TestContainers, FluentAssertions — team-wide standards, rigorous peer
        review.
      </>
    ),
  },
  {
    no: "No. 03",
    heading: "Legible from a distance",
    body: (
      <>
        Mentoring juniors on design patterns, testing strategies, and the
        difference between a service that&apos;s fast and one that&apos;s
        merely quick.
      </>
    ),
  },
];

type StackEntry = {
  label: string;
  value: React.ReactNode;
};

const STACK: StackEntry[] = [
  {
    label: "§ 02.2 — Languages",
    value: (
      <>
        C# · TypeScript · Python · Go{" "}
        <span className="faint">(learning)</span>
      </>
    ),
  },
  {
    label: "§ 02.3 — Platforms",
    value: (
      <>
        Azure · AWS · Docker · Kubernetes{" "}
        <span className="faint">(basics)</span>
      </>
    ),
  },
  {
    label: "§ 02.4 — Practices",
    value: <>REPR · Vertical slice · TDD · Observability-first</>,
  },
  {
    label: "§ 02.5 — Adjacent",
    value: <>React · FastAPI · Terraform · Ansible · Playwright</>,
  },
];

export function About() {
  return (
    <section
      id="about"
      className="page bio page--plain"
      data-label="02 About"
    >
      <div className="page-head">
        <div>02 — About</div>
        <div>·</div>
        <div>The work &amp; the posture</div>
      </div>

      <div className="page-body two-col">
        <div>
          <div
            className="label label-accent"
            style={{ marginBottom: 20 }}
          >
            § 02.1 — Premise
          </div>
          <h2>
            Legible systems <em>beat</em> clever ones.
          </h2>
        </div>
        <div className="bio-body">
          <p className="bio-lede" style={{ marginBottom: 28 }}>
            Backend engineer with 4+ years of production C# and .NET —{" "}
            <em>performance-sensitive</em>, encrypted, memory-constrained.
          </p>
          <p>
            I ship ASP.NET Core microservices, Azure Functions, and
            containerised workers that handle tens of thousands of jobs a day
            without manual intervention. Earlier work on NVIDIA Jetson edge
            software taught me to respect memory budgets and latency ceilings.
          </p>
          <p>
            Comfortable extending into cloud infrastructure (Azure, AWS),
            DevOps, and frontend when the problem requires it — TypeScript,
            React, Node, FastAPI, Terraform, Ansible.
          </p>
          <p>Based in Birmingham, UK.</p>
        </div>
      </div>

      <div className="pillars">
        {PILLARS.map((p) => (
          <div key={p.no} className="pillar">
            <div className="no">{p.no}</div>
            <h4>{p.heading}</h4>
            <p>{p.body}</p>
          </div>
        ))}
      </div>

      <div className="stack-grid">
        {STACK.map((s) => (
          <div key={s.label}>
            <div className="label label-accent">{s.label}</div>
            <p className="stack-line">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="page-foot" style={{ marginTop: 48 }}>
        <div>↓ &nbsp; Selected work</div>
        <div />
        <div>02 / 04</div>
      </div>
    </section>
  );
}
