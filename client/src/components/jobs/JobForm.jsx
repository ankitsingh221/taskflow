import { useState } from 'react';
import { ChevronDown, Loader2, PlusCircle } from 'lucide-react';
import PayloadEditor from './PayloadEditor';
import DependencyInput from './DependencyInput';
import { validateJobForm } from '../../utils/jobFormValidation';

const JobForm = ({ onSubmit, submitting, submitError }) => {
  const [name, setName] = useState('');
  const [payloadText, setPayloadText] = useState('');
  const [priority, setPriority] = useState('5');
  const [delaySeconds, setDelaySeconds] = useState('0');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [dependencies, setDependencies] = useState(['']);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const clearError = (field) => {
    if (!fieldErrors[field]) return;
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { errors, payload, priority: priorityNumber, delay: delayNumber } = validateJobForm({
      name,
      payloadText,
      priority,
      delaySeconds,
    });

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    onSubmit({
      name: name.trim(),
      data: payload,
      priority: priorityNumber,
      delay: delayNumber * 1000,
      idempotencyKey: idempotencyKey.trim() || undefined,
      dependsOn: dependencies.map((dependency) => dependency.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="tf-card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Job Information
        </h2>

        <div className="space-y-5">
          <div>
            <label htmlFor="job-name" className="tf-label">
              Job Name
            </label>
            <input
              id="job-name"
              className={`tf-input ${fieldErrors.name ? 'tf-input-error' : ''}`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearError('name');
              }}
              placeholder="send-welcome-email"
              aria-invalid={Boolean(fieldErrors.name)}
            />
            {fieldErrors.name && (
              <p className="tf-form-error" role="alert">
                {fieldErrors.name}
              </p>
            )}
          </div>

          <PayloadEditor
            id="job-payload"
            label="Payload"
            value={payloadText}
            onChange={(value) => {
              setPayloadText(value);
              clearError('payload');
            }}
            error={fieldErrors.payload}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="job-priority" className="tf-label">
                Priority
              </label>
              <input
                id="job-priority"
                className={`tf-input ${fieldErrors.priority ? 'tf-input-error' : ''}`}
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  clearError('priority');
                }}
                inputMode="numeric"
                aria-invalid={Boolean(fieldErrors.priority)}
              />
              <p className="mt-1 text-xs text-gray-500">Integer between 1 and 10.</p>
              {fieldErrors.priority && (
                <p className="tf-form-error" role="alert">
                  {fieldErrors.priority}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="job-delay" className="tf-label">
                Delay
              </label>
              <input
                id="job-delay"
                className={`tf-input ${fieldErrors.delay ? 'tf-input-error' : ''}`}
                value={delaySeconds}
                onChange={(e) => {
                  setDelaySeconds(e.target.value);
                  clearError('delay');
                }}
                inputMode="numeric"
                aria-invalid={Boolean(fieldErrors.delay)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Delay before processing begins (seconds), up to 7 days.
              </p>
              {fieldErrors.delay && (
                <p className="tf-form-error" role="alert">
                  {fieldErrors.delay}
                </p>
              )}
            </div>
          </div>

          <div className="tf-divider" />

          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-400 hover:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 rounded"
            aria-expanded={showAdvanced}
          >
            <ChevronDown
              size={16}
              className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            />
            Advanced Options
          </button>

          {showAdvanced && (
            <div className="space-y-5 border-t border-gray-800 pt-5">
              <div>
                <label htmlFor="idempotency-key" className="tf-label">
                  Idempotency Key
                </label>
                <input
                  id="idempotency-key"
                  className="tf-input font-mono"
                  value={idempotencyKey}
                  onChange={(e) => setIdempotencyKey(e.target.value)}
                  placeholder="optional-key"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Prevents accidental duplicate job creation when the same key is reused.
                </p>
              </div>
              <DependencyInput value={dependencies} onChange={setDependencies} />
            </div>
          )}
        </div>
      </div>

      {submitError && (
        <div
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          role="alert"
        >
          {submitError}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={submitting} className="tf-button tf-button-primary">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
          {submitting ? 'Creating Job...' : 'Create Job'}
        </button>
      </div>
    </form>
  );
};

export default JobForm;
