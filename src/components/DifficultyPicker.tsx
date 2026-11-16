import { DIFFICULTIES, type Difficulty } from '../lib/difficulty';

export function DifficultyPicker({ value, onChange }: { value: Difficulty; onChange: (d: Difficulty) => void }) {
  const current = DIFFICULTIES.find((d) => d.key === value)!;
  return (
    <>
      <div className="segmented" role="group" aria-label="Difficulty">
        {DIFFICULTIES.map((d) => (
          <button key={d.key} className={value === d.key ? 'on' : ''} aria-pressed={value === d.key} onClick={() => onChange(d.key)}>{d.label}</button>
        ))}
      </div>
      <p className="muted difficulty-note">{current.blurb}</p>
    </>
  );
}
