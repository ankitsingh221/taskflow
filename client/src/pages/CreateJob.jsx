import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, CheckCircle2, Info, PlusCircle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import JobForm from '../components/jobs/JobForm';
import { createJob } from '../api/jobs';
import { getErrorMessage } from '../utils/errors';

const CreateJob = () => {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [resetKey, setResetKey] = useState(0);

  const handleSubmit = (values) => {
    setSubmitting(true);
    setSubmitError(null);
    createJob(values)
      .then((response) => setResult(response))
      .catch((err) => {
        console.error('[create-job] Failed to create job:', err);
        setSubmitError(getErrorMessage(err));
      })
      .finally(() => setSubmitting(false));
  };

  const handleCreateAnother = () => {
    setResult(null);
    setSubmitError(null);
    setResetKey((key) => key + 1);
  };

  return (
    <div className="tf-page">
      <PageHeader title="Create Job" description="Submit a new job to the TaskFlow queue." />

      {result ? (
        <div className="tf-card max-w-2xl">
          <div className="flex items-start gap-3">
            {result.idempotent ? (
              <Info size={22} className="mt-0.5 shrink-0 text-indigo-400" />
            ) : (
              <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-400" />
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white">
                {result.idempotent ? 'Existing job found' : 'Job created successfully'}
              </h2>
              {result.idempotent && (
                <p className="mt-1 text-sm text-gray-400">
                  A job with this idempotency key already exists. Showing the existing job instead.
                </p>
              )}
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <dt className="text-gray-400">Job ID</dt>
                  <dd className="font-mono text-xs text-gray-200">{result.job?.jobId}</dd>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <dt className="text-gray-400">Status</dt>
                  <dd>
                    <StatusBadge status={result.job?.status} />
                  </dd>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <dt className="text-gray-400">Priority</dt>
                  <dd className="text-gray-200">{result.job?.priority}</dd>
                </div>
              </dl>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={`/jobs/${result.job?.jobId}`} className="tf-button tf-button-primary">
                  <PlusCircle size={16} />
                  View Job
                </Link>
                <button
                  type="button"
                  onClick={handleCreateAnother}
                  className="tf-button tf-button-secondary"
                >
                  Create Another
                </button>
                <Link to="/jobs" className="tf-button tf-button-secondary">
                  Back to Jobs
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="max-w-2xl">
            <JobForm
              key={resetKey}
              onSubmit={handleSubmit}
              submitting={submitting}
              submitError={submitError}
            />
          </div>
          <div className="mt-4">
            <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
              <ArrowLeft size={16} />
              Back to Jobs
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default CreateJob;
