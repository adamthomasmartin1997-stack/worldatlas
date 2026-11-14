import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

export type TabColor = 'white' | 'green' | 'lime' | 'sun' | 'sky' | 'leaf' | 'coral' | 'ocean';
export interface FolderTab { id: string; label: string; color: TabColor }

/**
 * Paper-folder tabs: the selected tab rises and joins the folder page, which takes its colour.
 * Accessible tabs pattern: arrow keys / Home / End move between tabs, only the selected tab is in the tab order.
 */
export function FolderTabs({ label, tabs, value, onChange, children }: {
  label: string;
  tabs: FolderTab[];
  value: string;
  onChange: (id: string) => void;
  children: ReactNode;
}) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = tabs.find((t) => t.id === value) ?? tabs[0];

  const onKey = (e: KeyboardEvent, i: number) => {
    const last = tabs.length - 1;
    const next = e.key === 'ArrowRight' ? (i === last ? 0 : i + 1) : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : null;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div className="folder">
      <div className="folder-tabs" role="tablist" aria-label={label}>
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="tab"
            id={`${id}-tab-${t.id}`}
            aria-selected={t.id === active.id}
            aria-controls={`${id}-panel`}
            tabIndex={t.id === active.id ? 0 : -1}
            className={`folder-tab tab-${t.color}${t.id === active.id ? ' is-active' : ''}`}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className={`folder-panel tab-${active.color}`} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${active.id}`} tabIndex={0}>
        {children}
      </div>
    </div>
  );
}
