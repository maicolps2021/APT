import React, { useState, useEffect } from 'react';
import Home from './pages/Home';
import Capture from './pages/Capture';
import MC from './pages/MC';
import TV from './pages/TV';
import KPIs from './pages/KPIs';
import Raffles from './pages/Raffles';
import Materials from './pages/Materials';
import LeadList from './pages/LeadList';
import Settings from './pages/Settings';
import DashboardLayout from './components/DashboardLayout';
import { AuthProvider } from './contexts/AuthContext';

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
      case '#/kpis':
        return <KPIs />;
      case '#/raffles':
        return <Raffles />;
      case '#/tv':
        return <TV />;
      case '#/materials':
        return <Materials />;
      case '#/leads':
        return <LeadList />;
      case '#/settings':
        return <Settings />;
      case '#/':
      case '':
      default:
        return <Home />;
    }
  };
  
  // Render TV and Capture pages in full-screen "kiosk" mode without the dashboard layout
  if (route === '#/tv' || route === '#/capture') {
    return <AuthProvider>{renderPage()}</AuthProvider>;
  }

  return (
    <AuthProvider>
      <DashboardLayout>
        {renderPage()}
      </DashboardLayout>
    </AuthProvider>
  );
};

export default App;
