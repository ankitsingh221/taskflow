import { formatDateTime, formatRelativeTime, formatTime } from '../../utils/format';

const DOT_COLORS = {
  created: 'bg-indigo-400',
  scheduled: 'bg-indigo-400',
  started: 'bg-blue-400',
  running: 'bg-blue-400',
  retry: 'bg-amber-400',
  retrying: 'bg-amber-400',
  'attempt-completed': 'bg-emerald-400',
  completed: 'bg-emerald-400',
  failed: 'bg-red-400',
  dlq: 'bg-red-400',
  canceled: 'bg-gray-500',
};

const JobActivityTimeline = ({ events = [] }) => {
  if (events.length === 0) {
    return (
      <div className="tf-card">
        <h3 className="tf-section-title">Activity</h3>
        <p className="mt-2 text-sm text-gray-400">No activity history available.</p>
      </div>
    );
  }

  return (
    <div className="tf-card">
      <h3 className="tf-section-title">Activity</h3>
      <ol className="mt-4">
        {events.map((event, index) => (
          <li key={`${event.kind}-${index}`} className="tf-timeline-item">
            <div className="tf-timeline-rail">
              <span
                className={`tf-timeline-dot ${DOT_COLORS[event.kind] ?? 'bg-gray-500'}`}
                aria-hidden="true"
              />
              {index < events.length - 1 && <span className="tf-timeline-line" aria-hidden="true" />}
            </div>
            <div className="tf-timeline-content">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="tf-timeline-title">{event.title}</span>
                <span
                  className="tf-timeline-time"
                  title={event.time ? formatDateTime(event.time) : undefined}
                >
                  {event.time
                    ? `${formatTime(event.time)} · ${formatRelativeTime(event.time)}`
                    : '—'}
                </span>
              </div>
              {event.error && <p className="tf-timeline-error">{event.error}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default JobActivityTimeline;
