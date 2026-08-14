import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Server, XCircle } from 'lucide-react';
import { getWorkers } from '../api/workers';
import { getErrorMessage } from '../utils/errors';
import WorkerSummary from '../components/workers/WorkerSummary';
import WorkerTable from '../components/workers/WorkerTable';

const POLL_INTERVAL_MS = 5000;

const Workers = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);

  const fetchWorkers = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;

    getWorkers()
      .then((result) => {
        setWorkers(result);
        setError(null);
      })
      .catch((err) => {
        console.error('[workers] Failed to load workers:', err);
        setError(err);
      })
      .finally(() => {
        inFlight.current = false;
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  useEffect(() => {
    const timer = window.setInterval(() => fetchWorkers(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [fetchWorkers]);

  const handleRefresh = () => {
    if (inFlight.current) return;
    setRefreshing(true);
    fetchWorkers();
  };

  const handleRetry = () => {
    setLoading(true);
    fetchWorkers();
  };

  const renderHeader = (
    <div className="tf-page-header flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="tf-page-title">Workers</h1>
        <p className="tf-page-description">Monitor worker health and activity.</p>
      </div>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing || loading}
        className="tf-button tf-button-secondary"
        aria-label="Refresh workers data"
      >
        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        {refreshing ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );

  const renderSkeleton = () => (
    <div className="tf-page">
      {renderHeader}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="tf-card">
            <div className="tf-skeleton h-3 w-16" />
            <div className="tf-skeleton mt-3 h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="mt-4 hidden md:block">
        <div className="tf-card p-0">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-6 border-b border-gray-800 px-5 py-4 last:border-b-0">
              <div className="tf-skeleton h-4 w-40" />
              <div className="tf-skeleton h-5 w-24" />
              <div className="tf-skeleton h-4 w-12" />
              <div className="tf-skeleton h-4 w-12" />
              <div className="tf-skeleton h-4 w-28" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 space-y-4 md:hidden">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="tf-card">
            <div className="flex items-center justify-between">
              <div className="tf-skeleton h-4 w-32" />
              <div className="tf-skeleton h-5 w-20" />
            </div>
            <div className="tf-divider" />
            {Array.from({ length: 3 }).map((__, inner) => (
              <div key={inner} className="tf-skeleton mb-2 h-3 w-full last:mb-0" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  if (loading && workers.length === 0) {
    return renderSkeleton();
  }

  if (error && workers.length === 0) {
    return (
      <div className="tf-page">
        {renderHeader}
        <div className="tf-card">
          <div className="flex items-center gap-2">
            <XCircle size={18} className="text-red-400" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-white">Unable to load workers</h2>
          </div>
          <p className="mt-2 text-sm text-gray-400">
            The worker monitoring service could not be reached.
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

  if (workers.length === 0) {
    return (
      <div className="tf-page">
        {renderHeader}
        <div className="tf-card">
          <div className="flex items-center gap-2">
            <Server size={18} className="text-gray-500" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-white">No workers found</h2>
          </div>
          <p className="mt-2 text-sm text-gray-400">
            TaskFlow currently has no registered workers.
          </p>
          <button type="button" onClick={handleRefresh} className="tf-button tf-button-secondary mt-5">
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>
    );
  }

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

      <WorkerSummary workers={workers} />

      <div className="mt-4">
        <WorkerTable workers={workers} />
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Auto-refreshes every 5 seconds while this page is open.
      </p>
    </div>
  );
};

export default Workers;
