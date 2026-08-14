import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Gauge,
  Hourglass,
  Inbox,
  Layers,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Repeat,
  Timer,
  XCircle,
} from 'lucide-react';
import { getMetrics } from '../api/metrics';
import { getErrorMessage } from '../utils/errors';
import { formatDuration } from '../utils/format';
import StatCard from '../components/dashboard/StatCard';
import WorkerSummaryPanel from '../components/queue/WorkerSummaryPanel';

const POLL_INTERVAL_MS = 5000;

const MetricList = ({ title, description, rows }) => (
  <div className="tf-card h-full">
    <h3 className="tf-section-title">{title}</h3>
    {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
    <ul className="mt-4 space-y-3">
      {rows.map(({ label, value, icon: Icon, iconClass }) => (
        <li key={label} className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2 text-gray-300">
            <Icon size={16} className={iconClass ?? 'text-gray-500'} aria-hidden="true" />
            {label}
          </span>
          <span className="font-medium tabular-nums text-gray-200">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

const Metrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);

  const loadData = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;

    getMetrics()
      .then((data) => {
        setMetrics(data);
        setError(null);
      })
      .catch((err) => {
        console.error('[metrics] Failed to load metrics:', err);
        setError(err);
      })
      .finally(() => {
        inFlight.current = false;
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = window.setInterval(() => loadData(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadData]);

  const handleRefresh = () => {
    if (inFlight.current) return;
    setRefreshing(true);
    loadData();
  };

  const handleRetry = () => {
    setLoading(true);
    loadData();
  };

  const renderHeader = (
    <div className="tf-page-header flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="tf-page-title">Metrics</h1>
        <p className="tf-page-description">Track queue throughput and system health.</p>
      </div>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing || loading}
        className="tf-button tf-button-secondary"
        aria-label="Refresh metrics"
      >
        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        {refreshing ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );

  const renderSkeleton = () => (
    <div className="tf-page">
      {renderHeader}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatCard key={index} loading />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="tf-card">
            <div className="tf-skeleton h-4 w-28" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 6 }).map((__, inner) => (
                <div key={inner} className="tf-skeleton h-4 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading && !metrics) return renderSkeleton();

  if (error && !metrics) {
    return (
      <div className="tf-page">
        {renderHeader}
        <div className="tf-card">
          <div className="flex items-center gap-2">
            <XCircle size={18} className="text-red-400" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-white">Unable to load metrics</h2>
          </div>
          <p className="mt-2 text-sm text-gray-400">
            The TaskFlow monitoring API could not be reached.
          </p>
          <p className="mt-1 text-sm text-gray-500">{getErrorMessage(error)}</p>
          <button type="button" onClick={handleRetry} className="tf-button tf-button-secondary mt-5">
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { jobs, queue, performance, attempts, workers } = metrics;

  const heroCards = [
    { title: 'Total Jobs', value: jobs.total, icon: Layers, variant: 'primary' },
    { title: 'Active', value: jobs.active, icon: PlayCircle, variant: 'primary' },
    { title: 'Completed', value: jobs.completed, icon: CheckCircle2, variant: 'success' },
    { title: 'Failed', value: jobs.failed, icon: XCircle, variant: 'danger' },
  ];

  const statusRows = [
    { label: 'Waiting', value: jobs.waiting, icon: Hourglass },
    { label: 'Scheduled', value: jobs.scheduled, icon: Clock },
    { label: 'Blocked', value: jobs.blocked, icon: AlertTriangle, iconClass: 'text-amber-400' },
    { label: 'Active', value: jobs.active, icon: PlayCircle, iconClass: 'text-indigo-400' },
    { label: 'Retrying', value: jobs.retrying, icon: Repeat, iconClass: 'text-amber-400' },
    { label: 'Failed', value: jobs.failed, icon: XCircle, iconClass: 'text-red-400' },
    { label: 'Canceled', value: jobs.canceled, icon: Ban, iconClass: 'text-gray-500' },
    { label: 'Completed', value: jobs.completed, icon: CheckCircle2, iconClass: 'text-emerald-400' },
    { label: 'Dead Letter', value: jobs.deadLetter, icon: Inbox, iconClass: 'text-red-400' },
  ];

  const queueRows = [
    { label: 'Waiting', value: queue.waiting, icon: Hourglass },
    { label: 'Prioritized', value: queue.prioritized, icon: Layers, iconClass: 'text-indigo-400' },
    { label: 'Active', value: queue.active, icon: PlayCircle, iconClass: 'text-indigo-400' },
    { label: 'Completed', value: queue.completed, icon: CheckCircle2, iconClass: 'text-emerald-400' },
    { label: 'Failed', value: queue.failed, icon: XCircle, iconClass: 'text-red-400' },
    { label: 'Delayed', value: queue.delayed, icon: Clock, iconClass: 'text-amber-400' },
    { label: 'Paused', value: queue.paused, icon: PauseCircle, iconClass: 'text-gray-500' },
  ];

  const performanceRows = [
    {
      label: 'Avg Processing Time',
      value: formatDuration(performance.averageProcessingTimeMs),
      icon: Timer,
    },
    {
      label: 'Avg Queue Latency',
      value: formatDuration(performance.averageQueueLatencyMs),
      icon: Gauge,
    },
  ];

  const attemptsRows = [
    { label: 'Total Attempts', value: attempts.total, icon: Layers },
    { label: 'Completed', value: attempts.completed, icon: CheckCircle2, iconClass: 'text-emerald-400' },
    { label: 'Failed', value: attempts.failed, icon: XCircle, iconClass: 'text-red-400' },
  ];

  return (
    <div className="tf-page">
      {renderHeader}

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          <XCircle size={16} aria-hidden="true" />
          {getErrorMessage(error)}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {heroCards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            variant={card.variant}
          />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MetricList
            title="Job Status"
            description="Current distribution of all jobs by status."
            rows={statusRows}
          />
        </div>
        <MetricList
          title="Queue"
          description="Live BullMQ queue counts."
          rows={queueRows}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MetricList
          title="Performance"
          description="Averages across all recorded attempts."
          rows={performanceRows}
        />
        <MetricList
          title="Attempts"
          description="Worker attempt outcomes."
          rows={attemptsRows}
        />
        <WorkerSummaryPanel workers={workers} />
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Auto-refreshes every 5 seconds while this page is open.
      </p>
    </div>
  );
};

export default Metrics;
