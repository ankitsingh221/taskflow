import { Link } from 'react-router';
import StatusBadge from '../ui/StatusBadge';

const Dependencies = ({ dependencies }) => {
  if (dependencies.length === 0) return null;

  return (
    <div className="tf-card">
      <h3 className="tf-section-title">Dependencies</h3>
      <div className="mt-3 space-y-2">
        {dependencies.map((dependency) => {
          const dep = dependency.dependsOn;
          return (
            <Link
              key={dependency.id}
              to={`/jobs/${dep.jobId}`}
              className="flex items-center justify-between gap-3 rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm transition-colors hover:border-gray-700"
            >
              <span className="min-w-0">
                <span className="block truncate text-gray-200">{dep.name}</span>
                <span className="block truncate font-mono text-xs text-gray-500">{dep.jobId}</span>
              </span>
              <StatusBadge status={dep.status} />
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Dependencies;
