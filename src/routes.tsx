import WriterPage from './pages/WriterPage';
import type { ReactNode } from 'react';

interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
}

const routes: RouteConfig[] = [
  {
    name: '见白',
    path: '/',
    element: <WriterPage />
  }
];

export default routes;
