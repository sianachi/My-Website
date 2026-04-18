export function Orbits() {
  return (
    <div className="orbits" aria-hidden="true">
      <svg viewBox="0 0 1000 1000">
        <defs>
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={1} />
            <stop offset="40%" stopColor="var(--accent)" stopOpacity={0.55} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </radialGradient>
        </defs>
        <g className="orbit-rings">
          <circle cx={500} cy={500} r={140} />
          <circle cx={500} cy={500} r={220} />
          <circle cx={500} cy={500} r={310} />
          <circle cx={500} cy={500} r={410} />
          <circle cx={500} cy={500} r={78} strokeDasharray="2 4" opacity={0.6} />
        </g>
        <circle className="sun-halo" cx={500} cy={500} r={130} fill="url(#sunGlow)" />
        <circle className="sun" cx={500} cy={500} r={22} />
        <g className="p-spin p1">
          <circle className="planet" cx={640} cy={500} r={3} />
        </g>
        <g className="p-spin p2">
          <circle className="planet" cx={720} cy={500} r={4.5} />
        </g>
        <g className="p-spin p3">
          <circle className="planet accent-2" cx={810} cy={500} r={6} />
        </g>
        <g className="p-spin p4">
          <circle className="planet" cx={910} cy={500} r={3.5} />
        </g>
      </svg>
    </div>
  );
}
