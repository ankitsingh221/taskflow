import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const TOOLTIP_STYLE = {
  backgroundColor: '#111827',
  border: '1px solid #374151',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#e5e7eb',
};

const COLORS = {
  waiting: '#64748b',
  active: '#6366f1',
  completed: '#10b981',
  failed: '#ef4444',
  canceled: '#9ca3af',
  deadLetter: '#b91c1c',
};

const JobStatusChart = ({ jobs }) => {
  const data = [
    { name: 'Waiting', value: jobs.waiting, color: COLORS.waiting },
    { name: 'Active', value: jobs.active, color: COLORS.active },
    { name: 'Completed', value: jobs.completed, color: COLORS.completed },
    { name: 'Failed', value: jobs.failed, color: COLORS.failed },
    { name: 'Canceled', value: jobs.canceled, color: COLORS.canceled },
    { name: 'DLQ', value: jobs.deadLetter, color: COLORS.deadLetter },
  ].filter((item) => item.value > 0);

  if (data.length === 0) {
    return null;
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="tf-card h-full">
      <h3 className="text-base font-semibold text-white">Job Status</h3>
      <p className="mt-1 text-sm text-gray-400">Distribution across all jobs.</p>

      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
        <div className="relative h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={78}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold text-white">{total.toLocaleString()}</span>
            <span className="text-xs text-gray-500">Total</span>
          </div>
        </div>

        <ul className="w-full space-y-2">
          {data.map((entry) => (
            <li key={entry.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-300">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                  aria-hidden="true"
                />
                {entry.name}
              </span>
              <span className="font-medium text-gray-200">{entry.value.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default JobStatusChart;
