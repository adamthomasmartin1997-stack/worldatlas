import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';

/**
 * An SVG map that can be zoomed and panned.
 *
 * - Phone: pinch to zoom; once zoomed, drag with one finger to move. At normal size one-finger drags still
 *   scroll the page, so a map never traps you.
 * - Desktop: trackpad pinch or Ctrl + scroll to zoom, drag to move, double-click to zoom in.
 * - Everyone: +, − and "Reset view" buttons (keyboard accessible).
 *
 * Children are drawn in the map's own coordinates. Markers that should stay the same size on screen
 * read the current scale with useZoomScale() and counter-scale themselves.
 */
const MIN = 1, MAX = 8, STEP = 1.6;
type View = { k: number; x: number; y: number };
const NORMAL: View = { k: 1, x: 0, y: 0 };

const ZoomScale = createContext(1);
/** The current zoom factor (1 = normal view). Use `scale(${1 / k})` to keep a marker the same size on screen. */
export const useZoomScale = () => useContext(ZoomScale);

export function ZoomableSvg({ width, height, label, className = 'map-svg', children }: {
  width: number; height: number; label: string; className?: string; children: ReactNode;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>(NORMAL);
  const [animate, setAnimate] = useState(false);
  const viewRef = useRef(view);
  viewRef.current = view;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; moved: number; last: { x: number; y: number } } | null>(null);
  const suppressClick = useRef(false);

  /** Keep the map covering the frame: no zooming out past normal, no dragging it off-screen. */
  const clamp = useCallback((v: View): View => {
    const k = Math.min(MAX, Math.max(MIN, v.k));
    return { k, x: Math.min(0, Math.max(width - width * k, v.x)), y: Math.min(0, Math.max(height - height * k, v.y)) };
  }, [width, height]);

  /** A screen point in the map's own (viewBox) units. */
  const toSvg = useCallback((clientX: number, clientY: number) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: ((clientX - r.left) * width) / r.width, y: ((clientY - r.top) * height) / r.height };
  }, [width, height]);

  /** Zoom by a factor, keeping the point `at` (viewBox units) fixed on screen. */
  const zoomAt = useCallback((factor: number, at: { x: number; y: number }, smooth = false) => {
    setAnimate(smooth);
    setView((v) => {
      const k = Math.min(MAX, Math.max(MIN, v.k * factor));
      return clamp({ k, x: at.x - ((at.x - v.x) * k) / v.k, y: at.y - ((at.y - v.y) * k) / v.k });
    });
  }, [clamp]);

  const centre = { x: width / 2, y: height / 2 };
  const reset = () => { setAnimate(true); setView(NORMAL); };

  // Wheel zoom needs a non-passive listener. Plain scrolling still scrolls the page; trackpad pinches
  // (which browsers report as Ctrl + wheel) and Ctrl/⌘ + scroll zoom the map.
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomAt(Math.exp(-e.deltaY * 0.002), toSvg(e.clientX, e.clientY));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt, toSvg]);

  const spread = () => {
    const [a, b] = [...pointers.current.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    suppressClick.current = false;
    gesture.current = { dist: pointers.current.size === 2 ? spread().dist : 0, moved: 0, last: { x: e.clientX, y: e.clientY } };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (pointers.current.size >= 2) {
      const { dist, mid } = spread();
      if (g.dist > 0) zoomAt(dist / g.dist, toSvg(mid.x, mid.y));
      g.dist = dist;
      g.moved += 10; // a pinch is never a tap
      suppressClick.current = true;
      return;
    }
    const dx = e.clientX - g.last.x, dy = e.clientY - g.last.y;
    g.last = { x: e.clientX, y: e.clientY };
    g.moved += Math.abs(dx) + Math.abs(dy);
    if (viewRef.current.k === 1) return; // at normal size, let the page scroll
    if (g.moved > 6) suppressClick.current = true;
    const r = svg.current!.getBoundingClientRect();
    setAnimate(false);
    setView((v) => clamp({ ...v, x: v.x + (dx * width) / r.width, y: v.y + (dy * height) / r.height }));
  };

  const onPointerEnd = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1 && gesture.current) {
      const [p] = pointers.current.values();
      gesture.current = { ...gesture.current, dist: 0, last: p };
    }
    if (!pointers.current.size) gesture.current = null;
  };

  const zoomed = view.k > 1.001;
  return (
    <ZoomScale.Provider value={view.k}>
      <svg
        ref={svg}
        viewBox={`0 0 ${width} ${height}`}
        className={`${className} zoomable${zoomed ? ' is-zoomed' : ''}`}
        role="img"
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(e) => { if (suppressClick.current) { e.stopPropagation(); e.preventDefault(); suppressClick.current = false; } }}
        onDoubleClick={(e) => zoomAt(STEP, toSvg(e.clientX, e.clientY), true)}
      >
        <g className={animate ? 'zoom-layer is-animating' : 'zoom-layer'} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
          {children}
        </g>
      </svg>
      <div className="zoom-controls">
        <button type="button" className="zoom-btn" onClick={() => zoomAt(STEP, centre, true)} disabled={view.k >= MAX} aria-label="Zoom in"><Plus size={20} strokeWidth={2.5} aria-hidden="true" /></button>
        <button type="button" className="zoom-btn" onClick={() => zoomAt(1 / STEP, centre, true)} disabled={!zoomed} aria-label="Zoom out"><Minus size={20} strokeWidth={2.5} aria-hidden="true" /></button>
        {zoomed && <button type="button" className="zoom-btn zoom-reset" onClick={reset}><RotateCcw size={18} strokeWidth={2.5} aria-hidden="true" /> Reset view</button>}
      </div>
    </ZoomScale.Provider>
  );
}
