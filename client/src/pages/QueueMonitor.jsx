import { useCallback, useEffect, useRef, useState } from 'react';
import { Ban, CheckCircle2, Clock, Hourglass, PlayCircle, RefreshCw, XCircle } from 'lucide-react';
import { getMetrics } from '../api/metrics';
import { getJobs } from '../api/jobs';
import { getErrorMessage } from '../utils/errors';
import StatCard from '../components/dashboard/StatCard';
import QueueDistribution from '../components/queue/QueueDistribution';
import WorkerSummaryPanel from '../components/queue/WorkerSummaryPanel';
import RecentActivity from '../components/queue/RecentActivity';

const POLL_INTERVAL_MS = 5000;
const RECENT_LIMIT = 8;

const QueueMonitor = () => {
  const [metrics, setMetrics] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);

  const loadData = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;

    Promise.all([
      getMetrics(),
      getJobs({ limit: RECENT_LIMIT }).catch(() => ({ jobs: [] })),
    ])
      .then(([metricsData, jobsRes]) => {
        setMetrics(metricsData);
        setRecentJobs(jobsRes?.jobs ?? []);
        setError(null);
      })
      .catch((err) => {
        console.error('[queue-monitor] Failed to load queue metrics:', err);
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
        <h1 className="tf-page-title">Queue Monitor</h1>
        <p className="tf-page-description">Monitor TaskFlow queue activity and health.</p>
      </div>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing || loading}
        className="tf-button tf-button-secondary"
        aria-label="Refresh queue metrics"
      >
        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        {refreshing ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );

  const renderSummarySkeleton = () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <StatCard key={index} loading />
      ))}
    </div>
  );

  const renderPanelSkeleton = () => (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="tf-card">
          <div className="tf-skeleton h-4 w-28" />
          <div className="tf-skeleton mt-3 h-3 w-40" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((__, inner) => (
              <div key={inner} className="tf-skeleton h-4 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (loading && !metrics) {
    return (
      <div className="tf-page">
        {renderHeader}
        {renderSummarySkeleton()}
        {renderPanelSkeleton()}
        <div className="mt-4 tf-card">
          <div className="tf-skeleton h-4 w-32" />
          <div className="mt-3 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="tf-skeleton h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="tf-page">
        {renderHeader}
        <div className="tf-card">
          <div className="flex items-center gap-2">
            <XCircle size={18} className="text-red-400" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-white">Unable to load queue metrics</h2>
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

  const { jobs, queue, workers } = metrics;

  const cards = [
    { title: 'Waiting', value: jobs.waiting, icon: Hourglass, variant: 'primary' },
    { title: 'Active', value: jobs.active, icon: PlayCircle, variant: 'primary' },
    { title: 'Delayed', value: queue.delayed, icon: Clock, variant: 'warning' },
    { title: 'Completed', value: jobs.completed, icon: CheckCircle2, variant: 'success' },
    { title: 'Failed', value: jobs.failed, icon: XCircle, variant: 'danger' },
    { title: 'Canceled', value: jobs.canceled, icon: Ban, variant: 'neutral' },
  ];

  const isEmpty = jobs.total === 0;

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            variant={card.variant}
          />
        ))}
      </div>

      {isEmpty ? (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="tf-card lg:col-span-2">
            <h2 className="text-lg font-semibold text-white">Queue is empty</h2>
            <p className="mt-2 text-sm text-gray-400">
              No jobs are currently waiting or processing.
            </p>
          </div>
          <WorkerSummaryPanel workers={workers} />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <QueueDistribution metrics={metrics} />
          <div className="tf-card h-full">
            <h3 className="tf-section-title">Queue Activity</h3>
            <p className="mt-1 text-sm text-gray-400">
              Historical metrics are not available yet.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              The backend does not currently expose time-series queue activity data.
            </p>
          </div>
          <WorkerSummaryPanel workers={workers} />
        </div>
      )}

      <div className="mt-4">
        <RecentActivity jobs={recentJobs} />
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Auto-refreshes every 5 seconds while this page is open.
      </p>
    </div>
  );
};

export default QueueMonitor;
