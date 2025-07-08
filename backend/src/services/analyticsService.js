const useragent = require('useragent');
const axios = require('axios');

/**
 * Parse user agent string to extract device, browser, and OS info
 */
const parseUserAgent = (userAgentString) => {
  const agent = useragent.parse(userAgentString);
  
  // Determine device type
  let deviceType = 'desktop';
  const ua = userAgentString.toLowerCase();
  
  if (/tablet|ipad|kindle|silk/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) {
    deviceType = 'mobile';
  }
  
  return {
    device: deviceType,
    browser: agent.family,
    browserVersion: agent.toVersion(),
    os: agent.os.family,
    osVersion: agent.os.toVersion()
  };
};

/**
 * Get geolocation data from IP address
 */
const getGeolocation = async (ipAddress) => {
  try {
    // Skip for localhost/private IPs
    if (ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress.startsWith('192.168')) {
      return {
        country: 'XX',
        city: 'Unknown',
        region: 'Unknown'
      };
    }

    // Using ipapi.co free tier
    const response = await axios.get(`https://ipapi.co/${ipAddress}/json/`, {
      timeout: 3000 // 3 second timeout
    });
    
    return {
      country: response.data.country_code || 'XX',
      city: response.data.city || 'Unknown',
      region: response.data.region || 'Unknown',
      latitude: response.data.latitude,
      longitude: response.data.longitude
    };
  } catch (error) {
    console.error('Geolocation error:', error.message);
    return {
      country: 'XX',
      city: 'Unknown',
      region: 'Unknown'
    };
  }
};

/**
 * Extract UTM parameters from URL
 */
const extractUTMParams = (url) => {
  if (!url) return {};
  
  try {
    const urlObj = new URL(url);
    const utmParams = {};
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    
    utmKeys.forEach(key => {
      const value = urlObj.searchParams.get(key);
      if (value) {
        utmParams[key] = value;
      }
    });
    
    return utmParams;
  } catch (error) {
    return {};
  }
};

/**
 * Generate click heatmap data
 */
const generateClickHeatmap = (clicks) => {
  // Initialize 24x7 grid (hours x days)
  const heatmap = Array(7).fill(null).map(() => Array(24).fill(0));
  
  clicks.forEach(click => {
    const date = new Date(click.clickedAt);
    const dayOfWeek = date.getDay(); // 0-6
    const hour = date.getHours(); // 0-23
    heatmap[dayOfWeek][hour]++;
  });
  
  return heatmap;
};

module.exports = {
  parseUserAgent,
  getGeolocation,
  extractUTMParams,
  generateClickHeatmap
};