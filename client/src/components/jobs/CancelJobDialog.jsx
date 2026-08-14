import { useEffect } from 'react';

const CancelJobDialog = ({ open, jobName, confirming, error, onConfirm, onClose }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-dialog-title"
        aria-describedby="cancel-dialog-description"
        className="tf-card relative z-10 w-full max-w-md"
      >
        <h3 id="cancel-dialog-title" className="text-base font-semibold text-white">
          Cancel this job?
        </h3>
        <p id="cancel-dialog-description" className="mt-2 text-sm text-gray-400">
          {jobName ? `"${jobName}" will be canceled.` : 'This job will be canceled.'} This action cannot be undone.
        </p>
        {error && (
          <p className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={confirming} className="tf-button tf-button-secondary">
            Keep Job
          </button>
          <button type="button" onClick={onConfirm} disabled={confirming} className="tf-button tf-button-danger">
            {confirming ? 'Canceling...' : 'Cancel Job'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelJobDialog;
