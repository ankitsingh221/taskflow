export const MAX_DELAY_SECONDS = 7 * 24 * 60 * 60;

export const validateJobForm = ({ name, payloadText, priority, delaySeconds }) => {
  const errors = {};

  if (!name.trim()) {
    errors.name = 'Job name is required.';
  }

  let payload = {};
  if (payloadText.trim()) {
    try {
      payload = JSON.parse(payloadText);
    } catch {
      errors.payload = 'Invalid JSON.';
    }
  }

  const priorityNumber = Number(priority);
  if (!Number.isInteger(priorityNumber) || priorityNumber < 1 || priorityNumber > 10) {
    errors.priority = 'Priority must be an integer between 1 and 10.';
  }

  const delayNumber = Number(delaySeconds);
  if (!Number.isInteger(delayNumber) || delayNumber < 0) {
    errors.delay = 'Delay must be a non-negative number of seconds.';
  } else if (delayNumber > MAX_DELAY_SECONDS) {
    errors.delay = 'Delay cannot exceed 7 days.';
  }

  return { errors, payload, priority: priorityNumber, delay: delayNumber };
};
