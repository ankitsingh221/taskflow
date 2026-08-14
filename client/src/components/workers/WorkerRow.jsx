import WorkerStatusBadge from './WorkerStatusBadge';
import CopyButton from '../jobs/CopyButton';
import { formatDateTime, formatRelativeTime } from '../../utils/format';

const WorkerRowCard = ({ worker }) => (
  <div className="tf-card">
    <div className="flex items-start justify-between gap-2">
      <p className="truncate text-sm font-medium text-white" title={worker.workerId}>
        {worker.workerId}
      </p>
      <WorkerStatusBadge status={worker.status} />
    </div>
    <div className="tf-divider" />
    <dl className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <dt className="text-gray-400">Active Jobs</dt>
        <dd className="tabular-nums text-gray-200">{worker.activeJobs ?? '—'}</dd>
      </div>
      <div className="flex items-center justify-between gap-2">
        <dt className="text-gray-400">Concurrency</dt>
        <dd className="tabular-nums text-gray-200">{worker.concurrency ?? '—'}</dd>
      </div>
      <div className="flex items-center justify-between gap-2">
        <dt className="text-gray-400">Last Heartbeat</dt>
        <dd className="text-gray-200">
          <span title={formatDateTime(worker.lastHeartbeat)}>
            {formatRelativeTime(worker.lastHeartbeat)}
          </span>
        </dd>
      </div>
    </dl>
  </div>
);

const WorkerRowTable = ({ worker }) => (
  <tr>
    <td className="px-5 py-3">
      <div className="flex items-center gap-2">
        <span
          className="max-w-[220px] truncate font-medium text-gray-200"
          title={worker.workerId}
        >
          {worker.workerId}
        </span>
        <CopyButton text={worker.workerId} label="Copy" />
      </div>
    </td>
    <td className="px-5 py-3">
      <WorkerStatusBadge status={worker.status} />
    </td>
    <td className="px-5 py-3 tabular-nums text-gray-200">{worker.activeJobs ?? '—'}</td>
    <td className="px-5 py-3 tabular-nums text-gray-200">{worker.concurrency ?? '—'}</td>
    <td className="px-5 py-3 text-gray-300">
      <span title={formatDateTime(worker.lastHeartbeat)}>
        {formatRelativeTime(worker.lastHeartbeat)}
      </span>
    </td>
  </tr>
);

const WorkerRow = ({ worker, variant = 'table' }) =>
  variant === 'card' ? (
    <WorkerRowCard worker={worker} />
  ) : (
    <WorkerRowTable worker={worker} />
  );

export default WorkerRow;
