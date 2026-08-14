import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { AlertTriangle, ArrowLeft, RefreshCw, SearchX, XCircle } from 'lucide-react';
import {
  cancelJob,
  getJob,
  getJobAttempts,
  getJobDependencies,
} from '../api/jobs';
import { getErrorMessage } from '../utils/errors';
import { formatJson } from '../utils/format';
import StatusBadge from '../components/ui/StatusBadge';
import CancelJobDialog from '../components/jobs/CancelJobDialog';
import JobHeader from '../components/jobs/JobHeader';
import JobInfo from '../components/jobs/JobInfo';
import JobExecution from '../components/jobs/JobExecution';
import JobPayload from '../components/jobs/JobPayload';
import JobResult from '../components/jobs/JobResult';
import JobError from '../components/jobs/JobError';
import AttemptHistory from '../components/jobs/AttemptHistory';
import Dependencies from '../components/jobs/Dependencies';
import TechnicalDetails from '../components/jobs/TechnicalDetails';

const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'canceled', 'dlq']);
const CANCELLABLE_STATUSES = new Set(['waiting', 'scheduled', 'active', 'retrying']);

const isTerminal = (status) => TERMINAL_STATUSES.has(String(status).toLowerCase());

const JobDetail = ({ jobId }) => {
  const [job, setJob] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [notice, setNotice] = useState(null);
  const inFlight = useRef(false);
  const noticeTimer = useRef(null);

  const fetchJob = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;

    getJob(jobId)
      .then((res) => {
        setJob(res.job);
        setNotFound(false);
        setLoadError(null);
        return Promise.all([
          getJobAttempts(jobId).catch(() => ({ attempts: [] })),
          getJobDependencies(jobId).catch(() => ({ dependencies: [] })),
        ]);
      })
      .then(([attemptRes, dependencyRes]) => {
        setAttempts(attemptRes.attempts ?? []);
        setDependencies(dependencyRes.dependencies ?? []);
      })
      .catch((err) => {
        console.error('[job-details] Failed to load job:', err);
        if (err.response?.status === 404) {
          setNotFound(true);
          setJob(null);
          setAttempts([]);
          setDependencies([]);
        } else {
          setLoadError(err);
        }
      })
      .finally(() => {
        inFlight.current = false;
        setLoading(false);
        setRefreshing(false);
      });
  }, [jobId]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  useEffect(() => {
    if (!job || isTerminal(job.status)) return undefined;
    const timer = window.setInterval(() => fetchJob(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [job, fetchJob]);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
  }, []);

  const showNotice = (message) => {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000);
  };

  const handleRefresh = () => {
    if (inFlight.current) return;
    setRefreshing(true);
    fetchJob();
  };

  const handleRetry = () => {
    setLoading(true);
    fetchJob();
  };

  const handleConfirmCancel = () => {
    setCanceling(true);
    setCancelError(null);

    cancelJob(jobId)
      .then(() => {
        setCancelOpen(false);
        setCanceling(false);
        showNotice('Job canceled successfully.');
        fetchJob();
      })
      .catch((err) => {
        console.error('[job-details] Cancel failed:', err);
        setCanceling(false);
        setCancelError(getErrorMessage(err));
      });
  };

  const renderProgress = () => {
    const status = String(job.status).toLowerCase();
    const value = Math.max(0, Math.min(100, job.progress ?? 0));
    const barColor =
      status === 'completed'
        ? 'bg-emerald-500'
        : status === 'failed' || job.isDeadLetter
          ? 'bg-red-500'
          : status === 'canceled'
            ? 'bg-gray-500'
            : 'bg-indigo-500';

    return (
      <div className="tf-card">
        <div className="flex items-center justify-between">
          <h3 className="tf-section-title">Progress</h3>
          <span className="text-sm font-medium tabular-nums text-gray-300">{value}%</span>
        </div>
        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-800"
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    );
  };

  const renderSkeleton = () => (
    <div className="space-y-4">
      <div className="tf-card">
        <div className="tf-skeleton h-7 w-1/3" />
        <div className="tf-skeleton mt-3 h-4 w-2/3" />
        <div className="tf-skeleton mt-3 h-5 w-32" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="tf-card">
          <div className="tf-skeleton h-4 w-28" />
          <div className="tf-skeleton mt-3 h-3 w-full" />
          <div className="tf-skeleton mt-3 h-3 w-full" />
          <div className="tf-skeleton mt-3 h-3 w-2/3" />
        </div>
        <div className="tf-card">
          <div className="tf-skeleton h-4 w-28" />
          <div className="tf-skeleton mt-3 h-3 w-full" />
          <div className="tf-skeleton mt-3 h-3 w-full" />
          <div className="tf-skeleton mt-3 h-3 w-1/2" />
        </div>
      </div>
      <div className="tf-card">
        <div className="tf-skeleton h-4 w-24" />
        <div className="tf-skeleton mt-3 h-3 w-full" />
      </div>
      <div className="tf-card">
        <div className="tf-skeleton h-4 w-24" />
        <div className="tf-skeleton mt-3 h-32 w-full" />
      </div>
    </div>
  );

  if (loading && !job) {
    return (
      <div className="tf-page">
        <div className="mb-4">
          <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
            <ArrowLeft size={16} />
            Back to Jobs
          </Link>
        </div>
        {renderSkeleton()}
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="tf-page">
        <div className="mb-4">
          <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
            <ArrowLeft size={16} />
            Back to Jobs
          </Link>
        </div>
        <div className="tf-card">
          <div className="flex items-center gap-2">
            <SearchX size={18} className="text-gray-500" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-white">Job not found</h2>
          </div>
          <p className="mt-2 text-sm text-gray-400">
            The job you're looking for does not exist or is no longer available.
          </p>
          <Link to="/jobs" className="tf-button tf-button-secondary mt-5">
            <ArrowLeft size={16} />
            Back to Jobs
          </Link>
        </div>
      </div>
    );
  }

  if (loadError && !job) {
    return (
      <div className="tf-page">
        <div className="mb-4">
          <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
            <ArrowLeft size={16} />
            Back to Jobs
          </Link>
        </div>
        <div className="tf-card">
          <div className="flex items-center gap-2">
            <XCircle size={18} className="text-red-400" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-white">Unable to load job</h2>
          </div>
          <p className="mt-2 text-sm text-gray-400">{getErrorMessage(loadError)}</p>
          <button type="button" onClick={handleRetry} className="tf-button tf-button-secondary mt-5">
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="tf-page">
        <div className="mb-4">
          <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
            <ArrowLeft size={16} />
            Back to Jobs
          </Link>
        </div>
        {renderSkeleton()}
      </div>
    );
  }

  const canCancel =
    CANCELLABLE_STATUSES.has(String(job.status).toLowerCase()) && !job.isDeadLetter;
  const payloadText = formatJson(job.payload) ?? '{}';
  const resultText = formatJson(job.result);

  return (
    <div className="tf-page">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
          <ArrowLeft size={16} />
          Back to Jobs
        </Link>
      </div>

      {notice && (
        <div
          role="status"
          className="mb-4 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
        >
          <AlertTriangle size={16} aria-hidden="true" />
          {notice}
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          <XCircle size={16} aria-hidden="true" />
          {getErrorMessage(loadError)}
        </div>
      )}

      <div className="space-y-4">
        <JobHeader
          job={job}
          refreshing={refreshing}
          canCancel={canCancel}
          onRefresh={handleRefresh}
          onCancel={() => {
            setCancelError(null);
            setCancelOpen(true);
          }}
        />

        {job.isDeadLetter && (
          <div className="tf-card border-red-500/30 bg-red-500/5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" aria-hidden="true" />
              <h3 className="tf-section-title text-red-400">Dead Letter</h3>
            </div>
            <p className="mt-2 text-sm text-red-300">
              This job exhausted its configured retry attempts.
            </p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <JobInfo job={job} />
          <JobExecution job={job} />
        </div>

        {renderProgress()}

        <JobPayload payloadText={payloadText} />

        <JobResult resultText={resultText} />

        {job.error && <JobError message={job.error} />}

        <AttemptHistory attempts={attempts} />

        <Dependencies dependencies={dependencies} />

        <TechnicalDetails job={job} />

        <div className="flex items-center gap-2 pt-2">
          <StatusBadge status={job.status} />
          <span className="text-xs text-gray-500">Updated automatically while the job is running.</span>
        </div>
      </div>

      <CancelJobDialog
        open={cancelOpen}
        jobName={job.name}
        confirming={canceling}
        error={cancelError}
        onConfirm={handleConfirmCancel}
        onClose={() => setCancelOpen(false)}
      />
    </div>
  );
};

const JobDetails = () => {
  const { jobId } = useParams();
  return <JobDetail key={jobId} jobId={jobId} />;
};

export default JobDetails;
