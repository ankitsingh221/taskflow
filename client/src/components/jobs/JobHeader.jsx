import { RefreshCw } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import CopyButton from './CopyButton';

const JobHeader = ({ job, refreshing, canCancel, onRefresh, onCancel }) => (
  <div className="tf-card">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="break-words text-xl font-semibold text-white">{job.name}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-gray-400">{job.jobId}</span>
          <CopyButton text={job.jobId} label="Copy" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={job.status} />
          {job.isDeadLetter && <span className="tf-status tf-status-danger">DEAD LETTER</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="tf-button tf-button-secondary"
          aria-label="Refresh job"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
        {canCancel && (
          <button type="button" onClick={onCancel} className="tf-button tf-button-danger">
            Cancel Job
          </button>
        )}
      </div>
    </div>
  </div>
);

export default JobHeader;
