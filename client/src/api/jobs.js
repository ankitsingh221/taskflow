import api from './axios';

export const getJobs = async (params) => {
  const { data } = await api.get('/api/jobs', { params });
  return data;
};

export const cancelJob = async (jobId) => {
  const { data } = await api.post(`/api/jobs/${jobId}/cancel`);
  return data;
};

export const createJob = async ({ name, data, priority, delay, idempotencyKey, dependsOn }) => {
  const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
  const { data: response } = await api.post(
    '/api/jobs',
    { name, data, priority, delay, dependsOn },
    { headers },
  );
  return response;
};

export const getJob = async (jobId) => {
  const { data } = await api.get(`/api/jobs/${jobId}`);
  return data;
};

export const getJobAttempts = async (jobId) => {
  const { data } = await api.get(`/api/jobs/${jobId}/attempts`);
  return data;
};

export const getJobDependencies = async (jobId) => {
  const { data } = await api.get(`/api/dependencies/${jobId}`);
  return data;
};
