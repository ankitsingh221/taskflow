import StatusBadge from '../ui/StatusBadge';

const JobInfo = ({ job }) => (
  <div className="tf-card">
    <h3 className="tf-section-title">Job Information</h3>
    <dl className="mt-2 divide-y divide-gray-800">
      <div className="tf-detail-row">
        <dt className="tf-detail-label">Status</dt>
        <dd className="tf-detail-value">
          <StatusBadge status={job.status} />
        </dd>
      </div>
      <div className="tf-detail-row">
        <dt className="tf-detail-label">Priority</dt>
        <dd className="tf-detail-value">P{job.priority}</dd>
      </div>
      <div className="tf-detail-row">
        <dt className="tf-detail-label">Attempts</dt>
        <dd className="tf-detail-value tabular-nums">
          {job.attempts} / {job.maxAttempts}
        </dd>
      </div>
      <div className="tf-detail-row">
        <dt className="tf-detail-label">Max Attempts</dt>
        <dd className="tf-detail-value tabular-nums">{job.maxAttempts}</dd>
      </div>
      <div className="tf-detail-row">
        <dt className="tf-detail-label">Dead Letter</dt>
        <dd className={`tf-detail-value ${job.isDeadLetter ? 'text-red-400' : ''}`}>
          {job.isDeadLetter ? 'Yes' : 'No'}
        </dd>
      </div>
    </dl>
  </div>
);

export default JobInfo;
