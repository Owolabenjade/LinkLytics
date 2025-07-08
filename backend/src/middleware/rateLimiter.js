const rateLimit = require('express-rate-limit');
const redis = require('../config/redis');
const config = require('../config/config');

// Create a custom store using Redis
class RedisStore {
  constructor(client) {
    this.client = client;
  }

  async increment(key) {
    const multi = this.client.multi();
    const ttl = config.rateLimit.windowMs / 1000; // Convert to seconds
    
    multi.incr(key);
    multi.expire(key, ttl);
    
    const results = await multi.exec();
    return results[0][1]; // Return the count
  }

  async decrement(key) {
    return await this.client.decr(key);
  }

  async resetKey(key) {
    return await this.client.del(key);
  }
}

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore(redis),
  keyGenerator: (req) => {
    return `rate_limit:${req.ip}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore(redis),
  keyGenerator: (req) => {
    return `auth_limit:${req.ip}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// API rate limiter (more generous for authenticated users)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    // Authenticated users get more requests
    return req.user ? 1000 : 100;
  },
  message: {
    success: false,
    message: 'API rate limit exceeded.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore(redis),
  keyGenerator: (req) => {
    // Use user ID for authenticated users, IP for others
    return req.user 
      ? `api_limit:user:${req.user.id}`
      : `api_limit:ip:${req.ip}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'API rate limit exceeded.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  apiLimiter
};