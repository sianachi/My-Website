import { ThemeToggle } from "@/components/ThemeToggle";
import { Stars } from "@/components/Stars";
import { useAdminAuth } from "@/lib/adminAuth";
import { usePalette } from "@/hooks/usePalette";
import { useState } from "react";

const ANALYTICS_URL =
  (import.meta.env.VITE_ANALYTICS_URL as string | undefined) ??
  "https://vercel.com/dashboard";

type Tile = {
  glyph: string;
  title: string;
  tagline: string;
  to?: string;
  href?: string;
};

const TILES: Tile[] = [
  {
    glyph: "◐",
    title: "Content",
    tagline: "The cargo manifest.",
    to: "/core/content",
  },
  {
    glyph: "◇",
    title: "Preview",
    tagline: "Look out the porthole.",
    to: "/core/preview",
  },
  {
    glyph: "✦",
    title: "CV",
    tagline: "Eject a new doc.",
    to: "/core/cv",
  },
  {
    glyph: "⌖",
    title: "Analytics",
    tagline: "Telemetry from the ground ↗",
    href: ANALYTICS_URL,
  },
  {
    glyph: "⌬",
    title: "Crew",
    tagline: "Passkeys & exit.",
    to: "/core/account",
  },
];

type Props = {
  credentialCount: number;
  navigate: (to: string) => void;
};

export function Launchpad({ credentialCount, navigate }: Props) {
  const { toggle: toggleTheme } = usePalette();
  const { logout } = useAdminAuth();
  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="launchpad">
      <div className="launchpad__sky" aria-hidden="true">
        <Stars />
      </div>

      <header className="launchpad__head">
        <div className="launchpad__chrome">
          <ThemeToggle onToggle={toggleTheme} />
          <button
            type="button"
            className="core-btn core-btn--ghost core-btn--xs"
            onClick={onSignOut}
            disabled={signingOut}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
        <p className="label label-accent launchpad__label">§ Mission control</p>
        <h1 className="launchpad__title">
          All systems <em>nominal</em>.
        </h1>
        <p className="launchpad__sub">
          {credentialCount} passkey{credentialCount === 1 ? "" : "s"} aboard.
          Pick a module.
        </p>
      </header>

      <ul
        className="launchpad__grid"
        role="list"
        style={tileGridVars(TILES.length)}
      >
        {TILES.map((tile) => (
          <li key={tile.title} className="launchpad__cell">
            <TileButton tile={tile} navigate={navigate} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function tileColumns(count: number): number {
  if (count < 3) return Math.max(1, count);
  return Math.floor(count / 3) * 3;
}

function tileGridVars(count: number): React.CSSProperties {
  const cols = tileColumns(count);
  return {
    "--cols-xl": cols,
    "--cols-lg": Math.min(cols, 6),
    "--cols-md": Math.min(cols, 3),
    "--cols-sm": Math.min(cols, 2),
  } as React.CSSProperties;
}

function TileButton({
  tile,
  navigate,
}: {
  tile: Tile;
  navigate: (to: string) => void;
}) {
  const body = (
    <>
      <span className="launchpad-tile__glyph" aria-hidden="true">
        {tile.glyph}
      </span>
      <span className="launchpad-tile__title">{tile.title}</span>
      <span className="launchpad-tile__tagline">{tile.tagline}</span>
    </>
  );

  if (tile.href) {
    return (
      <a
        href={tile.href}
        target="_blank"
        rel="noreferrer"
        className="launchpad-tile"
      >
        {body}
      </a>
    );
  }
  return (
    <button
      type="button"
      className="launchpad-tile"
      onClick={() => tile.to && navigate(tile.to)}
    >
      {body}
    </button>
  );
}
