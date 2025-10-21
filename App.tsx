
import React, { useState, useEffect } from 'react';
import Home from './pages/Home';
import Capture from './pages/Capture';
import MC from './pages/MC';
import TV from './pages/TV';
import KPIs from './pages/KPIs';
import Meetings from './pages/Meetings';
import Header from './components/Header';

const App: React.FC = () => {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const renderPage = () => {
    switch (route) {
      case '#/capture':
        return <Capture />;
      case '#/mc':
        return <MC />;
      case '#/meetings':
        return <Meetings />;
      case '#/kpis':
        return <KPIs />;
      case '#/tv':
        return <TV />;
      case '#/':
      case '':
      default:
        return <Home />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        {renderPage()}
      </main>
    </div>
  );
};

export default App;
