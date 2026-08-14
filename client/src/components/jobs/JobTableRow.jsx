import StatusBadge from '../ui/StatusBadge';
import JobProgress from './JobProgress';

const CANCELABLE_STATUSES = ['waiting', 'scheduled', 'active', 'retrying'];

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const JobTableRow = ({ job, cancelling = false, onView, onCancel }) => {
  const status = job.isDeadLetter ? 'DLQ' : job.status;
  const canCancel = !job.isDeadLetter && CANCELABLE_STATUSES.includes(job.status);
  const attempts = job.maxAttempts ? `${job.attempts ?? 0} / ${job.maxAttempts}` : String(job.attempts ?? 0);

  return (
    <tr className="transition-colors hover:bg-gray-900/60">
      <td className="px-4 py-3">
        <p className="max-w-[220px] truncate text-gray-200" title={job.name}>
          {job.name}
        </p>
      </td>
      <td className="px-4 py-3">
        <span className="block max-w-[160px] truncate font-mono text-xs text-gray-400" title={job.jobId}>
          {job.jobId}
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={status} />
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded px-2 py-0.5 text-xs ${
            job.priority <= 3 ? 'bg-indigo-500/10 text-indigo-400' : 'bg-gray-800 text-gray-300'
          }`}
        >
          P{job.priority}
        </span>
      </td>
      <td className="px-4 py-3">
        <JobProgress value={job.progress} completed={job.status === 'completed'} />
      </td>
      <td className="px-4 py-3 tabular-nums text-gray-300">{attempts}</td>
      <td className="px-4 py-3 whitespace-nowrap text-gray-400">{formatDate(job.createdAt)}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onView(job)} className="tf-button tf-button-secondary tf-button-sm">
            View
          </button>
          {canCancel && (
            <button
              type="button"
              onClick={() => onCancel(job)}
              disabled={cancelling}
              className="tf-button tf-button-danger tf-button-sm"
            >
              {cancelling ? 'Canceling...' : 'Cancel'}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default JobTableRow;
