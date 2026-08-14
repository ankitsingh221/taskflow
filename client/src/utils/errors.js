export const getErrorMessage = (err) => {
  if (err?.code === 'ECONNABORTED') {
    return 'The request timed out. Please try again.';
  }
  if (!err?.response) {
    return 'The TaskFlow API could not be reached.';
  }
  const { status } = err.response;
  if (status === 401 || status === 403) {
    return 'You are not authorized to perform this action.';
  }
  if (status === 404) {
    return 'The requested resource was not found.';
  }
  if (status >= 500) {
    return 'The server encountered an error.';
  }
  const message = err.response.data?.message;
  return message || 'Something went wrong. Please try again.';
};
