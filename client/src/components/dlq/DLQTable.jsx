import { RotateCcw } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { formatDateTime } from '../../utils/format';

const COLUMNS = ['Job Name', 'Job ID', 'Status', 'Attempts', 'Failed At', 'Error', 'Actions'];

const DLQTable = ({ jobs, loading = false, retryingJobId, onRetry }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[820px] border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500">
          {COLUMNS.map((column) => (
            <th
              key={column}
              className={`px-4 py-3 font-medium ${column === 'Actions' ? 'text-right' : ''}`}
            >
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-800">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <tr key={index}>
                {Array.from({ length: COLUMNS.length }).map((_, cell) => (
                  <td key={cell} className="px-4 py-3">
                    <div className={`tf-skeleton h-4 ${cell === 0 ? 'w-32' : 'w-16'}`} />
                  </td>
                ))}
              </tr>
            ))
          : jobs.map((job) => {
              const retrying = retryingJobId === job.jobId;
              return (
                <tr key={job.id} className="transition-colors hover:bg-gray-900/60">
                  <td className="px-4 py-3">
                    <p className="max-w-[220px] truncate text-gray-200" title={job.name}>
                      {job.name}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="block max-w-[160px] truncate font-mono text-xs text-gray-400"
                      title={job.jobId}
                    >
                      {job.jobId}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status="DLQ" />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-gray-300">
                    {job.attempts} / {job.maxAttempts}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-400">
                    {formatDateTime(job.failedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <p
                      className="max-w-[260px] truncate text-xs text-red-400"
                      title={job.error ?? ''}
                    >
                      {job.error ?? '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => onRetry(job)}
                        disabled={retrying}
                        className="tf-button tf-button-secondary tf-button-sm"
                      >
                        <RotateCcw size={14} className={retrying ? 'animate-spin' : ''} />
                        {retrying ? 'Retrying...' : 'Retry'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
      </tbody>
    </table>
  </div>
);

export default DLQTable;
