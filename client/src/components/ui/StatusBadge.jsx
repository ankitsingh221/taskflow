const STATUS_MAP = {
  COMPLETED: { className: 'tf-status-success', dot: 'bg-emerald-400' },
  HEALTHY: { className: 'tf-status-success', dot: 'bg-emerald-400' },
  ACTIVE: { className: 'tf-status-info', dot: 'bg-indigo-400' },
  STARTING: { className: 'tf-status-info', dot: 'bg-indigo-400' },
  STOPPING: { className: 'tf-status-neutral', dot: 'bg-gray-400' },
  FAILED: { className: 'tf-status-danger', dot: 'bg-red-400' },
  DLQ: { className: 'tf-status-danger', dot: 'bg-red-400' },
  UNHEALTHY: { className: 'tf-status-danger', dot: 'bg-red-400' },
  STALE: { className: 'tf-status-danger', dot: 'bg-red-400' },
  STOPPED: { className: 'tf-status-danger', dot: 'bg-red-400' },
  WAITING: { className: 'tf-status-neutral', dot: 'bg-gray-400' },
  DELAYED: { className: 'tf-status-neutral', dot: 'bg-gray-400' },
  SCHEDULED: { className: 'tf-status-neutral', dot: 'bg-gray-400' },
  BLOCKED: { className: 'tf-status-warning', dot: 'bg-amber-400' },
  RETRYING: { className: 'tf-status-warning', dot: 'bg-amber-400' },
  CANCELED: { className: 'tf-status-muted', dot: 'bg-gray-600' },
};

const StatusBadge = ({ status }) => {
  const key = String(status ?? '').toUpperCase();
  const style = STATUS_MAP[key] ?? { className: 'tf-status-neutral', dot: 'bg-gray-400' };

  return (
    <span className={`tf-status ${style.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {status}
    </span>
  );
};

export default StatusBadge;
