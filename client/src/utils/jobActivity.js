const lastTimeForAttemptStatus = (attempts, status) => {
  for (let i = attempts.length - 1; i >= 0; i -= 1) {
    if (String(attempts[i].status).toLowerCase() === status && attempts[i].completedAt) {
      return attempts[i].completedAt;
    }
  }
  return undefined;
};

export const buildJobActivity = (job, attempts = []) => {
  const events = [];
  const status = String(job.status ?? '').toLowerCase();

  if (job.createdAt) {
    events.push({ kind: 'created', title: 'Job Created', time: job.createdAt });
  }

  if (job.scheduledAt) {
    events.push({ kind: 'scheduled', title: 'Scheduled', time: job.scheduledAt });
  }

  const sortedAttempts = [...attempts].sort(
    (a, b) => (a.attemptNumber ?? 0) - (b.attemptNumber ?? 0),
  );

  sortedAttempts.forEach((attempt, index) => {
    const n = attempt.attemptNumber ?? index + 1;
    const attemptStatus = String(attempt.status ?? '').toLowerCase();

    if (index === 0) {
      const start = job.startedAt ?? attempt.startedAt;
      if (start) {
        events.push({ kind: 'started', title: 'Started', time: start });
      }
    } else if (attempt.startedAt) {
      events.push({ kind: 'retry', title: `Retry Attempt ${n}`, time: attempt.startedAt });
    }

    if (attemptStatus === 'failed' && attempt.completedAt) {
      events.push({
        kind: 'failed',
        title: `Attempt ${n} Failed`,
        time: attempt.completedAt,
        error: attempt.error,
      });
    } else if (attemptStatus === 'completed' && attempt.completedAt) {
      events.push({
        kind: 'attempt-completed',
        title: `Attempt ${n} Completed`,
        time: attempt.completedAt,
      });
    } else if (attemptStatus === 'canceled' && attempt.completedAt) {
      events.push({
        kind: 'canceled',
        title: `Attempt ${n} Canceled`,
        time: attempt.completedAt,
      });
    } else if (attemptStatus === 'active' && attempt.startedAt) {
      events.push({
        kind: 'running',
        title: `Attempt ${n} Running`,
        time: attempt.startedAt,
      });
    }
  });

  if (status === 'completed' && job.completedAt) {
    events.push({ kind: 'completed', title: 'Completed', time: job.completedAt });
  } else if (status === 'failed') {
    const time = job.failedAt ?? lastTimeForAttemptStatus(sortedAttempts, 'failed');
    events.push({
      kind: job.isDeadLetter ? 'dlq' : 'failed',
      title: job.isDeadLetter ? 'Moved to Dead Letter Queue' : 'Failed',
      time,
      error: job.error,
    });
  } else if (status === 'canceled') {
    events.push({
      kind: 'canceled',
      title: 'Canceled',
      time: lastTimeForAttemptStatus(sortedAttempts, 'canceled'),
    });
  } else if (status === 'retrying') {
    events.push({
      kind: 'retrying',
      title: 'Retry Scheduled',
      time: lastTimeForAttemptStatus(sortedAttempts, 'failed') ?? job.failedAt,
    });
  }

  return events;
};