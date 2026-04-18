import { NAV_ENTRIES } from "@/data/nav";
import { MenuTrigger } from "./MenuTrigger";
import { ThemeToggle } from "./ThemeToggle";

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
