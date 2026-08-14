import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  Ban,
  CheckCircle2,
  Hourglass,
  Inbox,
  ListTodo,
  PlayCircle,
  PlusCircle,
  RefreshCw,
  Server,
  XCircle,
} from 'lucide-react';
import { getMetrics } from '../api/metrics';
import { getWorkers } from '../api/workers';
import StatCard from '../components/dashboard/StatCard';
import JobStatusChart from '../components/dashboard/JobStatusChart';
import QueueOverview from '../components/dashboard/QueueOverview';
import WorkerHealth from '../components/dashboard/WorkerHealth';

const AUTO_REFRESH_MS = 20000;

const getErrorMessage = (err) => {
  if (err?.code === 'ECONNABORTED') {
    return 'The request timed out. Please try again.';
  }
  if (!err?.response) {
    return 'The TaskFlow API could not be reached.';
  }
  const { status } = err.response;
  if (status === 401 || status === 403) {
    return 'You are not authorized to view this data.';
  }
  if (status === 404) {
    return 'The requested data was not found.';
  }
  if (status >= 500) {
    return 'The server encountered an error.';
  }
  return 'Something went wrong while loading dashboard data.';
};

const STATUS_STYLES = {
  checking: { dot: 'bg-gray-500', label: 'Checking...', text: 'text-gray-400' },
  operational: { dot: 'bg-emerald-400', label: 'System Operational', text: 'text-emerald-400' },
  degraded: { dot: 'bg-red-400', label: 'Workers Unavailable', text: 'text-red-400' },
  unavailable: { dot: 'bg-red-400', label: 'System Unavailable', text: 'text-red-400' },
};

const StatusIndicator = ({ state }) => {
  const style = STATUS_STYLES[state] ?? STATUS_STYLES.checking;

  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden="true" />
      <span className={`text-sm ${style.text}`}>{style.label}</span>
    </div>
  );
};

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);

  const loadDashboard = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;

    Promise.all([getMetrics(), getWorkers()])
      .then(([metrics, workers]) => {
        setData({ metrics, workers });
        setError(null);
      })
      .catch((err) => {
        console.error('[dashboard] Failed to load dashboard data:', err);
        setError(err);
      })
      .finally(() => {
        inFlight.current = false;
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  const handleRefresh = () => {
    if (inFlight.current) return;
    setRefreshing(true);
    loadDashboard();
  };

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const timer = setInterval(() => loadDashboard(), AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadDashboard]);

  const status = error
    ? 'unavailable'
    : !data
      ? 'checking'
      : data.metrics.workers.total > 0 && data.metrics.workers.healthy === 0
        ? 'degraded'
        : 'operational';

  const renderHeader = (
    <div className="tf-page-header flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="tf-page-title">Dashboard</h1>
        <p className="tf-page-description">Monitor your TaskFlow queue, jobs, and workers.</p>
      </div>
      <div className="flex items-center gap-3">
        <StatusIndicator state={status} />
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="tf-button tf-button-secondary"
          aria-label="Refresh dashboard data"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="tf-page">
        {renderHeader}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <StatCard key={index} loading />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="tf-card lg:col-span-3">
            <div className="tf-skeleton h-5 w-28" />
            <div className="tf-skeleton mt-3 h-44 w-full" />
          </div>
          <div className="tf-card lg:col-span-2">
            <div className="tf-skeleton h-5 w-32" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="tf-skeleton h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="tf-skeleton h-5 w-36" />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="tf-skeleton h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tf-page">
        {renderHeader}
        <div className="tf-card">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <XCircle size={18} className="text-red-400" aria-hidden="true" />
                <h3 className="text-base font-semibold text-white">Unable to load dashboard data</h3>
              </div>
              <p className="mt-1 text-sm text-gray-400">{getErrorMessage(error)}</p>
            </div>
            <button type="button" onClick={handleRefresh} className="tf-button tf-button-secondary">
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { metrics, workers } = data;
  const queueSize = metrics.queue.waiting + metrics.queue.active + metrics.queue.delayed;

  const renderEmptyState = (
    <div className="tf-card">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">No job activity yet</h3>
          <p className="mt-1 text-sm text-gray-400">Create your first job to start processing work.</p>
        </div>
        <Link to="/create-job" className="tf-button tf-button-primary">
          <PlusCircle size={16} />
          Create Job
        </Link>
      </div>
    </div>
  );

  if (metrics.jobs.total === 0) {
    return (
      <div className="tf-page">
        {renderHeader}
        {renderEmptyState}
        <div className="mt-4">
          <WorkerHealth workers={workers} />
        </div>
      </div>
    );
  }

  return (
    <div className="tf-page">
      {renderHeader}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Jobs"
          value={metrics.jobs.total}
          icon={ListTodo}
          description="All jobs ever created"
          variant="primary"
        />
        <StatCard
          title="Waiting"
          value={metrics.jobs.waiting}
          icon={Hourglass}
          description={`Avg ${metrics.performance.averageQueueLatencyMs}ms queue latency`}
          variant="neutral"
        />
        <StatCard
          title="Active"
          value={metrics.jobs.active}
          icon={PlayCircle}
          description={`Avg ${metrics.performance.averageProcessingTimeMs}ms processing`}
          variant="primary"
        />
        <StatCard
          title="Completed"
          value={metrics.jobs.completed}
          icon={CheckCircle2}
          description="Finished successfully"
          variant="success"
        />
        <StatCard
          title="Failed"
          value={metrics.jobs.failed}
          icon={XCircle}
          description="Terminal failures"
          variant="danger"
        />
        <StatCard
          title="Canceled"
          value={metrics.jobs.canceled}
          icon={Ban}
          description="Canceled by user"
          variant="neutral"
        />
        <StatCard
          title="Dead Letter"
          value={metrics.jobs.deadLetter}
          icon={Inbox}
          description="Moved to dead letter queue"
          variant="danger"
        />
        <StatCard
          title="Queue Size"
          value={queueSize}
          icon={Server}
          description="Waiting in the Redis queue"
          variant="primary"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <JobStatusChart jobs={metrics.jobs} />
        </div>
        <div className="lg:col-span-2">
          <QueueOverview queue={metrics.queue} />
        </div>
      </div>

      <div className="mt-4">
        <WorkerHealth workers={workers} />
      </div>
    </div>
  );
};

export default Dashboard;