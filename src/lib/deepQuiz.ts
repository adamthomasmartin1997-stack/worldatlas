/**
 * Quizzes generated from a country's deep-dive pages, so every country has history, culture and
 * sport quizzes. Questions only use facts already written for the site; wrong answers come from the
 * same page or from deep dives of other countries in the same region, so they're plausible.
 */
import type { Country } from '../data/countries';
import { SOVEREIGN, countryPath } from '../data/countries';
import { loadDeepDive, nameInSentence, type DeepDive } from '../content/deep';
import { parseWrittenYear } from '../data/countryTimeline';
import { shuffle } from './answers';
import { shuffleOptions, type Question } from './quiz';

type Rand = () => number;
type Topic = 'history' | 'culture' | 'sport';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const GENRE = /^(folk|band|dance|music|song|songs|traditional|genre|instrument|style|choir|orchestra|pop|rock|jazz|hip hop|rap|reggae|opera|classical|various|anthem|national anthem|ballad|chant|chants|musician|musicians|singer|singers|composer|band members|artist|artists|group|duo|trio)\b/i;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Up to `n` wrong options: distinct, not the answer, not blank, shuffled. */
function wrong(pool: string[], right: string, n = 3, rand: Rand = Math.random): string[] {
  const norm = (s: string) => s.trim().toLowerCase();
  return shuffle([...new Set(pool.map((s) => s.trim()).filter((s) => s && norm(s) !== norm(right)))], rand).slice(0, n);
}
/** A question with exactly four options, or null when there aren't enough good wrong answers. */
function q(question: Omit<Question, 'options' | 'answer'>, right: string, pool: string[], rand: Rand): Question | null {
  const others = wrong(pool, right, 3, rand);
  return others.length < 3 ? null : shuffleOptions({ ...question, options: [right, ...others], answer: 0 }, rand);
}
/**
 * Wrong years near a plain year ("1996" → "1992", "2000", "2004"…), for when a page has too few
 * dates of its own. Wrong options don't have to be facts, only believable. Never in the future.
 */
export function nearbyYears(label: string, rand: Rand = Math.random): string[] {
  if (!/^\d{4}$/.test(label.trim())) return [];
  const y = Number(label), now = new Date().getFullYear();
  return shuffle([-12, -8, -4, -3, 3, 4, 8, 12].map((d) => y + d).filter((v) => v <= now && v !== y), rand).map(String);
}
const group = (d: DeepDive | undefined, id: string) => d?.cardGroups?.find((g) => g.id === id)?.items ?? [];
/** "1844 · Alexandre Dumas" → "Alexandre Dumas"; "Édith Piaf, 1947" → "Édith Piaf"; "Football · since 1932" → "Football". */
const after = (s?: string) => (s?.includes('·') ? s.split('·').pop()!.trim() : '');
const before = (s?: string) => (s ?? '').split(/·|,/)[0].trim();

export function historyQuestions(c: Country, own: DeepDive, others: DeepDive[], rand: Rand = Math.random): Question[] {
  const name = nameInSentence(c);
  const link = `${countryPath(c)}/history`;
  const qs: (Question | null)[] = [];
  const tl = (own.timeline ?? []).filter((t) => parseWrittenYear(t.year) != null);
  const labels = tl.map((t) => t.year);
  for (const t of shuffle(tl, rand).slice(0, 4)) {
    const pool = new Set(labels).size >= 4 ? labels : [...labels, ...nearbyYears(t.year, rand)];
    qs.push(q({ q: `In ${name}'s history, when was this: ${t.title}?`, explain: `${t.year}: ${t.text}`, link }, t.year, pool, rand));
  }
  if (tl.length >= 4) {
    const four = shuffle(tl, rand).slice(0, 4);
    const first = [...four].sort((a, b) => parseWrittenYear(a.year)! - parseWrittenYear(b.year)!)[0];
    const distinct = new Set(four.map((t) => parseWrittenYear(t.year))).size === 4;
    if (distinct) qs.push(shuffleOptions({ q: `Which of these happened first in ${name}?`, options: [first.title, ...four.filter((t) => t !== first).map((t) => t.title)], answer: 0, explain: four.map((t) => `${t.title}: ${t.year}`).join('. ') + '.', link }, rand));
  }
  const terms = own.keyTerms ?? [];
  const meanings = [...terms, ...others.flatMap((o) => o.keyTerms ?? [])].map((k) => k.meaning);
  for (const k of shuffle(terms, rand).slice(0, 2)) qs.push(q({ q: `In ${name}'s history, what does "${k.term}" mean?`, link }, k.meaning, meanings, rand));
  return qs.filter((x): x is Question => Boolean(x));
}

export function cultureQuestions(c: Country, own: DeepDive, others: DeepDive[], rand: Rand = Math.random): Question[] {
  const name = nameInSentence(c);
  const link = `${countryPath(c)}/culture`;
  const qs: (Question | null)[] = [];
  for (const f of shuffle(own.calendar?.items ?? [], rand).slice(0, 2)) {
    qs.push(q({ q: `In which month is ${f.name} held in ${name}?`, explain: f.text, link }, MONTHS[f.month - 1], MONTHS, rand));
  }
  const otherFood = others.flatMap((o) => group(o, 'food')).map((f) => f.title);
  const ownFood = new Set(group(own, 'food').map((f) => f.title.toLowerCase()));
  for (const f of shuffle(group(own, 'food'), rand).slice(0, 2)) {
    qs.push(q({ q: `Which of these comes from ${name}?`, explain: `${f.title}: ${f.text}`, link }, f.title, otherFood.filter((x) => !ownFood.has(x.toLowerCase())), rand));
  }
  const people = (id: string, pick: (s?: string) => string) => [...group(own, id), ...others.flatMap((o) => group(o, id))].map((i) => pick(i.subtitle));
  const book = shuffle(group(own, 'books').filter((b) => after(b.subtitle)), rand)[0];
  if (book) qs.push(q({ q: `Who wrote ${book.title}?`, explain: book.text, link }, after(book.subtitle), people('books', after), rand));
  const film = shuffle(group(own, 'films').filter((f) => after(f.subtitle)), rand)[0];
  if (film) qs.push(q({ q: `Who made the film ${film.title}?`, explain: film.text, link }, after(film.subtitle), people('films', after), rand));
  // Music cards sometimes give a style ("Folk", "Dance") instead of a performer; only real names count.
  const performer = (s?: string) => { const p = before(s); return p && !/^\d/.test(p) && !GENRE.test(p) ? p : ''; };
  const song = shuffle(group(own, 'music').filter((m) => performer(m.subtitle)), rand)[0];
  if (song) qs.push(q({ q: `Who is behind "${song.title}"?`, explain: song.text, link }, performer(song.subtitle), people('music', performer), rand));
  const terms = own.keyTerms ?? [];
  const meanings = [...terms, ...others.flatMap((o) => o.keyTerms ?? [])].map((k) => k.meaning);
  const k = shuffle(terms, rand)[0];
  if (k) qs.push(q({ q: `What does "${k.term}" mean?`, link }, k.meaning, meanings, rand));
  return qs.filter((x): x is Question => Boolean(x));
}

/** Athletics events count as athletics, so "Hurdles" and "Athletics" are never both offered as different answers. */
const ATHLETICS = /^(athletics|track( and field)?|running|sprint(ing|s)?|hurdles|long jump|triple jump|high jump|pole vault|javelin|discus|shot put|hammer throw|marathon|steeplechase|decathlon|heptathlon|middle-distance running|long-distance running|race walking|\d[\d,]* ?m( .*)?)$/i;
/** Wrong answers for sport questions come only from this list, so options are always real sports. */
const SPORTS = ['Football', 'Athletics', 'Basketball', 'Cricket', 'Rugby union', 'Rugby league', 'Boxing', 'Swimming', 'Tennis', 'Cycling', 'Wrestling', 'Weightlifting', 'Judo', 'Taekwondo', 'Volleyball', 'Handball', 'Ice hockey', 'Baseball', 'Golf', 'Sailing', 'Rowing', 'Skiing', 'Fencing', 'Table tennis', 'Badminton', 'Gymnastics', 'Motor racing', 'Horse racing', 'Surfing', 'Netball', 'Karate', 'Archery', 'Shooting', 'Canoeing', 'Field hockey', 'Chess', 'Sumo', 'Figure skating', 'Biathlon', 'Snooker', 'Darts', 'Water polo'];
const sportOf = (subtitle?: string) => {
  const s = before(subtitle);
  return ATHLETICS.test(s) ? 'Athletics' : s;
};
const isSport = (s: string) => SPORTS.some((x) => x.toLowerCase() === s.toLowerCase());

export function sportQuestions(c: Country, own: DeepDive, others: DeepDive[], rand: Rand = Math.random): Question[] {
  const name = nameInSentence(c);
  const link = `${countryPath(c)}/sport`;
  const qs: (Question | null)[] = [];
  // Wrong answers: sports that appear on nearby countries' pages first (more believable), then the general list.
  const seen = [...group(own, 'legends'), ...group(own, 'leagues'), ...others.flatMap((o) => [...group(o, 'legends'), ...group(o, 'leagues')])].map((i) => sportOf(i.subtitle)).filter(isSport);
  const pool = (right: string) => [...shuffle(seen, rand), ...shuffle(SPORTS, rand)].filter((x) => x.toLowerCase() !== right.toLowerCase());
  for (const l of shuffle(group(own, 'legends').filter((l) => isSport(sportOf(l.subtitle))), rand).slice(0, 4)) {
    const sport = sportOf(l.subtitle);
    qs.push(q({ q: `Which sport is ${l.title} famous for?`, explain: l.text, link }, sport, [...new Set(pool(sport))].slice(0, 6), rand));
  }
  for (const league of shuffle(group(own, 'leagues').filter((l) => isSport(sportOf(l.subtitle))), rand).slice(0, 2)) {
    const sport = sportOf(league.subtitle);
    qs.push(q({ q: `${league.title}: which sport is it?`, explain: league.text, link }, sport, [...new Set(pool(sport))].slice(0, 6), rand));
  }
  const moments = (own.moments?.items ?? []).filter((m) => parseWrittenYear(m.year) != null);
  for (const m of shuffle(moments, rand).slice(0, 3)) {
    const years = moments.map((x) => x.year);
    const pool = new Set(years).size >= 4 ? years : [...years, ...nearbyYears(m.year, rand)];
    qs.push(q({ q: `When was this sporting moment for ${name}: ${m.title}?`, explain: `${m.year}: ${m.text}`, link }, m.year, pool, rand));
  }
  const k = shuffle(own.keyTerms ?? [], rand)[0];
  if (k) qs.push(q({ q: `In sport, what does "${k.term}" mean?`, link }, k.meaning, [...(own.keyTerms ?? []), ...others.flatMap((o) => o.keyTerms ?? [])].map((x) => x.meaning), rand));
  return qs.filter((x): x is Question => Boolean(x));
}

const BUILD = { history: historyQuestions, culture: cultureQuestions, sport: sportQuestions };
/** Fewer than this and there's no quiz for the topic. */
export const MIN_QUESTIONS = 3;

/**
 * Loads the country's deep dive for the topic plus up to six others from the same region (for
 * plausible wrong answers) and builds a quiz. Empty when the deep dive is missing.
 */
export async function deepQuestions(c: Country, topic: Topic): Promise<Question[]> {
  const own = await loadDeepDive(c.cca3, topic);
  if (!own) return [];
  const near = shuffle(SOVEREIGN.filter((x) => x.region === c.region && x.cca3 !== c.cca3)).slice(0, 6);
  const others = (await Promise.all(near.map((x) => loadDeepDive(x.cca3, topic)?.catch(() => null) ?? null))).filter((d): d is DeepDive => Boolean(d));
  const qs = shuffle(BUILD[topic](c, own, others)).map((x) => ({ ...x, q: cap(x.q) }));
  return qs.length >= MIN_QUESTIONS ? qs.slice(0, 10) : [];
}
