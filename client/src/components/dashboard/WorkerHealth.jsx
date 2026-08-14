import StatusBadge from '../ui/StatusBadge';

const STATUS_LABELS = {
  healthy: 'Healthy',
  starting: 'Starting',
  stopping: 'Stopping',
  stopped: 'Offline',
  stale: 'Unhealthy',
};

const timeAgo = (iso) => {
  if (!iso) return 'Never';
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const WorkerCard = ({ worker }) => {
  const statusLabel = STATUS_LABELS[worker.status] ?? worker.status;

  return (
    <div className="tf-card">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-white">{worker.workerId}</p>
        <StatusBadge status={statusLabel} />
      </div>
      <div className="tf-divider" />
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-gray-400">Concurrency</dt>
          <dd className="text-gray-200">{worker.concurrency}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-gray-400">Active Jobs</dt>
          <dd className="text-gray-200">{worker.activeJobs}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-gray-400">Last Heartbeat</dt>
          <dd className="text-gray-200">{timeAgo(worker.lastHeartbeat)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-gray-400">Started</dt>
          <dd className="text-gray-200">{timeAgo(worker.startedAt)}</dd>
        </div>
      </dl>
    </div>
  );
};

const WorkerHealth = ({ workers }) => {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Worker Health</h3>
          <p className="mt-1 text-sm text-gray-400">Registered workers and their current status.</p>
        </div>
      </div>

      {workers.length === 0 ? (
        <div className="tf-card mt-4">
          <p className="text-sm text-gray-400">No workers are currently registered.</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workers.map((worker) => (
            <WorkerCard key={worker.id} worker={worker} />
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkerHealth;
