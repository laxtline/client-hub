import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { isClient } from '../../utils/helpers.js';

const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard', icon: '📊' },
  { to: '/clients', label: 'Clients', icon: '👥' },
  { to: '/projects', label: 'Projects', icon: '📁' },
  { to: '/my-tasks', label: 'My Tasks', icon: '✅' },
  { to: '/invoices', label: 'Invoices', icon: '🧾' },
  { to: '/accounts', label: 'Team & Accounts', icon: '🔑' },
];

const CLIENT_LINKS = [
  { to: '/client', label: 'My Dashboard', icon: '📊' },
  { to: '/projects', label: 'My Projects', icon: '📁' },
  { to: '/invoices', label: 'My Invoices', icon: '🧾' },
];

// Use the same links in the sidebar and mobile menu.
export function SidebarLinks({ onNavigate }) {
  const { user } = useAuth();
  const links = user?.role === 'demo' ? [{ to: '/demo', label: 'Demo Workspace', icon: '📊' }]
    : user?.role === 'team_member' ? [
      { to: '/team', label: 'My Dashboard', icon: '📊' },
      { to: '/projects', label: 'Assigned Projects', icon: '📁' },
    ] : isClient(user) ? CLIENT_LINKS : ADMIN_LINKS;

  return (
    <nav className="flex flex-col gap-1 p-4">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-brand-light text-brand-navy dark:bg-gray-700 dark:text-white'
                : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
            }`
          }
        >
          <span>{link.icon}</span>
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r bg-white dark:border-gray-700 dark:bg-gray-800 md:block">
      <SidebarLinks />
    </aside>
  );
}
