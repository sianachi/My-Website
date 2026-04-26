import { ThemeToggle } from "@/components/ThemeToggle";
import { usePalette } from "@/hooks/usePalette";

type Props = {
  title: string;
  subtitle?: string;
  navigate: (to: string) => void;
};

export function MissionBar({ title, subtitle, navigate }: Props) {
  const { toggle: toggleTheme } = usePalette();
  return (
    <header className="mission-bar">
      <button
        type="button"
        className="mission-bar__back"
        onClick={() => navigate("/core")}
      >
        <span aria-hidden="true">←</span> Mission control
      </button>
      <div className="mission-bar__title">
        <p className="label label-accent mission-bar__label">§ {title}</p>
        {subtitle && <p className="mission-bar__subtitle">{subtitle}</p>}
      </div>
      <div className="mission-bar__chrome">
        <ThemeToggle onToggle={toggleTheme} />
      </div>
    </header>
  );
}
