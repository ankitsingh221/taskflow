import api from './axios';

export const getDLQJobs = async () => {
  const { data } = await api.get('/api/dlq');
  return data;
};

export const retryDLQJob = async (jobId) => {
  const { data } = await api.post(`/api/dlq/${jobId}/retry`);
  return data;
};