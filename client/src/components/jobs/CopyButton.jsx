import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

const CopyButton = ({ text, label = 'Copy', className = '' }) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const handleCopy = () => {
    if (text === undefined || text === null) return;
    navigator.clipboard
      ?.writeText(String(text))
      .then(() => {
        setCopied(true);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`tf-button tf-button-secondary tf-button-sm ${className}`}
      aria-label={`${label} to clipboard`}
    >
      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
      {copied ? 'Copied' : label}
    </button>
  );
};

export default CopyButton;
