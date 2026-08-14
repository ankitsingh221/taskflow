import api from './axios';

export const getMetrics = async () => {
  const { data } = await api.get('/api/metrics');
  return data.metrics;
};
