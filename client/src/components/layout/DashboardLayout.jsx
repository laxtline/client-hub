// DashboardLayout — the shared app shell (Navbar + Sidebar) wrapped around every
// authenticated page. CONCEPT (<Outlet/>): React Router renders the matched child
// route in place of the Outlet, so the shell stays put while pages change.
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
