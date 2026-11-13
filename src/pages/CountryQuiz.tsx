import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader, ButtonLink } from '../components/ui';
import { QuizRunner } from '../components/QuizRunner';
import { countryPath, getCountry } from '../data/countries';
import { TOPICS, questionsFor, type Topic } from '../lib/quiz';
import { NotFound } from './NotFound';

export function CountryQuiz() {
  const { code, topic } = useParams();
  const c = getCountry(code);
  const t = topic && topic in TOPICS ? (topic as Topic) : null;
  const [round, setRound] = useState(0);
  const [questions, setQuestions] = useState(() => (c && t ? questionsFor(c, t) : []));
  if (!c || !t) return <NotFound />;

  return (
    <div className="dark play-screen">
      <PageHeader dark crumbs={[{ to: '/countries', label: 'Countries' }, { to: countryPath(c), label: c.name }, { label: `${TOPICS[t].label} quiz` }]} title={`${c.name}: ${TOPICS[t].label}`} />
      <div className="container play-body">
        {questions.length ? (
          <QuizRunner
            key={round}
            questions={questions}
            gameId={`country-${c.cca3}-${t}`}
            onRestart={() => { setQuestions(questionsFor(c, t)); setRound((r) => r + 1); }}
            resultsExtra={<ButtonLink to={countryPath(c)}>Back to {c.name}</ButtonLink>}
          />
        ) : (
          <div className="quiz-card">
            <h2>No {TOPICS[t].label.toLowerCase()} questions for {c.name} yet</h2>
            <p>Add them in <code>src/content/quizzes/{c.cca3.toLowerCase()}.json</code>.</p>
            <ButtonLink to={countryPath(c)}>Back to {c.name}</ButtonLink>
          </div>
        )}
      </div>
    </div>
  );
}
