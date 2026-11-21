import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Explore } from './pages/Explore';
import { Countries } from './pages/Countries';
import { CountryProfile } from './pages/CountryProfile';
import { CountryQuiz } from './pages/CountryQuiz';
import { StateProfile } from './pages/StateProfile';
import { History } from './pages/History';
import { EventPage } from './pages/EventPage';
import { EraPage } from './pages/EraPage';
import { Meanwhile } from './pages/Meanwhile';
import { Games } from './pages/Games';
import { NameTheCountries } from './pages/games/NameTheCountries';
import { FindOnMap } from './pages/games/FindOnMap';
import { Capitals } from './pages/games/Capitals';
import { Flags } from './pages/games/Flags';
import { Silhouettes } from './pages/games/Silhouettes';
import { MysteryCountry } from './pages/games/MysteryCountry';
import { HigherLower } from './pages/games/HigherLower';
import { BorderChain } from './pages/games/BorderChain';
import { WhichCameFirst } from './pages/games/WhichCameFirst';
import { WhoAmI } from './pages/games/WhoAmI';
import { SpeedRound } from './pages/games/SpeedRound';
import { NameTheCapitals } from './pages/games/NameTheCapitals';
import { Data } from './pages/Data';
import { DataSources } from './pages/DataSources';
import { NotFound } from './pages/NotFound';
import { DeepDive } from './pages/DeepDive';

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
