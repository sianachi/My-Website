import type { NavEntry } from "@/shared/data/schemas";
import { MenuTrigger } from "./MenuTrigger";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Nav is structural — the list of sections doesn't change per deploy
 * and doesn't belong on the content API. Edit here, not in the DB.
 */
export const NAV_ENTRIES: readonly NavEntry[] = [
  { id: "cover", page: "01", label: "Home" },
  { id: "about", page: "02", label: "About" },
  { id: "work", page: "03", label: "Work" },
  { id: "contact", page: "04", label: "Contact" },
];

type NavProps = {
  activeId: string;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onThemeToggle: () => void;
};

export function Nav({
  activeId,
  menuOpen,
  onMenuToggle,
  onThemeToggle,
}: NavProps) {
  const activeEntry =
    NAV_ENTRIES.find((e) => e.id === activeId) ?? NAV_ENTRIES[0];

  return (
    <nav className="nav" aria-label="Portfolio navigation">
      <a className="nav-mark" href="#cover">
        Osinachi · 2026
      </a>
      <div className="nav-list">
        {NAV_ENTRIES.map((entry) => (
          <a
            key={entry.id}
            href={`#${entry.id}`}
            data-page={entry.page}
            className={activeId === entry.id ? "is-active" : undefined}
          >
            {entry.page} {entry.label}
          </a>
        ))}
      </div>
      <div className="nav-right">
        <MenuTrigger isOpen={menuOpen} onToggle={onMenuToggle} />
        <div className="nav-num">
          <span id="nav-cur">{activeEntry.page}</span> /{" "}
          {NAV_ENTRIES[NAV_ENTRIES.length - 1].page}
        </div>
        <ThemeToggle onToggle={onThemeToggle} />
      </div>
    </nav>
  );
}
