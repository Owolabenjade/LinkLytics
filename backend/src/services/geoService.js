const geoip = require('geoip-lite');

class GeoService {
  /**
   * Lookup geographic information for an IP address
   * @param {string} ipAddress - The IP address to lookup
   * @returns {Object|null} Geographic data or null if not found
   */
  lookup(ipAddress) {
    try {
      // Clean up the IP address
      const cleanIp = this.cleanIpAddress(ipAddress);
      
      // Skip private/local IP addresses
      if (this.isPrivateIp(cleanIp)) {
        return {
          country: 'Local',
          countryCode: 'XX',
          city: 'Local',
          region: 'Local',
          latitude: null,
          longitude: null
        };
      }

      // Perform geo lookup
      const geo = geoip.lookup(cleanIp);
      
      if (!geo) {
        return null;
      }

      return {
        country: geo.country || 'Unknown',
        countryCode: geo.country || 'XX',
        city: geo.city || 'Unknown',
        region: geo.region || 'Unknown',
        latitude: geo.ll ? geo.ll[0] : null,
        longitude: geo.ll ? geo.ll[1] : null,
        timezone: geo.timezone || null
      };
    } catch (error) {
      console.error('Geo lookup error:', error);
      return null;
    }
  }

  /**
   * Clean IP address format
   * @param {string} ipAddress - Raw IP address
   * @returns {string} Cleaned IP address
   */
  cleanIpAddress(ipAddress) {
    // Remove IPv6 prefix if present
    if (ipAddress.startsWith('::ffff:')) {
      return ipAddress.substring(7);
    }
    
    // Handle IPv6 localhost
    if (ipAddress === '::1') {
      return '127.0.0.1';
    }
    
    return ipAddress;
  }

  /**
   * Check if IP is private/local
   * @param {string} ipAddress - IP address to check
   * @returns {boolean} True if private IP
   */
  isPrivateIp(ipAddress) {
    const privateRanges = [
      /^127\./,           // Localhost
      /^10\./,            // Private network
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private network
      /^192\.168\./,      // Private network
      /^localhost$/,
      /^::1$/            // IPv6 localhost
    ];

    return privateRanges.some(range => range.test(ipAddress));
  }

  /**
   * Get country flag emoji from country code
   * @param {string} countryCode - Two letter country code
   * @returns {string} Flag emoji
   */
  getCountryFlag(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '🌍';
    
    const code = countryCode.toUpperCase();
    const offset = 127397;
    const flag = String.fromCodePoint(
      code.charCodeAt(0) + offset,
      code.charCodeAt(1) + offset
    );
    
    return flag;
  }
}

module.exports = new GeoService();