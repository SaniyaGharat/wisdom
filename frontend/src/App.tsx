import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { ClientForm } from './pages/ClientForm';
import { SupplierForm } from './pages/SupplierForm';
import { ClientDashboard } from './pages/ClientDashboard';
import { SupplierDashboard } from './pages/SupplierDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { useSession } from './context/SessionContext';

export function App() {
  const { activeClientId, activeSupplierId } = useSession();

  // Simple, robust hash-based & pathname routing that works seamlessly in local dev or production builds
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || window.location.pathname || '/';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      setCurrentPath(hash || '/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (path: string) => {
    window.location.hash = path;
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Route matching helper
  const renderRoute = () => {
    // 1. Home
    if (currentPath === '/' || currentPath === '') {
      return <Home onNavigate={navigate} />;
    }

    // 2. Client Routes
    if (currentPath === '/clients/new') {
      return <ClientForm onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/clients/edit/')) {
      const id = currentPath.replace('/clients/edit/', '');
      return <ClientForm clientId={id} onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/clients/') && currentPath.endsWith('/dashboard')) {
      const id = currentPath.replace('/clients/', '').replace('/dashboard', '');
      return <ClientDashboard clientId={id} onNavigate={navigate} />;
    }
    if (currentPath === '/clients') {
      if (activeClientId) {
        return <ClientDashboard clientId={activeClientId} onNavigate={navigate} />;
      }
      return <ClientForm onNavigate={navigate} />;
    }

    // 3. Supplier Routes
    if (currentPath === '/suppliers/new') {
      return <SupplierForm onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/suppliers/edit/')) {
      const id = currentPath.replace('/suppliers/edit/', '');
      return <SupplierForm supplierId={id} onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/suppliers/') && currentPath.endsWith('/dashboard')) {
      const id = currentPath.replace('/suppliers/', '').replace('/dashboard', '');
      return <SupplierDashboard supplierId={id} onNavigate={navigate} />;
    }
    if (currentPath === '/suppliers') {
      if (activeSupplierId) {
        return <SupplierDashboard supplierId={activeSupplierId} onNavigate={navigate} />;
      }
      return <SupplierForm onNavigate={navigate} />;
    }

    // 4. Admin
    if (currentPath === '/admin') {
      return <AdminDashboard onNavigate={navigate} />;
    }

    // Fallback Home
    return <Home onNavigate={navigate} />;
  };

  return (
    <div className="app-container">
      <Navbar currentPath={currentPath} onNavigate={navigate} />
      <main className="main-content">{renderRoute()}</main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          background: 'rgba(99, 102, 241, 0.03)',
        }}
      >
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <strong>MatchIQ AI Matchmaking Platform</strong> &copy; {new Date().getFullYear()} &bull; AI-Powered Client–Supplier Matchmaking
          </div>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/admin')}>
              Platform Intelligence
            </span>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/clients/new')}>
              Post Requirement
            </span>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/suppliers/new')}>
              Publish Capacity
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
