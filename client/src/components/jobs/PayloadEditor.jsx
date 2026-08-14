const PayloadEditor = ({ id, label, value, onChange, error }) => (
  <div>
    <label htmlFor={id} className="tf-label">
      {label}
    </label>
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`{\n  "email": "user@example.com"\n}`}
      rows={8}
      spellCheck={false}
      aria-invalid={Boolean(error)}
      className={`tf-textarea font-mono text-xs leading-relaxed ${error ? 'tf-textarea-error' : ''}`}
    />
    {error && (
      <p className="tf-form-error" role="alert">
        {error}
      </p>
    )}
  </div>
);

export default PayloadEditor;
