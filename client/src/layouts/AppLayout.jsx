import { NavLink, Outlet } from 'react-router';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/create-job', label: 'Create Job' },
  { to: '/workers', label: 'Workers' },
  { to: '/metrics', label: 'Metrics' },
  { to: '/dlq', label: 'Dead Letter Queue' },
];

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <nav className="border-b border-gray-700 bg-gray-800">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-4 px-4 py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                isActive
                  ? 'font-medium text-emerald-400'
                  : 'text-gray-400 hover:text-gray-200'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
