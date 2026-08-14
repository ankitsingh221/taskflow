import { Route, Routes } from 'react-router';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import CreateJob from './pages/CreateJob';
import Workers from './pages/Workers';
import Metrics from './pages/Metrics';
import DLQ from './pages/DLQ';

const App = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="create-job" element={<CreateJob />} />
        <Route path="workers" element={<Workers />} />
        <Route path="metrics" element={<Metrics />} />
        <Route path="dlq" element={<DLQ />} />
      </Route>
    </Routes>
  );
};

export default App;
