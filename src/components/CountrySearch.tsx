import { useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { COUNTRIES, countryPath, type Country } from '../data/countries';
import { normalize } from '../lib/answers';

/** Accessible combobox for finding a country — the keyboard/screen-reader route into every map. */
export function CountrySearch({ label = 'Search countries', placeholder = 'Search a country, e.g. France', onPick }: { label?: string; placeholder?: string; onPick?: (c: Country) => void }) {
  const id = useId();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const n = normalize(q);
    if (!n) return [];
    const starts = COUNTRIES.filter((c) => normalize(c.name).startsWith(n));
    const contains = COUNTRIES.filter((c) => !starts.includes(c) && [c.name, ...c.altNames, ...c.capital].some((x) => normalize(x).includes(n)));
    return [...starts, ...contains].slice(0, 8);
  }, [q]);

  const pick = (c: Country) => {
    setQ('');
    setOpen(false);
    if (onPick) onPick(c);
    else navigate(countryPath(c));
  };

  const expanded = open && results.length > 0;
  return (
    <div className="search">
      <label htmlFor={id} className="sr-only">{label}</label>
      <div className="search-input-wrap">
        <Search size={18} aria-hidden="true" />
        <input
          id={id}
          className="input"
          type="search"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={expanded ? `${id}-opt-${active}` : undefined}
          placeholder={placeholder}
          value={q}
          autoComplete="off"
          onChange={(e) => { setQ(e.target.value); setActive(0); setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === 'Enter' && results[active]) { e.preventDefault(); pick(results[active]); }
            else if (e.key === 'Escape') setOpen(false);
          }}
        />
      </div>
      {expanded && (
        <ul id={`${id}-list`} role="listbox" className="search-list">
          {results.map((c, i) => (
            <li
              key={c.cca3}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className="search-option"
              onMouseDown={(e) => { e.preventDefault(); pick(c); }}
              onMouseEnter={() => setActive(i)}
            >
              <span>{c.name}</span>
              <small>{c.subregion ?? c.region}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
