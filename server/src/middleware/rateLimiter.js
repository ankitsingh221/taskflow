import rateLimit from "express-rate-limit";

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000;
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
const jobCreationRateLimiter = rateLimit({
  windowMs,
  limit: maxRequests,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many job creation requests. Please try again later.",
  },
});

export default jobCreationRateLimiter;