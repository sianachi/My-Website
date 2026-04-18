type MenuTriggerProps = {
  isOpen: boolean;
  onToggle: () => void;
};

export function MenuTrigger({ isOpen, onToggle }: MenuTriggerProps) {
  return (
    <button
      type="button"
      id="menu-trigger"
      className="menu-trigger"
      aria-label="Open navigation menu"
      aria-expanded={isOpen}
      aria-controls="mobile-menu"
      onClick={onToggle}
    >
      <svg className="mt-icon" viewBox="0 0 20 20" aria-hidden="true">
        <line className="mt-line mt-line--a" x1={5} y1={5} x2={15} y2={15} />
        <line className="mt-line mt-line--b" x1={15} y1={5} x2={5} y2={15} />
        <circle className="mt-dot mt-dot--tl" cx={6.5} cy={7.5} r={1.4} />
        <circle className="mt-dot mt-dot--tr" cx={14} cy={5.5} r={1.8} />
        <circle className="mt-dot mt-dot--bl" cx={5.5} cy={14} r={1.3} />
        <circle className="mt-dot mt-dot--br" cx={14.5} cy={14.5} r={1.5} />
      </svg>
    </button>
  );
}
