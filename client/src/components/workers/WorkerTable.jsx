import WorkerRow from './WorkerRow';

const WorkerTable = ({ workers }) => (
  <>
    <div className="hidden md:block">
      <div className="tf-card overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500">
              <th scope="col" className="px-5 py-3 font-medium">
                Worker ID
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Active Jobs
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Concurrency
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Last Heartbeat
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {workers.map((worker) => (
              <WorkerRow key={worker.id ?? worker.workerId} worker={worker} />
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="space-y-4 md:hidden">
      {workers.map((worker) => (
        <WorkerRow key={worker.id ?? worker.workerId} worker={worker} variant="card" />
      ))}
    </div>
  </>
);

export default WorkerTable;
