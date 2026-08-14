import { Link } from 'react-router';
import StatusBadge from '../ui/StatusBadge';
import { formatRelativeTime } from '../../utils/format';

const RecentActivity = ({ jobs }) => (
  <div className="tf-card overflow-hidden p-0">
    <div className="px-5 pt-5">
      <h3 className="tf-section-title">Recent Activity</h3>
      <p className="mt-1 text-sm text-gray-400">Latest jobs created across the queue.</p>
    </div>

    {jobs.length === 0 ? (
      <p className="px-5 pb-5 pt-4 text-sm text-gray-500">No recent job activity.</p>
    ) : (
      <ul className="mt-3 divide-y divide-gray-800">
        {jobs.map((job) => (
          <li key={job.jobId}>
            <Link
              to={`/jobs/${job.jobId}`}
              className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-gray-800/60"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="truncate text-sm font-medium text-gray-200">{job.name}</span>
                <span className="shrink-0 text-xs text-gray-500">
                  {formatRelativeTime(job.createdAt)}
                </span>
              </span>
              <StatusBadge status={job.status} />
            </Link>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default RecentActivity;
