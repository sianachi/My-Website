type Star = {
  cx: number;
  cy: number;
  r: number;
  variant?: "big" | "accent";
};

type PageDividerProps = {
  points: string;
  stars: Star[];
};

export function PageDivider({ points, stars }: PageDividerProps) {
  return (
    <div className="page-divider" aria-hidden="true">
      <svg viewBox="0 0 1000 60" preserveAspectRatio="none">
        <polyline className="pd-trail" points={points} />
        {stars.map((s, i) => {
          const cls =
            s.variant === "big"
              ? "pd-star pd-star--big"
              : s.variant === "accent"
                ? "pd-star pd-star--accent"
                : "pd-star";
          return <circle key={i} className={cls} cx={s.cx} cy={s.cy} r={s.r} />;
        })}
      </svg>
    </div>
  );
}

export const DIVIDERS: Record<"cover" | "about" | "work", PageDividerProps> = {
  cover: {
    points: "60,34 180,22 320,40 460,14 560,30 700,20 840,38 940,26",
    stars: [
      { cx: 60, cy: 34, r: 1.8 },
      { cx: 180, cy: 22, r: 3, variant: "big" },
      { cx: 320, cy: 40, r: 1.5 },
      { cx: 460, cy: 14, r: 4, variant: "accent" },
      { cx: 560, cy: 30, r: 2 },
      { cx: 700, cy: 20, r: 2.8, variant: "big" },
      { cx: 840, cy: 38, r: 1.8 },
      { cx: 940, cy: 26, r: 1.5 },
    ],
  },
  about: {
    points: "80,28 220,40 360,16 500,34 640,20 780,38 920,24",
    stars: [
      { cx: 80, cy: 28, r: 2.6, variant: "big" },
      { cx: 220, cy: 40, r: 1.5 },
      { cx: 360, cy: 16, r: 4, variant: "accent" },
      { cx: 500, cy: 34, r: 2 },
      { cx: 640, cy: 20, r: 3, variant: "big" },
      { cx: 780, cy: 38, r: 1.8 },
      { cx: 920, cy: 24, r: 1.5 },
    ],
  },
  work: {
    points: "40,30 200,18 340,36 460,22 600,40 740,18 860,34 960,22",
    stars: [
      { cx: 40, cy: 30, r: 1.8 },
      { cx: 200, cy: 18, r: 2.8, variant: "big" },
      { cx: 340, cy: 36, r: 1.5 },
      { cx: 460, cy: 22, r: 2 },
      { cx: 600, cy: 40, r: 4, variant: "accent" },
      { cx: 740, cy: 18, r: 2.6, variant: "big" },
      { cx: 860, cy: 34, r: 1.8 },
      { cx: 960, cy: 22, r: 1.5 },
    ],
  },
};
