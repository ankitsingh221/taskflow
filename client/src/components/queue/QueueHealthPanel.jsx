import { CheckCircle2, Gauge, Layers, Timer, XCircle } from 'lucide-react';
import { formatDuration } from '../../utils/format';

const QueueHealthPanel = ({ metrics }) => {
  const { total = 0, completed = 0, failed = 0 } = metrics.attempts ?? {};
  const { averageProcessingTimeMs, averageQueueLatencyMs } = metrics.performance ?? {};

  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const failureRate = total > 0 ? Math.round((failed / total) * 100) : 0;

  return (
    <div className="tf-card h-full">
      <h3 className="tf-section-title">Attempt Success</h3>
      <p className="mt-1 text-sm text-gray-400">Worker attempt outcomes across the queue.</p>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${successRate}%` }} />
      </div>
      <p className="mt-2 text-xs text-gray-500">
        {successRate}% success · {failureRate}% failure
      </p>

      <ul className="mt-4 space-y-3">
        <li className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2 text-gray-300">
            <Layers size={16} className="text-gray-500" aria-hidden="true" />
            Total Attempts
          </span>
          <span className="font-medium tabular-nums text-gray-200">{total.toLocaleString()}</span>
        </li>
        <li className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2 text-gray-300">
            <CheckCircle2 size={16} className="text-emerald-400" aria-hidden="true" />
            Completed
          </span>
          <span className="font-medium tabular-nums text-gray-200">{completed.toLocaleString()}</span>
        </li>
        <li className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2 text-gray-300">
            <XCircle size={16} className="text-red-400" aria-hidden="true" />
            Failed
          </span>
          <span className="font-medium tabular-nums text-gray-200">{failed.toLocaleString()}</span>
        </li>
        <li className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2 text-gray-300">
            <Timer size={16} className="text-gray-500" aria-hidden="true" />
            Avg Processing Time
          </span>
          <span className="font-medium tabular-nums text-gray-200">
            {formatDuration(averageProcessingTimeMs)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2 text-gray-300">
            <Gauge size={16} className="text-gray-500" aria-hidden="true" />
            Avg Queue Latency
          </span>
          <span className="font-medium tabular-nums text-gray-200">
            {formatDuration(averageQueueLatencyMs)}
          </span>
        </li>
      </ul>
    </div>
  );
};

export default QueueHealthPanel;
