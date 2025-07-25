const { Url, Click } = require('../models');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const { generateUniqueShortCode } = require('../utils/generateShortCode');
const redis = require('../config/redis');
const config = require('../config/config');
const { parseUserAgent, getGeolocation, extractUTMParams } = require('../services/analyticsService');
const { triggerWebhooks, checkMilestones } = require('../services/webhookService');
const { isClickFraudulent, isIPBlocked } = require('../services/fraudDetectionService');
const geoService = require('../services/geoService');
const { Op } = require('sequelize');
const QRCode = require('qrcode');
const UAParser = require('ua-parser-js');

/**
 * Create shortened URL
 */
const createUrl = catchAsync(async (req, res, next) => {
  const { originalUrl, customAlias, title, isABTest, destinations } = req.body;
  const userId = req.user.id;

  // Validate A/B test configuration
  if (isABTest) {
    if (!destinations || !Array.isArray(destinations) || destinations.length < 2) {
      return next(new AppError('A/B test requires at least 2 destinations', 400));
    }
    
    const totalWeight = destinations.reduce((sum, dest) => sum + (dest.weight || 0), 0);
    if (totalWeight !== 100) {
      return next(new AppError('Destination weights must sum to 100%', 400));
    }
  }

  // Check if custom alias is already taken
  if (customAlias) {
    const existing = await Url.findOne({ 
      where: { 
        [Op.or]: [
          { shortCode: customAlias },
          { customAlias: customAlias }
        ]
      } 
    });
    if (existing) {
      return next(new AppError('Custom alias is already taken', 400));
    }
  }

  // Generate short code
  const shortCode = customAlias || await generateUniqueShortCode(Url);

  // Create URL record
  const url = await Url.create({
    originalUrl: isABTest ? destinations[0].url : originalUrl,
    shortCode,
    customAlias: customAlias || null,
    title: title || (isABTest ? 'A/B Test' : originalUrl.substring(0, 200)),
    userId,
    isABTest,
    destinations: isABTest ? destinations : null
  });

  // Cache the URL for faster redirects
  await redis.setex(
    `url:${shortCode}`,
    config.redis.ttl,
    JSON.stringify({
      id: url.id,
      originalUrl: url.originalUrl,
      userId: url.userId,
      isABTest: url.isABTest,
      destinations: url.destinations
    })
  );

  // Trigger webhook for URL creation
  await triggerWebhooks(userId, 'url_created', {
    url: {
      id: url.id,
      shortCode: url.shortCode,
      originalUrl: url.originalUrl,
      isABTest: url.isABTest
    }
  });

  const shortUrl = `${config.app.url}/${shortCode}`;

  res.status(201).json({
    success: true,
    message: 'URL shortened successfully',
    data: {
      id: url.id,
      shortUrl,
      shortCode: url.shortCode,
      originalUrl: url.originalUrl,
      title: url.title,
      clicks: url.clicks,
      isABTest: url.isABTest,
      destinations: url.destinations,
      createdAt: url.createdAt
    }
  });
});

/**
 * Get all URLs for a user
 */
const getUserUrls = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { 
    page = 1, 
    limit = 20, 
    sort = '-createdAt',
    search,
    dateFrom,
    dateTo,
    hasABTest
  } = req.query;

  // Build where clause
  const where = { userId, isActive: true };
  
  // Add search filter
  if (search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { originalUrl: { [Op.iLike]: `%${search}%` } },
      { shortCode: { [Op.iLike]: `%${search}%` } }
    ];
  }
  
  // Add date filters
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
    if (dateTo) where.createdAt[Op.lte] = new Date(dateTo);
  }
  
  // Add A/B test filter
  if (hasABTest !== undefined) {
    where.isABTest = hasABTest === 'true';
  }

  // Parse sort parameter
  const order = sort.startsWith('-') 
    ? [[sort.substring(1), 'DESC']] 
    : [[sort, 'ASC']];

  // Calculate offset
  const offset = (page - 1) * limit;

  // Get URLs with pagination
  const { count, rows: urls } = await Url.findAndCountAll({
    where,
    order,
    limit: parseInt(limit),
    offset: parseInt(offset),
    attributes: [
      'id', 'shortCode', 'originalUrl', 'title', 
      'clicks', 'isABTest', 'destinations', 'createdAt', 'updatedAt'
    ]
  });

  // Add short URLs to response
  const urlsWithShortLinks = urls.map(url => ({
    ...url.toJSON(),
    shortUrl: `${config.app.url}/${url.shortCode}`
  }));

  res.json({
    success: true,
    data: {
      urls: urlsWithShortLinks,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    }
  });
});

/**
 * Get URL details
 */
const getUrl = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const url = await Url.findOne({
    where: { id, userId, isActive: true }
  });

  if (!url) {
    return next(new AppError('URL not found', 404));
  }

  res.json({
    success: true,
    data: {
      url: {
        ...url.toJSON(),
        shortUrl: `${config.app.url}/${url.shortCode}`
      }
    }
  });
});

/**
 * Update URL
 */
const updateUrl = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { title } = req.body;
  const userId = req.user.id;

  const url = await Url.findOne({
    where: { id, userId, isActive: true }
  });

  if (!url) {
    return next(new AppError('URL not found', 404));
  }

  // Update URL
  await url.update({ title });

  res.json({
    success: true,
    message: 'URL updated successfully',
    data: {
      url: {
        ...url.toJSON(),
        shortUrl: `${config.app.url}/${url.shortCode}`
      }
    }
  });
});

/**
 * Delete URL (soft delete)
 */
const deleteUrl = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const url = await Url.findOne({
    where: { id, userId, isActive: true }
  });

  if (!url) {
    return next(new AppError('URL not found', 404));
  }

  // Soft delete
  await url.update({ isActive: false });

  // Remove from cache
  await redis.del(`url:${url.shortCode}`);

  res.json({
    success: true,
    message: 'URL deleted successfully'
  });
});

/**
 * Redirect to original URL with enhanced analytics
 */
const redirect = catchAsync(async (req, res, next) => {
  const { shortCode } = req.params;
  const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   req.ip;
  const userAgent = req.headers['user-agent'];
  const referer = req.headers['referer'] || req.headers['referrer'] || null;

  // Check if IP is blocked
  if (await isIPBlocked(ipAddress)) {
    return next(new AppError('Access denied', 403));
  }

  // Check for click fraud
  if (await isClickFraudulent(ipAddress, shortCode)) {
    return next(new AppError('Too many requests', 429));
  }

  // Check cache first
  const cached = await redis.get(`url:${shortCode}`);
  
  let url;
  if (cached) {
    const parsedCache = JSON.parse(cached);
    url = parsedCache;
    
    // Increment clicks asynchronously
    Url.increment('clicks', { where: { shortCode } });
  } else {
    // Get from database
    const urlRecord = await Url.findOne({
      where: { shortCode, isActive: true }
    });

    if (!urlRecord) {
      // Custom 404 page redirect
      return res.status(404).send('URL not found');
    }

    // Check if URL has expired
    if (urlRecord.expiresAt && new Date() > urlRecord.expiresAt) {
      return res.status(410).send('URL has expired');
    }

    url = {
      id: urlRecord.id,
      originalUrl: urlRecord.originalUrl,
      userId: urlRecord.userId,
      isABTest: urlRecord.isABTest,
      destinations: urlRecord.destinations,
      clicks: urlRecord.clicks
    };

    // Cache for next time
    await redis.setex(
      `url:${shortCode}`,
      config.redis.ttl,
      JSON.stringify(url)
    );

    // Increment clicks
    await urlRecord.increment('clicks');
  }

  // Parse user agent using UAParser
  const parser = new UAParser();
  const ua = parser.setUA(userAgent).getResult();
  
  // Determine device type
  let device = 'Desktop';
  let deviceType = 'desktop';
  let isMobile = false;
  
  if (ua.device.type) {
    if (ua.device.type === 'mobile') {
      device = 'Mobile';
      deviceType = 'mobile';
      isMobile = true;
    } else if (ua.device.type === 'tablet') {
      device = 'Tablet';
      deviceType = 'tablet';
      isMobile = true;
    }
  }

  // Extract UTM parameters from query string
  const { 
    utm_source, utm_medium, utm_campaign, 
    utm_term, utm_content 
  } = req.query;

  // Check if it's a bot
  const botPatterns = /bot|crawler|spider|scraper|facebookexternalhit|whatsapp|telegram|slack/i;
  const isBot = botPatterns.test(userAgent);

  // Determine destination URL for A/B tests
  let destinationUrl = url.originalUrl;
  let selectedVariant = null;

  if (url.isABTest && url.destinations) {
    // Calculate which variant to show based on weights
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (let i = 0; i < url.destinations.length; i++) {
      cumulative += url.destinations[i].weight;
      if (random <= cumulative) {
        destinationUrl = url.destinations[i].url;
        selectedVariant = i;
        break;
      }
    }
  }

  // Create click record
  try {
    const clickData = {
      urlId: url.id,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      referer: referer || null,
      // Device information
      device: device,
      deviceType: deviceType,
      browser: ua.browser.name || 'Unknown',
      browserVersion: ua.browser.version || null,
      os: ua.os.name || 'Unknown',
      osVersion: ua.os.version || null,
      // UTM parameters
      utmSource: utm_source || null,
      utmMedium: utm_medium || null,
      utmCampaign: utm_campaign || null,
      utmTerm: utm_term || null,
      utmContent: utm_content || null,
      // Metadata
      isBot: isBot,
      isMobile: isMobile,
      clickedAt: new Date()
    };

    // Get geolocation data
    if (ipAddress && geoService) {
      try {
        const geoData = await geoService.lookup(ipAddress);
        if (geoData) {
          clickData.country = geoData.country;
          clickData.countryCode = geoData.countryCode;
          clickData.city = geoData.city;
          clickData.region = geoData.region;
          clickData.latitude = geoData.latitude;
          clickData.longitude = geoData.longitude;
        }
      } catch (geoError) {
        console.error('Geo lookup error:', geoError);
      }
    }

    await Click.create(clickData);

    // Trigger webhooks asynchronously
    setImmediate(async () => {
      try {
        // Trigger click webhook
        await triggerWebhooks(url.userId, 'click', {
          url: {
            id: url.id,
            shortCode,
            originalUrl: url.originalUrl
          },
          click: {
            ipAddress,
            country: clickData.country,
            city: clickData.city,
            device: device,
            browser: ua.browser.name,
            referer,
            variant: selectedVariant
          }
        });

        // Check for milestones
        if (url.clicks) {
          await checkMilestones(
            { id: url.id, shortCode, originalUrl: url.originalUrl, userId: url.userId }, 
            url.clicks, 
            url.clicks + 1
          );
        }
      } catch (err) {
        console.error('Error in post-click processing:', err);
      }
    });
  } catch (error) {
    console.error('Error recording click:', error);
    // Don't block the redirect if analytics fails
  }

  // Redirect
  res.redirect(301, destinationUrl);
});

/**
 * Generate QR code for shortened URL
 */
const getQRCode = catchAsync(async (req, res, next) => {
  const { shortCode } = req.params;
  const { size = 200, format = 'png' } = req.query;

  // Check if URL exists
  const url = await Url.findOne({
    where: { shortCode, isActive: true }
  });

  if (!url) {
    return next(new AppError('URL not found', 404));
  }

  // Check if URL has expired
  if (url.expiresAt && new Date() > url.expiresAt) {
    return next(new AppError('URL has expired', 410));
  }

  const shortUrl = `${config.app.url}/${shortCode}`;
  
  try {
    // Generate QR code based on format
    if (format === 'svg') {
      const qrSvg = await QRCode.toString(shortUrl, {
        type: 'svg',
        width: parseInt(size),
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(qrSvg);
    } else {
      // Default to PNG
      const qrBuffer = await QRCode.toBuffer(shortUrl, {
        width: parseInt(size),
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      res.setHeader('Content-Type', 'image/png');
      res.send(qrBuffer);
    }
  } catch (error) {
    return next(new AppError('Error generating QR code', 500));
  }
});

module.exports = {
  createUrl,
  getUserUrls,
  getUrl,
  updateUrl,
  deleteUrl,
  redirect,
  getQRCode
};