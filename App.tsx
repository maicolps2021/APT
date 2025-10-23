import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { DashboardLayout } from './components/DashboardLayout';

// Import pages
import Home from './pages/Home';
import Capture from './pages/Capture';
import LeadList from './pages/LeadList';
import KPIs from './pages/KPIs';
import Raffles from './pages/Raffles';
import Materials from './pages/Materials';
import TV from './pages/TV';
import MC from './pages/MC';
import Meetings from './pages/Meetings';
import Settings from './pages/Settings';

const routes: { [key: string]: React.ComponentType } = {
  '/': Home,
  '/capture': Capture,
  '/leads': LeadList,
  '/kpis': KPIs,
  '/raffles': Raffles,
  '/materials': Materials,
  '/tv': TV,
  '/mc': MC,
  '/meetings': Meetings, // Deprecated but kept for routing
  '/settings': Settings,
  // Fallback to Home for unknown routes
};

const SimpleRouter = () => {
  const [hash, setHash] = React.useState(window.location.hash.substring(1) || '/');

  React.useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash.substring(1) || '/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  // Special cases for views that shouldn't have the dashboard layout
  if (hash === '/tv') {
    return <TV />;
  }
  if (hash === '/capture') {
    return <Capture />;
  }

  const Page = routes[hash] || Home;

  return (
    <DashboardLayout>
      <Page />
    </DashboardLayout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SimpleRouter />
    </AuthProvider>
  );
};

export default App;