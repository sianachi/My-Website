type ThemeToggleProps = {
  onToggle: () => void;
};

export function ThemeToggle({ onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      id="theme-toggle"
      className="theme-toggle"
      aria-label="Toggle light and dark theme"
      title="Toggle light / dark"
      onClick={onToggle}
    >
      <span className="theme-orb" />
      <span className="theme-rays" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <i key={i} />
        ))}
      </span>
    </button>
  );
}
