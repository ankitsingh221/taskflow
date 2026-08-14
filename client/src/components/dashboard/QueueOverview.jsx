const ITEMS = [
  { label: 'Waiting', key: 'waiting', bar: 'bg-slate-500' },
  { label: 'Active', key: 'active', bar: 'bg-indigo-500' },
  { label: 'Delayed', key: 'delayed', bar: 'bg-slate-600' },
  { label: 'Failed', key: 'failed', bar: 'bg-red-500' },
  { label: 'Completed', key: 'completed', bar: 'bg-emerald-500' },
  { label: 'Paused', key: 'paused', bar: 'bg-gray-600' },
];

const QueueOverview = ({ queue }) => {
  const counts = ITEMS.map((item) => ({
    ...item,
    value: queue?.[item.key] ?? 0,
  }));

  const max = Math.max(1, ...counts.map((item) => item.value));

  return (
    <div className="tf-card h-full">
      <h3 className="text-base font-semibold text-white">Queue Overview</h3>
      <p className="mt-1 text-sm text-gray-400">Current queue state from Redis.</p>

      <ul className="mt-4 space-y-4">
        {counts.map((item) => (
          <li key={item.key}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">{item.label}</span>
              <span className="font-medium text-gray-200">{item.value.toLocaleString()}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-800">
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

export default QueueOverview;
