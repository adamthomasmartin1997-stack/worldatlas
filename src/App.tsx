import { lazy, type ComponentType } from 'react';
import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';

/**
 * Every page except the home page loads when it's first opened, so a phone downloads only what it
 * needs (the Layout shows a short loading message meanwhile).
 */
function page<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(() => load().then((m) => ({ default: m[name] })));
}
const Explore = page(() => import('./pages/Explore'), 'Explore');
const Countries = page(() => import('./pages/Countries'), 'Countries');
const CountryProfile = page(() => import('./pages/CountryProfile'), 'CountryProfile');
const CountryQuiz = page(() => import('./pages/CountryQuiz'), 'CountryQuiz');
const StateProfile = page(() => import('./pages/StateProfile'), 'StateProfile');
const History = page(() => import('./pages/History'), 'History');
const EventPage = page(() => import('./pages/EventPage'), 'EventPage');
const EraPage = page(() => import('./pages/EraPage'), 'EraPage');
const Meanwhile = page(() => import('./pages/Meanwhile'), 'Meanwhile');
const Games = page(() => import('./pages/Games'), 'Games');
const NameTheCountries = page(() => import('./pages/games/NameTheCountries'), 'NameTheCountries');
const FindOnMap = page(() => import('./pages/games/FindOnMap'), 'FindOnMap');
const Capitals = page(() => import('./pages/games/Capitals'), 'Capitals');
const Flags = page(() => import('./pages/games/Flags'), 'Flags');
const Silhouettes = page(() => import('./pages/games/Silhouettes'), 'Silhouettes');
const MysteryCountry = page(() => import('./pages/games/MysteryCountry'), 'MysteryCountry');
const HigherLower = page(() => import('./pages/games/HigherLower'), 'HigherLower');
const Review = page(() => import('./pages/games/Review'), 'Review');
const TimelineGame = page(() => import('./pages/games/TimelineGame'), 'TimelineGame');
const BorderChain = page(() => import('./pages/games/BorderChain'), 'BorderChain');
const WhichCameFirst = page(() => import('./pages/games/WhichCameFirst'), 'WhichCameFirst');
const WhoAmI = page(() => import('./pages/games/WhoAmI'), 'WhoAmI');
const SpeedRound = page(() => import('./pages/games/SpeedRound'), 'SpeedRound');
const NameTheCapitals = page(() => import('./pages/games/NameTheCapitals'), 'NameTheCapitals');
const Data = page(() => import('./pages/Data'), 'Data');
const DataSources = page(() => import('./pages/DataSources'), 'DataSources');
const NotFound = page(() => import('./pages/NotFound'), 'NotFound');
const DeepDive = page(() => import('./pages/DeepDive'), 'DeepDive');

const createRouter = import.meta.env.VITE_HASH_ROUTER ? createHashRouter : createBrowserRouter;
const router = createRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/explore', element: <Explore /> },
      { path: '/countries', element: <Countries /> },
      { path: '/countries/:code', element: <CountryProfile /> },
      { path: '/countries/:code/quiz/:topic', element: <CountryQuiz /> },
      { path: '/countries/:code/states/:state', element: <StateProfile /> },
      { path: '/countries/:code/:section', element: <DeepDive /> },
      { path: '/history', element: <History /> },
      { path: '/history/events/:id', element: <EventPage /> },
      { path: '/history/eras/:slug', element: <EraPage /> },
      { path: '/history/meanwhile', element: <Meanwhile /> },
      { path: '/games', element: <Games /> },
      { path: '/games/name-the-countries', element: <NameTheCountries /> },
      { path: '/games/find-on-map', element: <FindOnMap /> },
      { path: '/games/capitals', element: <Capitals /> },
      { path: '/games/flags', element: <Flags /> },
      { path: '/games/silhouettes', element: <Silhouettes /> },
      { path: '/games/mystery', element: <MysteryCountry /> },
      { path: '/games/higher-lower', element: <HigherLower /> },
      { path: '/games/border-chain', element: <BorderChain /> },
      { path: '/games/review', element: <Review /> },
      { path: '/games/timeline', element: <TimelineGame /> },
      { path: '/games/which-came-first', element: <WhichCameFirst /> },
      { path: '/games/who-am-i', element: <WhoAmI /> },
      { path: '/games/speed-round', element: <SpeedRound /> },
      { path: '/games/name-the-capitals', element: <NameTheCapitals /> },
      { path: '/data', element: <Data /> },
      { path: '/data/sources', element: <DataSources /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
