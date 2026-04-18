import { useMemo } from "react";

type Star = {
  size: "s" | "big" | "xl";
  left: string;
  top: string;
};

function generateStars(count: number): Star[] {
  // Deterministic PRNG so stars don't jump around between renders.
  let seed = 7;
  const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const r = rand();
    const size: Star["size"] = r > 0.95 ? "xl" : r > 0.8 ? "big" : "s";
    stars.push({
      size,
      left: `${(rand() * 100).toFixed(2)}%`,
      top: `${(rand() * 100).toFixed(2)}%`,
    });
  }
  return stars;
}

export function Stars() {
  const stars = useMemo(() => {
    const count =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 900px)").matches
        ? 60
        : 120;
    return generateStars(count);
  }, []);

  return (
    <div className="stars" id="stars">
      {stars.map((s, i) => (
        <span
          key={i}
          className={s.size === "s" ? "s" : `s ${s.size}`}
          style={{ left: s.left, top: s.top }}
        />
      ))}
    </div>
  );
}
