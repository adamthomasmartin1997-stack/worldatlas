import { DIFFICULTIES, type Difficulty } from '../lib/difficulty';

/** `blurbs` replaces the default explanations for games where they don't fit. */
export function DifficultyPicker({ value, onChange, blurbs }: { value: Difficulty; onChange: (d: Difficulty) => void; blurbs?: Record<Difficulty, string> }) {
  const current = DIFFICULTIES.find((d) => d.key === value)!;
  return (
    <>
      <div className="segmented" role="group" aria-label="Difficulty">
        {DIFFICULTIES.map((d) => (
          <button key={d.key} className={value === d.key ? 'on' : ''} aria-pressed={value === d.key} onClick={() => onChange(d.key)}>{d.label}</button>
        ))}
      </div>
      <p className="muted difficulty-note">{blurbs?.[value] ?? current.blurb}</p>
    </>
  );
}
