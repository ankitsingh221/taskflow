import api from '../api/axios';

const Dashboard = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-500">API: {api.defaults.baseURL}</p>
    </div>
  );
};

export default Dashboard;
