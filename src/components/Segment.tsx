import type { ReactNode } from "react";

type Props<T extends string> = {
  value: T;
  options: ReadonlyArray<T>;
  onChange: (next: T) => void;
  ariaLabel: string;
  renderLabel?: (option: T) => ReactNode;
};

export function Segment<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  renderLabel,
}: Props<T>) {
  return (
    <div className="core-segment" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          className={
            "core-segment__btn" +
            (value === option ? " core-segment__btn--active" : "")
          }
          onClick={() => onChange(option)}
        >
          {renderLabel ? renderLabel(option) : option}
        </button>
      ))}
    </div>
  );
}
