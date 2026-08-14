import { NavLink } from 'react-router';
import { Activity, BarChart3, Inbox, LayoutDashboard, ListTodo, PlusCircle, Users, X } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/jobs', label: 'Jobs', icon: ListTodo },
  { to: '/create-job', label: 'Create Job', icon: PlusCircle },
  { to: '/workers', label: 'Workers', icon: Users },
  { to: '/queue', label: 'Queue Monitor', icon: BarChart3 },
  { to: '/metrics', label: 'Metrics', icon: Activity },
  { to: '/dlq', label: 'Dead Letter Queue', icon: Inbox },
];

const Brand = ({ onClose }) => (
  <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-gray-800 px-5">
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">
        T
      </div>
      <div>
        <p className="text-sm font-semibold text-white">TaskFlow</p>
        <p className="text-xs text-gray-500">Distributed Job Queue</p>
      </div>
    </div>
    {onClose && (
      <button
        type="button"
        onClick={onClose}
        aria-label="Close navigation"
        className="rounded-md p-1 text-gray-400 hover:text-white lg:hidden"
      >
        <X size={18} />
      </button>
    )}
  </div>
);

const NavList = ({ onNavigate }) => (
  <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
    {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
      <NavLink
        key={to}
        to={to}
        end={end}
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-colors duration-150 ${
            isActive
              ? 'border-indigo-500 bg-gray-900 font-medium text-white'
              : 'border-transparent text-gray-400 hover:bg-gray-900/60 hover:text-gray-200'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <Icon size={18} className={isActive ? 'text-indigo-400' : 'text-gray-500'} />
            {label}
          </>
        )}
      </NavLink>
    ))}
  </nav>
);

const Sidebar = ({ open, onClose }) => (
  <>
    <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-800 bg-black lg:flex">
      <Brand />
      <NavList />
    </aside>

    {open && (
      <div className="fixed inset-0 z-40 lg:hidden">
        <div className="fixed inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
        <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-800 bg-black">
          <Brand onClose={onClose} />
          <NavList onNavigate={onClose} />
        </aside>
      </div>
    )}
  </>
);

export default Sidebar;
