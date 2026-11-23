import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, X } from 'lucide-react';
import { dueItems, weakItems } from '../lib/review';

export interface Mistake {
  /** The question or target, e.g. "Which country does this flag belong to?" or "France". */
  prompt: string;
  /** What the player answered, if anything. */
  yours?: string;
  right?: string;
  /** A hint that helps it stick, e.g. "Chad borders Libya, Sudan and Niger." */
  note?: string;
  /** Where to learn more. */
  link?: string;
  /** A small picture that goes with the prompt, such as the flag that was asked about. */
  image?: string;
}

/** How many weak spots there are and how many are ready to review; updates when answers are recorded. */
export function useWeakCounts() {
  const read = () => ({ total: weakItems().length, due: dueItems().length });
  const [counts, setCounts] = useState(read);
  useEffect(() => {
    const update = () => setCounts(read());
    window.addEventListener('atlas-weak-change', update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener('atlas-weak-change', update); window.removeEventListener('storage', update); };
  }, []);
  return counts;
}

/**
 * The end-of-game list of what went wrong, with the right answer and a link to learn more,
 * plus a way into the weak-spots review.
 */
export function MistakeReview({ mistakes, title = 'What to learn from this round' }: { mistakes: Mistake[]; title?: string }) {
  const { due } = useWeakCounts();
  return (
    <section className="mistakes" aria-labelledby="mistakes-h">
      <h3 id="mistakes-h">{mistakes.length ? title : 'No mistakes this round'}</h3>
      {mistakes.length > 0 ? (
        <ol className="mistake-list">
          {mistakes.map((m, i) => (
            <li key={i}>
              <X size={18} aria-hidden="true" className="mistake-icon" />
              {m.image && <img className="mistake-image" src={m.image} alt="" width={48} height={36} />}
              <div>
                <p className="mistake-prompt">{m.prompt}</p>
                <p>
                  {m.yours && <><span className="mistake-yours">You said {m.yours}.</span> </>}
                  {m.right && <span>The answer is <strong>{m.right.replace(/[.!?]$/, '')}</strong>. </span>}
                  {m.note && <span>{m.note} </span>}
                  {m.link && <> <Link to={m.link}>Learn more</Link></>}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">Everything right. Try a harder level?</p>
      )}
      {due > 0 && (
        <p className="mistake-review-link">
          <Link className="btn" to="/games/review"><RotateCcw size={18} aria-hidden="true" /> Review your weak spots ({due})</Link>
        </p>
      )}
    </section>
  );
}
