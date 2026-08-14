import StatusBadge from '../ui/StatusBadge';
import { formatDuration, formatTime } from '../../utils/format';

const AttemptHistory = ({ attempts }) => {
  if (attempts.length === 0) return null;

  return (
    <div className="tf-card">
      <h3 className="tf-section-title">Attempt History</h3>
      <div className="mt-3 space-y-3">
        {attempts.map((attempt) => (
          <div key={attempt.id} className="rounded-md border border-gray-800 bg-gray-950 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-300">Attempt {attempt.attemptNumber}</span>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={attempt.status} />
                <span className="text-xs tabular-nums text-gray-500">{formatTime(attempt.startedAt)}</span>
                {attempt.duration != null && (
                  <span className="text-xs tabular-nums text-gray-500">{formatDuration(attempt.duration)}</span>
                )}
              </div>
            </div>
            {attempt.error && <p className="mt-2 break-words text-xs text-red-400">{attempt.error}</p>}
            <p className="mt-1 text-xs text-gray-500">Worker: {attempt.workerId}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttemptHistory;
