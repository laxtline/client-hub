import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useTheme } from '../../hooks/useTheme.js';
import { roleLabel } from '../../utils/helpers.js';
import Logo from '../common/Logo.jsx';
import NotificationBell from '../notifications/NotificationBell.jsx';
import { SidebarLinks } from './Sidebar.jsx';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu after navigation.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="relative flex items-center justify-between border-b bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 md:hidden"
        >
          ☰
        </button>
        <Logo />
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle dark mode"
          className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {user?.role !== 'demo' && <NotificationBell />}
        {!user?.isDemo && user?.role !== 'demo' && (
          <Link to="/change-password" className="text-sm text-brand-blue hover:underline">Change password</Link>
        )}

        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{user?.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{roleLabel(user?.role)}</p>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Logout
        </button>
      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 top-[57px] z-30 bg-black/40 md:hidden"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 right-0 top-full z-40 border-b bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 md:hidden">
            <div className="border-b px-4 py-3 dark:border-gray-700 sm:hidden">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{roleLabel(user?.role)}</p>
            </div>
            <SidebarLinks onNavigate={() => setMenuOpen(false)} />
          </div>
        </>
      )}
    </header>
  );
}
