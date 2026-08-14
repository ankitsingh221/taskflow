const ITEMS = [
  { label: 'Waiting', key: 'waiting', bar: 'bg-indigo-500' },
  { label: 'Active', key: 'active', bar: 'bg-blue-500' },
  { label: 'Delayed', key: 'delayed', bar: 'bg-amber-500' },
  { label: 'Completed', key: 'completed', bar: 'bg-emerald-500' },
  { label: 'Failed', key: 'failed', bar: 'bg-red-500' },
  { label: 'Canceled', key: 'canceled', bar: 'bg-gray-500' },
];

const QueueDistribution = ({ metrics }) => {
  const counts = ITEMS.map((item) => ({
    ...item,
    value:
      item.key === 'delayed'
        ? metrics.queue?.delayed ?? 0
        : metrics.jobs?.[item.key] ?? 0,
  }));

  const max = Math.max(1, ...counts.map((item) => item.value));
  const total = counts.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="tf-card h-full">
      <h3 className="tf-section-title">Queue Distribution</h3>
      <p className="mt-1 text-sm text-gray-400">
        {total.toLocaleString()} job(s) across states.
      </p>

      <ul className="mt-4 space-y-4">
        {counts.map((item) => (
          <li key={item.key}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">{item.label}</span>
              <span className="font-medium tabular-nums text-gray-200">
                {item.value.toLocaleString()}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
              <div
                className={`h-1.5 rounded-full ${item.bar}`}
                style={{ width: `${Math.max(2, Math.round((item.value / max) * 100))}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default QueueDistribution;
