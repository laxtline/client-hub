// Sidebar — role-aware navigation. Admin/team see the management links; clients
// see only their portal links. The link list is built from the user's role so we
// never render a route the user can't access.
//
// On screens below `md` the rail is hidden and Navbar renders the same links in
// a slide-out drawer instead (`mobile` prop) — before that, phone users had no
// way to leave the page they landed on.
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { isClient } from '../../utils/roleGuards.js';

// Links for admin + team_member.
const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard', icon: '📊' },
  { to: '/clients', label: 'Clients', icon: '👥' },
  { to: '/projects', label: 'Projects', icon: '📁' },
  { to: '/my-tasks', label: 'My Tasks', icon: '✅' },
  { to: '/invoices', label: 'Invoices', icon: '🧾' },
];

// Links for client-role users (their own portal).
const CLIENT_LINKS = [
  { to: '/client', label: 'My Dashboard', icon: '📊' },
  { to: '/projects', label: 'My Projects', icon: '📁' },
  { to: '/invoices', label: 'My Invoices', icon: '🧾' },
];

// Shared link renderer so the desktop rail and the mobile drawer can never
// drift apart in styling or in which routes they expose.
export function SidebarLinks({ onNavigate }) {
  const { user } = useAuth();
  const links = isClient(user) ? CLIENT_LINKS : ADMIN_LINKS;

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
