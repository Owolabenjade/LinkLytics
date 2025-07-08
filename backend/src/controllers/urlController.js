const { Url, Click } = require('../models');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const { generateUniqueShortCode } = require('../utils/generateShortCode');
const { generateQRCode } = require('../services/qrCodeService');
const redis = require('../config/redis');
const config = require('../config/config');

/**
 * Create shortened URL
 */
const createUrl = catchAsync(async (req, res, next) => {
  const { originalUrl, customAlias, title } = req.body;
  const userId = req.user.id;

  // Check if custom alias is already taken
  if (customAlias) {
    const existing = await Url.findOne({ 
      where: { 
        $or: [
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
    originalUrl,
    shortCode,
    customAlias: customAlias || null,
    title: title || originalUrl.substring(0, 200),
    userId
  });

  // Cache the URL for faster redirects
  await redis.setex(
    `url:${shortCode}`,
    config.redis.ttl,
    JSON.stringify({
      id: url.id,
      originalUrl: url.originalUrl,
      userId: url.userId
    })
  );

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
      createdAt: url.createdAt
    }
  });
});

/**
 * Get all URLs for a user
 */
const getUserUrls = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, sort = '-createdAt' } = req.query;

  // Parse sort parameter
  const order = sort.startsWith('-') 
    ? [[sort.substring(1), 'DESC']] 
    : [[sort, 'ASC']];

  // Calculate offset
  const offset = (page - 1) * limit;

  // Get URLs with pagination
  const { count, rows: urls } = await Url.findAndCountAll({
    where: { userId, isActive: true },
    order,
    limit: parseInt(limit),
    offset: parseInt(offset),
    attributes: [
      'id', 'shortCode', 'originalUrl', 'title', 
      'clicks', 'createdAt', 'updatedAt'
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
 * Get QR Code for a shortened URL
 */
const getQRCode = catchAsync(async (req, res, next) => {
  const { shortCode } = req.params;
  const { size = 300, format = 'png' } = req.query;
  
  // Verify URL exists
  const url = await Url.findOne({
    where: { shortCode, isActive: true }
  });
  
  if (!url) {
    return next(new AppError('URL not found', 404));
  }
  
  const qrCode = await generateQRCode(shortCode, {
    size: parseInt(size),
    format
  });
  
  if (format === 'base64' || format === 'svg') {
    res.json({
      success: true,
      data: { qrCode }
    });
  } else {
    res.set('Content-Type', 'image/png');
    res.send(qrCode);
  }
});

/**
 * Redirect to original URL
 */
const redirect = catchAsync(async (req, res, next) => {
  const { shortCode } = req.params;
  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'];
  const referer = req.headers['referer'] || null;

  // Check cache first
  const cached = await redis.get(`url:${shortCode}`);
  
  let url;
  if (cached) {
    const parsedCache = JSON.parse(cached);
    url = parsedCache;
    
    // Increment clicks asynchronously
    Url.incrementClicks(shortCode);
  } else {
    // Get from database
    const urlRecord = await Url.findOne({
      where: { shortCode, isActive: true }
    });

    if (!urlRecord) {
      return next(new AppError('URL not found', 404));
    }

    url = {
      id: urlRecord.id,
      originalUrl: urlRecord.originalUrl,
      userId: urlRecord.userId
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

  // Record click asynchronously (don't wait)
  Click.create({
    urlId: url.id,
    ipAddress,
    userAgent,
    referer,
    clickedAt: new Date()
  }).catch(err => console.error('Error recording click:', err));

  // Redirect
  res.redirect(301, url.originalUrl);
});

module.exports = {
  createUrl,
  getUserUrls,
  getUrl,
  updateUrl,
  deleteUrl,
  getQRCode,
  redirect
};