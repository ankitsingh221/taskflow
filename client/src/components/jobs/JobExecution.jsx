import { formatDateTime, formatDuration } from '../../utils/format';

const computeDuration = (job) => {
  if (!job.startedAt) return '—';
  const end = job.completedAt ?? job.failedAt;
  if (!end) return 'Running';
  const durationMs = new Date(end).getTime() - new Date(job.startedAt).getTime();
  return formatDuration(durationMs);
};

const JobExecution = ({ job }) => (
  <div className="tf-card">
    <h3 className="tf-section-title">Execution</h3>
    <dl className="mt-2 divide-y divide-gray-800">
      <div className="tf-detail-row">
        <dt className="tf-detail-label">Created</dt>
        <dd className="tf-detail-value">{formatDateTime(job.createdAt)}</dd>
      </div>
      <div className="tf-detail-row">
        <dt className="tf-detail-label">Scheduled</dt>
        <dd className="tf-detail-value">{formatDateTime(job.scheduledAt)}</dd>
      </div>
      <div className="tf-detail-row">
        <dt className="tf-detail-label">Started</dt>
        <dd className="tf-detail-value">{formatDateTime(job.startedAt)}</dd>
      </div>
      <div className="tf-detail-row">
        <dt className="tf-detail-label">Completed</dt>
        <dd className="tf-detail-value">{formatDateTime(job.completedAt)}</dd>
      </div>
      <div className="tf-detail-row">
        <dt className="tf-detail-label">Failed</dt>
        <dd className="tf-detail-value">{formatDateTime(job.failedAt)}</dd>
      </div>
      <div className="tf-detail-row">
        <dt className="tf-detail-label">Duration</dt>
        <dd className="tf-detail-value tabular-nums">{computeDuration(job)}</dd>
      </div>
    </dl>
  </div>
);

export default JobExecution;
