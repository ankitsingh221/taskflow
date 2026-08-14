import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const TechnicalDetails = ({ job }) => {
  const [open, setOpen] = useState(false);
  const hasBullmqId = Boolean(job.bullmqJobId);
  const hasIdempotencyKey = Boolean(job.idempotencyKey);

  if (!hasBullmqId && !hasIdempotencyKey) return null;

  return (
    <div className="tf-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1 rounded text-sm font-medium text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        aria-expanded={open}
      >
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        Technical Details
      </button>
      {open && (
        <dl className="mt-3 divide-y divide-gray-800">
          {hasBullmqId && (
            <div className="tf-detail-row">
              <dt className="tf-detail-label">BullMQ Job ID</dt>
              <dd className="tf-detail-value font-mono text-xs">{job.bullmqJobId}</dd>
            </div>
          )}
          {hasIdempotencyKey && (
            <div className="tf-detail-row">
              <dt className="tf-detail-label">Idempotency Key</dt>
              <dd className="tf-detail-value font-mono text-xs">{job.idempotencyKey}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
};

export default TechnicalDetails;
