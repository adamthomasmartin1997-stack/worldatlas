import { REGION_OPTIONS, type RegionKey } from '../lib/regions';

export function RegionPicker({ value, onChange, disabled }: { value: RegionKey; onChange: (k: RegionKey) => void; disabled?: boolean }) {
  return (
    <div className="segmented" role="group" aria-label="Region">
      {REGION_OPTIONS.map((r) => (
        <button key={r.key} className={value === r.key ? 'on' : ''} aria-pressed={value === r.key} disabled={disabled} onClick={() => onChange(r.key)}>{r.label}</button>
      ))}
    </div>
  );
}
