import { CheckCircle2, PlayCircle, Users } from 'lucide-react';

const SummaryCard = ({ label, value, icon: Icon, iconClass }) => (
  <div className="tf-metric-card">
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${iconClass}`}>
      <Icon size={20} aria-hidden="true" />
    </span>
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tabular-nums text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  </div>
);

const WorkerSummary = ({ workers }) => {
  const healthy = workers.filter(
    (worker) => String(worker.status).toLowerCase() === 'healthy',
  ).length;
  const activeJobs = workers.reduce(
    (sum, worker) => sum + (Number(worker.activeJobs) || 0),
    0,
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <SummaryCard
        label="Workers"
        value={workers.length}
        icon={Users}
        iconClass="bg-indigo-500/15 text-indigo-400"
      />
      <SummaryCard
        label="Healthy"
        value={healthy}
        icon={CheckCircle2}
        iconClass="bg-emerald-500/15 text-emerald-400"
      />
      <SummaryCard
        label="Active Jobs"
        value={activeJobs}
        icon={PlayCircle}
        iconClass="bg-amber-500/15 text-amber-400"
      />
    </div>
  );
};

export default WorkerSummary;
