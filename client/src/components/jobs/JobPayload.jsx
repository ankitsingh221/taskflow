import CopyButton from './CopyButton';

const JobPayload = ({ payloadText }) => (
  <div className="tf-card">
    <div className="flex items-center justify-between gap-3">
      <h3 className="tf-section-title">Payload</h3>
      <CopyButton text={payloadText} label="Copy" />
    </div>
    <pre className="tf-code-block mt-3">{payloadText}</pre>
  </div>
);

export default JobPayload;
