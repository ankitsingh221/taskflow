import api from './axios';

export const getJobs = async (params) => {
  const { data } = await api.get('/api/jobs', { params });
  return data;
};

export const cancelJob = async (jobId) => {
  const { data } = await api.post(`/api/jobs/${jobId}/cancel`);
  return data;
};
