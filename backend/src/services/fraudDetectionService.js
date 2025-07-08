const redis = require('../config/redis');

/**
 * Check if a click is potentially fraudulent
 */
const isClickFraudulent = async (ipAddress, shortCode) => {
  const key = `click_fraud:${shortCode}:${ipAddress}`;
  const windowSeconds = 10; // 10 second window
  const maxClicks = 3; // Max 3 clicks per window
  
  try {
    // Get current count
    const count = await redis.incr(key);
    
    // Set expiry on first click
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }
    
    // Check if over limit
    if (count > maxClicks) {
      console.log(`Potential click fraud detected: ${ipAddress} on ${shortCode}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Fraud detection error:', error);
    // Don't block on error
    return false;
  }
};

/**
 * Check for suspicious patterns
 */
const checkSuspiciousPatterns = async (clickData) => {
  const suspiciousIndicators = [];
  
  // Check for bot user agents
  const botPatterns = /bot|crawler|spider|scraper|headless/i;
  if (botPatterns.test(clickData.userAgent)) {
    suspiciousIndicators.push('bot_user_agent');
  }
  
  // Check for missing headers that real browsers have
  if (!clickData.userAgent || clickData.userAgent === '') {
    suspiciousIndicators.push('missing_user_agent');
  }
  
  // Check for rapid sequential clicks from different IPs (distributed attack)
  // This would require more complex analysis with time-series data
  
  return {
    isSuspicious: suspiciousIndicators.length > 0,
    indicators: suspiciousIndicators
  };
};

/**
 * Block an IP address temporarily
 */
const blockIP = async (ipAddress, duration = 3600) => {
  const key = `blocked_ip:${ipAddress}`;
  await redis.setex(key, duration, '1');
};

/**
 * Check if an IP is blocked
 */
const isIPBlocked = async (ipAddress) => {
  const key = `blocked_ip:${ipAddress}`;
  const blocked = await redis.get(key);
  return !!blocked;
};

module.exports = {
  isClickFraudulent,
  checkSuspiciousPatterns,
  blockIP,
  isIPBlocked
};