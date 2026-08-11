import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function useHealth(path) {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}${path}`)
      .then((res) => {
        if (!cancelled) setStatus(res.ok ? 'healthy' : 'unavailable');
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return status;
}

function StatusItem({ label, status }) {
  const color = status === 'healthy' ? 'text-emerald-400' : status === 'checking' ? 'text-yellow-400' : 'text-red-400';
  return (
    <li className="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-3">
      <span className="text-gray-300">{label}</span>
      <span className={`font-medium ${color}`}>{status}</span>
    </li>
  );
}

const App = () => {
  const api = useHealth('/health');
  const db = useHealth('/health/db');
  const redis = useHealth('/health/redis');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="flex w-full max-w-md flex-col gap-5 px-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">TaskFlow</h1>
          <h2 className="mt-1 text-lg text-gray-400">System Status</h2>
        </div>
        <ul className="flex flex-col gap-3">
          <StatusItem label="API" status={api} />
          <StatusItem label="PostgreSQL" status={db} />
          <StatusItem label="Redis" status={redis} />
        </ul>
      </div>
    </div>
  );
};

export default App