const { RateLimiterRedis } = require('rate-limiter-flexible');
const { redis } = require('../config/db');

const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl',
  points: 60,       // 60 requests
  duration: 60,     // per 60 seconds per IP
});

module.exports = async function rateLimit(req, res, next) {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch {
    res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }
};
