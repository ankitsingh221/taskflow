import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AlertTriangle, CheckCircle2, Inbox, PlusCircle, RefreshCw, XCircle } from 'lucide-react';
import { cancelJob, getJobs } from '../api/jobs';
import { getErrorMessage } from '../utils/errors';
import PageHeader from '../components/ui/PageHeader';
import JobFilters from '../components/jobs/JobFilters';
import JobsTable from '../components/jobs/JobsTable';
import CancelJobDialog from '../components/jobs/CancelJobDialog';

const PAGE_LIMIT = 10;
const SEARCH_DEBOUNCE_MS = 350;

const buildParams = ({ search, status, page, limit }) => ({
  search: search || undefined,
  status: status === 'all' ? undefined : status,
  page,
  limit,
});

const getPageList = (current, total) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const pages = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('…');
  for (let index = start; index <= end; index += 1) pages.push(index);
  if (end < total - 1) pages.push('…');
  pages.push(total);
  return pages;
};

const Notice = ({ notice }) => {
  if (!notice) return null;
  const isError = notice.type === 'error';
  return (
    <div
      role="status"
      className={`mb-4 flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${
        isError ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
      }`}
    >
      {isError ? <AlertTriangle size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
      {notice.message}
    </div>
  );
};

const Jobs = () => {
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancellingJobId, setCancellingJobId] = useState(null);
  const [cancelError, setCancelError] = useState(null);
  const [notice, setNotice] = useState(null);
  const noticeTimer = useRef(null);
  const inFlight = useRef(false);

  const showNotice = (message, type = 'success') => {
    setNotice({ message, type });
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000);
  };

  useEffect(() => {
    return () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
  }, []);

  const fetchJobs = useCallback((params) => {
    if (inFlight.current) return;
    inFlight.current = true;

    getJobs(params)
      .then((res) => {
        setJobs(res.jobs ?? []);
        setTotal(res.total ?? 0);
        setTotalPages(res.totalPages ?? 1);
        setPage(res.page ?? 1);
        setError(null);
      })
      .catch((err) => {
        console.error('[jobs] Failed to load jobs:', err);
        setError(err);
      })
      .finally(() => {
        inFlight.current = false;
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    fetchJobs(buildParams({ search, status, page, limit: PAGE_LIMIT }));
  }, [fetchJobs, search, status, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
      setLoading(true);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const handleStatusChange = (nextStatus) => {
    setStatus(nextStatus);
    setPage(1);
    setLoading(true);
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    setLoading(true);
  };

  const handleRefresh = () => {
    if (inFlight.current) return;
    setRefreshing(true);
    fetchJobs(buildParams({ search, status, page, limit: PAGE_LIMIT }));
  };

  const handleRetry = () => {
    setLoading(true);
    fetchJobs(buildParams({ search, status, page, limit: PAGE_LIMIT }));
  };

  const handleView = (job) => {
    navigate(`/jobs/${job.jobId}`);
  };

  const openCancelDialog = (job) => {
    setCancelTarget(job);
    setCancelError(null);
  };

  const handleConfirmCancel = () => {
    if (!cancelTarget) return;
    setCancellingJobId(cancelTarget.jobId);
    setCancelError(null);

    cancelJob(cancelTarget.jobId)
      .then(() => {
        setCancelTarget(null);
        setCancellingJobId(null);
        showNotice(`Job "${cancelTarget.name}" canceled.`);
        fetchJobs(buildParams({ search, status, page, limit: PAGE_LIMIT }));
      })
      .catch((err) => {
        console.error('[jobs] Cancel failed:', err);
        setCancellingJobId(null);
        setCancelError(getErrorMessage(err));
      });
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('all');
    setPage(1);
    setLoading(true);
  };

  const hasActiveFilter = Boolean(search) || status !== 'all';
  const first = total === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1;
  const last = Math.min(page * PAGE_LIMIT, total);

  return (
    <div className="tf-page">
      <div className="tf-page-header flex flex-wrap items-start justify-between gap-4">
        <PageHeader title="Jobs" description="View and manage all TaskFlow jobs." />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="tf-button tf-button-secondary"
            aria-label="Refresh jobs"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <Notice notice={notice} />

      <JobFilters
        search={searchInput}
        onSearchChange={setSearchInput}
        status={status}
        onStatusChange={handleStatusChange}
      />

      <div className="tf-card mt-4 overflow-hidden p-0">
        {error ? (
          <div className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <XCircle size={18} className="text-red-400" aria-hidden="true" />
                <h3 className="text-base font-semibold text-white">Unable to load jobs</h3>
              </div>
              <p className="mt-1 text-sm text-gray-400">{getErrorMessage(error)}</p>
            </div>
            <button type="button" onClick={handleRetry} className="tf-button tf-button-secondary">
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        ) : loading ? (
          <JobsTable jobs={[]} loading cancellingJobId={null} onView={handleView} onCancel={openCancelDialog} />
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Inbox size={18} className="text-gray-500" aria-hidden="true" />
                <h3 className="text-base font-semibold text-white">No jobs found</h3>
              </div>
              <p className="mt-1 text-sm text-gray-400">
                {hasActiveFilter
                  ? 'There are no jobs matching your current filters.'
                  : 'Get started by creating your first job.'}
              </p>
            </div>
            {hasActiveFilter ? (
              <button type="button" onClick={clearFilters} className="tf-button tf-button-secondary">
                Clear Filters
              </button>
            ) : (
              <Link to="/create-job" className="tf-button tf-button-primary">
                <PlusCircle size={16} />
                Create Job
              </Link>
            )}
          </div>
        ) : (
          <>
            <JobsTable
              jobs={jobs}
              loading={false}
              cancellingJobId={cancellingJobId}
              onView={handleView}
              onCancel={openCancelDialog}
            />
            <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-800 px-4 py-3 sm:flex-row">
              <p className="text-sm text-gray-400">
                Showing {first}–{last} of {total} {total === 1 ? 'job' : 'jobs'}
              </p>
              <nav aria-label="Pagination" className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="tf-button tf-button-secondary tf-button-sm"
                >
                  Previous
                </button>
                {getPageList(page, totalPages).map((item, index) =>
                  item === '…' ? (
                    <span key={`ellipsis-${index}`} className="px-2 text-sm text-gray-500">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handlePageChange(item)}
                      aria-current={item === page ? 'page' : undefined}
                      className={`tf-button-sm rounded-md px-3 py-1.5 text-xs transition-colors ${
                        item === page
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="tf-button tf-button-secondary tf-button-sm"
                >
                  Next
                </button>
              </nav>
            </div>
          </>
        )}
      </div>

      <CancelJobDialog
        open={Boolean(cancelTarget)}
        jobName={cancelTarget?.name}
        confirming={Boolean(cancellingJobId)}
        error={cancelError}
        onConfirm={handleConfirmCancel}
        onClose={() => setCancelTarget(null)}
      />
    </div>
  );
};

export default Jobs;