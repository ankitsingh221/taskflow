import { AlertTriangle } from 'lucide-react';

const JobError = ({ message }) => (
  <div className="tf-card border-red-500/30 bg-red-500/5">
    <div className="flex items-center gap-2">
      <AlertTriangle size={16} className="text-red-400" aria-hidden="true" />
      <h3 className="tf-section-title text-red-400">Error</h3>
    </div>
    <p className="mt-3 break-words text-sm text-red-300">{message}</p>
  </div>
);

export default JobError;
