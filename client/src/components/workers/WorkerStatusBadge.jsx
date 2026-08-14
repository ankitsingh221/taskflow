const STATUS_CONFIG = {
  healthy: { label: 'Healthy', className: 'tf-status-success', dot: 'bg-emerald-400' },
  starting: { label: 'Starting', className: 'tf-status-info', dot: 'bg-indigo-400' },
  stopping: { label: 'Stopping', className: 'tf-status-warning', dot: 'bg-amber-400' },
  stopped: { label: 'Offline', className: 'tf-status-neutral', dot: 'bg-gray-400' },
  stale: { label: 'Unhealthy', className: 'tf-status-danger', dot: 'bg-red-400' },
};

const WorkerStatusBadge = ({ status }) => {
  const key = String(status ?? '').toLowerCase();
  const config = STATUS_CONFIG[key] ?? {
    label: status ?? 'Unknown',
    className: 'tf-status-neutral',
    dot: 'bg-gray-400',
  };

  return (
    <span className={`tf-status ${config.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      {config.label}
    </span>
  );
};

export default WorkerStatusBadge;
