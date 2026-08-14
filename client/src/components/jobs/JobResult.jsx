import CopyButton from './CopyButton';

const JobResult = ({ resultText }) => (
  <div className="tf-card">
    <div className="flex items-center justify-between gap-3">
      <h3 className="tf-section-title">Result</h3>
      {resultText && <CopyButton text={resultText} label="Copy" />}
    </div>
    {resultText ? (
      <pre className="tf-code-block mt-3">{resultText}</pre>
    ) : (
      <p className="mt-3 text-sm text-gray-500">No result available.</p>
    )}
  </div>
);

export default JobResult;
