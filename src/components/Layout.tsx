import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Globe2, Menu, X } from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/explore', label: 'Explore' },
  { to: '/countries', label: 'Countries' },
  { to: '/history', label: 'History' },
  { to: '/games', label: 'Games' },
  { to: '/data', label: 'Data' },
] as const;

export function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <header className="site-header">
        <div className="container">
          <Link to="/" className="brand" aria-label="Worldwise home">
            <span className="brand-globe" aria-hidden="true"><Globe2 size={18} strokeWidth={2.25} /></span> Worldwise
          </Link>
          <button className="nav-toggle" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen((o) => !o)}>
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
          <nav id="site-nav" className={`site-nav${open ? ' open' : ''}`} aria-label="Main">
            <ul className="nav-list">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Suspense fallback={<div className="container section"><p className="muted" role="status">Loading…</p></div>}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <p className="footer-brand">Worldwise</p>
            <p>Explore the world, understand it, then test yourself. Template build — editorial content is still being written.</p>
          </div>
          <div>
            <p className="eyebrow">Sections</p>
            <ul>{NAV_ITEMS.map((i) => <li key={i.to}><Link to={i.to}>{i.label}</Link></li>)}</ul>
          </div>
          <div>
            <p className="eyebrow">About</p>
            <ul>
              <li><Link to="/data/sources">Data sources &amp; licences</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}
