import api from './axios';

export const getWorkers = async () => {
  const { data } = await api.get('/api/workers');
  return data.workers;
};
