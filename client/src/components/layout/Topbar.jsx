import { useLocation } from 'react-router';
import { Menu } from 'lucide-react';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/jobs': 'Jobs',
  '/create-job': 'Create Job',
  '/workers': 'Workers',
  '/queue': 'Queue Monitor',
  '/metrics': 'Metrics',
  '/dlq': 'Dead Letter Queue',
};

const Topbar = ({ onMenuClick }) => {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] ?? 'TaskFlow';

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-800 bg-gray-950/80 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white lg:hidden"
        >
          <Menu size={20} />
        </button>
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
        System Operational
      </div>
    </header>
  );
};

export default Topbar;
