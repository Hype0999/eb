import { useEffect, useState } from 'react';
import { VisitorPage } from './pages/VisitorPage';
import { AdminPage } from './pages/AdminPage';

function isAdminLocation(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.pathname.endsWith('/admin') ||
    window.location.pathname.endsWith('/admin/') ||
    window.location.hash === '#/admin'
  );
}

export function App() {
  const [isAdmin, setIsAdmin] = useState<boolean>(isAdminLocation);

  useEffect(() => {
    const syncRoute = () => setIsAdmin(isAdminLocation());
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);

    // Hidden keyboard shortcut (Alt+A) for exhibition staff
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        window.location.hash = '#/admin';
        setIsAdmin(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const navigateToVisitor = () => {
    window.location.hash = '';
    setIsAdmin(false);
  };

  if (isAdmin) {
    return <AdminPage onBackToVisitor={navigateToVisitor} />;
  }

  return <VisitorPage />;
}

export default App;
