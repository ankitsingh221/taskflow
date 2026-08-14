import JobTableRow from './JobTableRow';

const COLUMNS = ['Job Name', 'Job ID', 'Status', 'Priority', 'Progress', 'Attempts', 'Created', 'Actions'];

const JobsTable = ({ jobs, loading, cancellingJobId, onView, onCancel }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500">
            {COLUMNS.map((column) => (
              <th key={column} className={`px-4 py-3 font-medium ${column === 'Actions' ? 'text-right' : ''}`}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {loading
            ? Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  {Array.from({ length: 8 }).map((_, cell) => (
                    <td key={cell} className="px-4 py-3">
                      <div className={`tf-skeleton h-4 ${cell === 0 ? 'w-32' : 'w-16'}`} />
                    </td>
                  ))}
                </tr>
              ))
            : jobs.map((job) => (
                <JobTableRow
                  key={job.id}
                  job={job}
                  cancelling={cancellingJobId === job.jobId}
                  onView={onView}
                  onCancel={onCancel}
                />
              ))}
        </tbody>
      </table>
    </div>
  );
};

export default JobsTable;
