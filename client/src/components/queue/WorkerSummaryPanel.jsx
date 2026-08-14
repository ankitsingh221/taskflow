import { Link } from 'react-router';
import { ArrowRight, CheckCircle2, CircleDashed, ServerCrash } from 'lucide-react';

const ROWS = [
  { label: 'Healthy', key: 'healthy', icon: CheckCircle2, iconClass: 'text-emerald-400' },
  { label: 'Stale', key: 'stale', icon: ServerCrash, iconClass: 'text-red-400' },
  { label: 'Stopped', key: 'stopped', icon: CircleDashed, iconClass: 'text-gray-400' },
];

const WorkerSummaryPanel = ({ workers }) => (
  <div className="tf-card h-full">
    <div className="flex items-center justify-between gap-2">
      <h3 className="tf-section-title">Workers</h3>
      <Link
        to="/workers"
        className="inline-flex shrink-0 items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
      >
        View Workers
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
    <p className="mt-1 text-sm text-gray-400">
      {workers.total.toLocaleString()} registered worker(s).
    </p>

    <ul className="mt-4 space-y-3">
      {ROWS.map(({ label, key, icon: Icon, iconClass }) => (
        <li key={key} className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-gray-300">
            <Icon size={16} className={iconClass} aria-hidden="true" />
            {label}
          </span>
          <span className="font-medium tabular-nums text-gray-200">
            {workers[key].toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

export default WorkerSummaryPanel;