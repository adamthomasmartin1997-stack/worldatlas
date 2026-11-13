import { useRef, useState, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, ArrowRight, RotateCcw } from 'lucide-react';
import type { Question } from '../lib/quiz';
import { saveBest } from '../lib/progress';

/** Multiple-choice quiz: one question at a time, instant feedback, results screen. */
export function QuizRunner({ questions, gameId, onRestart, resultsExtra }: { questions: Question[]; gameId: string; onRestart: () => void; resultsExtra?: ReactNode }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { heading.current?.focus(); }, [i, done]);

  const q = questions[i];
  const answered = picked !== null;

  const choose = (k: number) => {
    if (answered) return;
    setPicked(k);
    if (k === q.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (i + 1 < questions.length) { setI(i + 1); setPicked(null); }
    else { setDone(true); setNewBest(saveBest(gameId, Math.round((score / questions.length) * 100))); }
  };

  if (done) {
    return (
      <div className="quiz-card" aria-live="polite">
        <p className="eyebrow">Results</p>
        <h2 ref={heading} tabIndex={-1}>You scored {score} out of {questions.length}</h2>
        {newBest && <p className="tag">New personal best</p>}
        <div className="quiz-actions">
          <button className="btn btn-primary" onClick={onRestart}><RotateCcw size={18} aria-hidden="true" /> Play again</button>
          {resultsExtra}
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-card">
      <div className="quiz-progress">
        <span>Question {i + 1} of {questions.length}</span>
        <span>Score {score}</span>
      </div>
      <div className="progress-bar" aria-hidden="true"><span style={{ width: `${(i / questions.length) * 100}%` }} /></div>
      <h2 ref={heading} tabIndex={-1} className="quiz-question">{q.q}</h2>
      <div className="quiz-options" role="group" aria-label="Answers">
        {q.options.map((opt, k) => {
          const state = !answered ? '' : k === q.answer ? 'correct' : k === picked ? 'incorrect' : 'faded';
          return (
            <button key={opt} className={`quiz-option ${state}`} onClick={() => choose(k)} aria-disabled={answered}>
              <span>{opt}</span>
              {state === 'correct' && <Check size={18} aria-label="Correct answer" />}
              {state === 'incorrect' && <X size={18} aria-label="Your answer, incorrect" />}
            </button>
          );
        })}
      </div>
      <div aria-live="polite">
        {answered && (
          <div className={`quiz-feedback ${picked === q.answer ? 'correct' : 'incorrect'}`}>
            <strong>{picked === q.answer ? 'Correct.' : `Not quite — the answer is ${q.options[q.answer]}.`}</strong>
            {q.explain && <span> {q.explain}</span>}
            {q.link && <> <Link to={q.link}>Read more</Link></>}
          </div>
        )}
      </div>
      {answered && (
        <div className="quiz-actions">
          <button className="btn btn-primary" onClick={next}>{i + 1 < questions.length ? 'Next question' : 'See results'} <ArrowRight size={18} aria-hidden="true" /></button>
        </div>
      )}
    </div>
  );
}
