import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Construction } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SOURCES, type SourceId } from '../data/sources';

type ButtonVariant = 'primary' | 'secondary';

export function ButtonLink({ to, variant = 'secondary', children, small }: { to: string; variant?: ButtonVariant; children: ReactNode; small?: boolean }) {
  return <Link to={to} className={`btn btn-${variant}${small ? ' btn-sm' : ''}`}>{children}</Link>;
}

export function Card({ to, icon: Icon, title, children, eyebrow }: { to?: string; icon?: LucideIcon; title: string; children?: ReactNode; eyebrow?: string }) {
  const body = (
    <>
      {Icon && <span className="card-icon"><Icon size={20} aria-hidden="true" /></span>}
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h3 className="card-title">{title}</h3>
      {children}
    </>
  );
  return to ? <Link to={to} className="card card-link">{body}</Link> : <div className="card">{body}</div>;
}

/** Honest "not built yet" block — use instead of fake content. */
export function Placeholder({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="placeholder">
      <h3><Construction size={18} aria-hidden="true" /> {title}</h3>
      <div>{children}</div>
    </div>
  );
}

export function PlaceholderTag() {
  return <span className="tag tag-placeholder">Placeholder</span>;
}

export function SourceNote({ sources, children }: { sources: SourceId[]; children?: ReactNode }) {
  return (
    <p className="source-note">
      Source:{' '}
      {sources.map((s, i) => (
        <span key={s}>{i > 0 && '; '}<a href={SOURCES[s].url} target="_blank" rel="noreferrer">{SOURCES[s].name}</a> ({SOURCES[s].licence})</span>
      ))}
      {children && <> · {children}</>}
    </p>
  );
}

export function Breadcrumbs({ items }: { items: { to?: string; label: string }[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, i) => (
          <li key={item.label}>
            {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current={i === items.length - 1 ? 'page' : undefined}>{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ eyebrow, title, children, crumbs, dark }: { eyebrow?: string; title: string; children?: ReactNode; crumbs?: { to?: string; label: string }[]; dark?: boolean }) {
  return (
    <div className={dark ? 'dark' : undefined}>
      <header className="page-header container">
        {crumbs && <Breadcrumbs items={crumbs} />}
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {children}
      </header>
    </div>
  );
}
