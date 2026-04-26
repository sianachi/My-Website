import { NAV_ENTRIES } from "./Nav";

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target;
    if (target instanceof Element && target.closest("a")) {
      onClose();
    }
  };

  return (
    <div
      id="mobile-menu"
      className="mobile-menu"
      aria-hidden={!isOpen}
      onClick={handleClick}
    >
      <nav className="mm-inner" aria-label="Mobile navigation">
        <div className="label label-accent mb-[clamp(18px,3vw,28px)]">
          § Navigation · Portfolio 2026
        </div>
        <ul className="mm-list">
          {NAV_ENTRIES.map((entry) => (
            <li key={entry.id}>
              <a href={`#${entry.id}`}>
                <span className="mm-no">{entry.page}</span>
                <span className="mm-name">{entry.label}</span>
              </a>
            </li>
          ))}
          <li>
            <a href="/blog">
              <span className="mm-no">05</span>
              <span className="mm-name">Blog</span>
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
}
