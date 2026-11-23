import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { DifficultyPicker } from '../components/DifficultyPicker';
import { parseDifficulty, type Difficulty } from '../lib/difficulty';
import { PageHeader, ButtonLink } from '../components/ui';
import { QuizRunner } from '../components/QuizRunner';
import { countryPath, getCountry, type Country } from '../data/countries';
import { TOPICS, questionCount, questionsFor, type Question, type Topic } from '../lib/quiz';
import { deepQuestions } from '../lib/deepQuiz';
import { NotFound } from './NotFound';

/** Hand-written or geography questions straight away; otherwise a quiz generated from the deep-dive page. */
async function load(c: Country, t: Topic, level: Difficulty): Promise<Question[]> {
  if (t === 'geography') return questionsFor(c, t, level);
  const written = questionCount(c, t) > 0 ? questionsFor(c, t, level) : [];
  if (written.length >= 8) return written;
  // Top up a short hand-written quiz (or build one) from the deep-dive page, up to ten questions.
  const generated = await deepQuestions(c, t);
  return [...written, ...generated].slice(0, Math.max(10, written.length));
}

export function CountryQuiz() {
  const { code, topic } = useParams();
  const c = getCountry(code);
  const t = topic && topic in TOPICS ? (topic as Topic) : null;
  const [params, setParams] = useSearchParams();
  const level = parseDifficulty(params.get('level'));
  const [round, setRound] = useState(0);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const generated = Boolean(c && t && t !== 'geography' && questionCount(c, t) === 0);

  useEffect(() => {
    if (!c || !t) return;
    let live = true;
    setQuestions(null);
    load(c, t, level).then((qs) => live && setQuestions(qs)).catch(() => live && setQuestions([]));
    return () => { live = false; };
  }, [c, t, level, round]);

  if (!c || !t) return <NotFound />;

  return (
    <div className="dark play-screen">
      <PageHeader dark crumbs={[{ to: '/countries', label: 'Countries' }, { to: countryPath(c), label: c.name }, { label: `${TOPICS[t].label} quiz` }]} title={`${c.name}: ${TOPICS[t].label}`}>
        {generated && <p className="muted">Questions built from our {TOPICS[t].label.toLowerCase()} page on {c.name}. Each answer explains itself.</p>}
      </PageHeader>
      <div className="container play-body">
        {t === 'geography' && <DifficultyPicker value={level} onChange={(d) => setParams({ level: d })} />}
        {questions === null ? (
          <div className="quiz-card"><p className="muted" role="status">Getting your questions ready…</p></div>
        ) : questions.length ? (
          <QuizRunner
            key={round}
            questions={questions}
            gameId={`country-${c.cca3}-${t}${t === 'geography' ? `-${level}` : ''}`}
            onRestart={() => setRound((r) => r + 1)}
            resultsExtra={<ButtonLink to={t === 'geography' ? countryPath(c) : `${countryPath(c)}/${t}`}>{t === 'geography' ? `Back to ${c.name}` : `Read the ${TOPICS[t].label.toLowerCase()} page`}</ButtonLink>}
          />
        ) : (
          <div className="quiz-card">
            <h2>No {TOPICS[t].label.toLowerCase()} quiz for {c.name} yet</h2>
            <p>There isn't enough on its {TOPICS[t].label.toLowerCase()} page to make a quiz. Try geography instead.</p>
            <ButtonLink to={`${countryPath(c)}/quiz/geography`}>Geography quiz</ButtonLink>
          </div>
        )}
      </div>
    </div>
  );
}
