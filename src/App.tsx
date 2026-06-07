import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';

import routes from './routes';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router basename={import.meta.env.BASE_URL}>
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow">
            <Routes>
              {routes.map((route, index) => (
                <Route
                  key={index}
                  path={route.path}
                  element={route.element}
                />
              ))}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        <Toaster position="top-center" richColors />
      </Router>
    </ErrorBoundary>
  );
};

export default App;
