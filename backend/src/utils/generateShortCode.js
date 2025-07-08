const config = require('../config/config');

/**
 * Generate a random short code for URLs
 * @param {number} length - Length of the short code
 * @returns {string} - Random short code
 */
const generateShortCode = (length = config.shortUrl.length) => {
  const alphabet = config.shortUrl.alphabet;
  let shortCode = '';
  
  for (let i = 0; i < length; i++) {
    shortCode += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  
  return shortCode;
};

/**
 * Generate a unique short code by checking against existing ones
 * @param {Object} UrlModel - The URL model to check against
 * @returns {Promise<string>} - Unique short code
 */
const generateUniqueShortCode = async (UrlModel) => {
  let shortCode;
  let exists = true;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (exists && attempts < maxAttempts) {
    shortCode = generateShortCode();
    const url = await UrlModel.findOne({ where: { shortCode } });
    exists = !!url;
    attempts++;
  }
  
  if (attempts === maxAttempts) {
    // If we can't generate a unique code in 10 attempts, increase length
    shortCode = generateShortCode(config.shortUrl.length + 2);
  }
  
  return shortCode;
};

module.exports = {
  generateShortCode,
  generateUniqueShortCode
};