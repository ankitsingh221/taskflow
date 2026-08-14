import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Inbox, RefreshCw, XCircle } from 'lucide-react';
import { getDLQJobs, retryDLQJob } from '../api/dlq';
import { getErrorMessage } from '../utils/errors';
import PageHeader from '../components/ui/PageHeader';
import DLQTable from '../components/dlq/DLQTable';

const POLL_INTERVAL_MS = 5000;

const DLQ = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [retryingJobId, setRetryingJobId] = useState(null);
  const [retryError, setRetryError] = useState(null);
  const [notice, setNotice] = useState(null);
  const noticeTimer = useRef(null);
  const inFlight = useRef(false);

  const showNotice = (message, type = 'success') => {
    setNotice({ message, type });
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000);
  };

  const loadData = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;

    getDLQJobs()
      .then((res) => {
        setJobs(res.jobs ?? []);
        setError(null);
      })
      .catch((err) => {
        console.error('[dlq] Failed to load dead letter jobs:', err);
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

  useEffect(() => {
    return () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
  }, []);

  const handleRefresh = () => {
    if (inFlight.current) return;
    setRefreshing(true);
    loadData();
  };

  const handleRetryFetch = () => {
    setLoading(true);
    loadData();
  };

  const handleRetryJob = (job) => {
    setRetryingJobId(job.jobId);
    setRetryError(null);

    retryDLQJob(job.jobId)
      .then(() => {
        setRetryingJobId(null);
        showNotice(`Job "${job.name}" retried — moved back to retrying.`);
        loadData();
      })
      .catch((err) => {
        console.error('[dlq] Retry failed:', err);
        setRetryingJobId(null);
        setRetryError(getErrorMessage(err));
      });
  };

  return (
    <div className="tf-page">
      <div className="tf-page-header flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Dead Letter Queue"
          description="Inspect and retry failed job items that exhausted their retries."
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="tf-button tf-button-secondary"
            aria-label="Refresh dead letter jobs"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className={`mt-4 flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${
            notice.type === 'error'
              ? 'border-red-500/30 bg-red-500/10 text-red-400'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
          }`}
        >
          {notice.type === 'error' ? (
            <AlertTriangle size={16} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={16} aria-hidden="true" />
          )}
          {notice.message}
        </div>
      )}

      {retryError && (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          <AlertTriangle size={16} aria-hidden="true" />
          {retryError}
        </div>
      )}

      {error && !loading ? (
        <div className="tf-card mt-4">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <XCircle size={18} className="text-red-400" aria-hidden="true" />
                <h3 className="text-base font-semibold text-white">Unable to load dead letter jobs</h3>
              </div>
              <p className="mt-1 text-sm text-gray-400">{getErrorMessage(error)}</p>
            </div>
            <button type="button" onClick={handleRetryFetch} className="tf-button tf-button-secondary">
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        </div>
      ) : (
        <div className="tf-card mt-4 overflow-hidden p-0">
          {loading && jobs.length === 0 ? (
            <DLQTable jobs={[]} loading retryingJobId={null} onRetry={handleRetryJob} />
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Inbox size={18} className="text-gray-500" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-white">No dead-letter jobs</h3>
                </div>
                <p className="mt-1 text-sm text-gray-400">
                  Jobs that exhaust all retry attempts land here. There are none right now.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
                <p className="text-sm text-gray-400">
                  {jobs.length} {jobs.length === 1 ? 'dead-letter job' : 'dead-letter jobs'}
                </p>
              </div>
              <DLQTable jobs={jobs} loading={false} retryingJobId={retryingJobId} onRetry={handleRetryJob} />
            </>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500">
        Auto-refreshes every 5 seconds while this page is open.
      </p>
    </div>
  );
};

export default DLQ;
