import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Explore } from './pages/Explore';
import { Countries } from './pages/Countries';
import { CountryProfile } from './pages/CountryProfile';
import { CountryQuiz } from './pages/CountryQuiz';
import { StateProfile } from './pages/StateProfile';
import { History } from './pages/History';
import { Games } from './pages/Games';
import { NameTheCountries } from './pages/games/NameTheCountries';
import { FindOnMap } from './pages/games/FindOnMap';
import { Capitals } from './pages/games/Capitals';
import { Flags } from './pages/games/Flags';
import { Silhouettes } from './pages/games/Silhouettes';
import { MysteryCountry } from './pages/games/MysteryCountry';
import { HigherLower } from './pages/games/HigherLower';
import { Data } from './pages/Data';
import { DataSources } from './pages/DataSources';
import { NotFound } from './pages/NotFound';

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
      { path: '/history', element: <History /> },
      { path: '/games', element: <Games /> },
      { path: '/games/name-the-countries', element: <NameTheCountries /> },
      { path: '/games/find-on-map', element: <FindOnMap /> },
      { path: '/games/capitals', element: <Capitals /> },
      { path: '/games/flags', element: <Flags /> },
      { path: '/games/silhouettes', element: <Silhouettes /> },
      { path: '/games/mystery', element: <MysteryCountry /> },
      { path: '/games/higher-lower', element: <HigherLower /> },
      { path: '/data', element: <Data /> },
      { path: '/data/sources', element: <DataSources /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
