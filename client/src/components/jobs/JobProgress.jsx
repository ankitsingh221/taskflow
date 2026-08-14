const JobProgress = ({ value, completed = false }) => {
  const clamped = Math.max(0, Math.min(100, value ?? 0));
  const barColor = completed ? 'bg-emerald-500' : 'bg-indigo-500';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-gray-800" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-400">{clamped}%</span>
    </div>
  );
};

export default JobProgress;
