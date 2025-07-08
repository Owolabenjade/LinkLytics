const { Url, Click } = require('../models');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { generateClickHeatmap } = require('../services/analyticsService');

/**
 * Get analytics for a specific URL
 */
const getUrlAnalytics = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { startDate, endDate } = req.query;

  // Verify URL ownership
  const url = await Url.findOne({
    where: { id, userId, isActive: true }
  });

  if (!url) {
    return next(new AppError('URL not found', 404));
  }

  // Build date filter
  const dateFilter = {};
  if (startDate) {
    dateFilter.clickedAt = { 
      [Op.gte]: new Date(startDate) 
    };
  }
  if (endDate) {
    dateFilter.clickedAt = {
      ...dateFilter.clickedAt,
      [Op.lte]: new Date(endDate)
    };
  }

  // Get click statistics
  const [
    totalClicks,
    clicksByDate,
    clicksByCountry,
    clicksByReferer,
    clicksByDevice,
    clicksByBrowser,
    clicksByOS,
    clicksByUTM,
    recentClicks,
    allClicks
  ] = await Promise.all([
    // Total clicks
    Click.count({
      where: { urlId: id, ...dateFilter }
    }),

    // Clicks by date
    Click.findAll({
      where: { urlId: id, ...dateFilter },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('clickedAt')), 'date'],
        [sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['date'],
      order: [['date', 'ASC']],
      raw: true
    }),

    // Clicks by country
    Click.findAll({
      where: { urlId: id, ...dateFilter },
      attributes: [
        'country',
        [sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['country'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 10,
      raw: true
    }),

    // Clicks by referer
    Click.findAll({
      where: { urlId: id, ...dateFilter },
      attributes: [
        'referer',
        [sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['referer'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 10,
      raw: true
    }),

    // Clicks by device type
    Click.findAll({
      where: { urlId: id, ...dateFilter },
      attributes: [
        'device',
        [sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['device'],
      order: [[sequelize.literal('count'), 'DESC']],
      raw: true
    }),

    // Clicks by browser
    Click.findAll({
      where: { urlId: id, ...dateFilter },
      attributes: [
        'browser',
        [sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['browser'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 10,
      raw: true
    }),

    // Clicks by OS
    Click.findAll({
      where: { urlId: id, ...dateFilter },
      attributes: [
        'os',
        [sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['os'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 10,
      raw: true
    }),

    // UTM campaign performance
    Click.findAll({
      where: { 
        urlId: id, 
        ...dateFilter,
        utmCampaign: { [Op.not]: null }
      },
      attributes: [
        'utmSource',
        'utmMedium',
        'utmCampaign',
        [sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['utmSource', 'utmMedium', 'utmCampaign'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 10,
      raw: true
    }),

    // Recent clicks
    Click.findAll({
      where: { urlId: id },
      order: [['clickedAt', 'DESC']],
      limit: 10,
      attributes: ['ipAddress', 'country', 'city', 'device', 'browser', 'clickedAt']
    }),

    // All clicks for heatmap
    Click.findAll({
      where: { urlId: id, ...dateFilter },
      attributes: ['clickedAt'],
      raw: true
    })
  ]);

  // Generate click heatmap
  const clickHeatmap = generateClickHeatmap(allClicks);

  res.json({
    success: true,
    data: {
      url: {
        id: url.id,
        shortCode: url.shortCode,
        originalUrl: url.originalUrl,
        title: url.title,
        isABTest: url.isABTest,
        createdAt: url.createdAt
      },
      analytics: {
        totalClicks,
        clicksByDate,
        clicksByCountry: clicksByCountry.filter(c => c.country),
        clicksByReferer: clicksByReferer.filter(r => r.referer),
        clicksByDevice: clicksByDevice.filter(d => d.device),
        clicksByBrowser: clicksByBrowser.filter(b => b.browser),
        clicksByOS: clicksByOS.filter(o => o.os),
        clicksByUTM,
        clickHeatmap,
        recentClicks
      }
    }
  });
});

/**
 * Get dashboard statistics
 */
const getDashboardStats = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { days = 7 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get statistics
  const [
    totalUrls,
    totalClicks,
    urlsCreatedRecently,
    clicksByDate,
    topUrls
  ] = await Promise.all([
    // Total URLs
    Url.count({
      where: { userId, isActive: true }
    }),

    // Total clicks across all URLs
    Click.count({
      include: [{
        model: Url,
        as: 'url',
        where: { userId },
        attributes: []
      }]
    }),

    // URLs created recently
    Url.count({
      where: {
        userId,
        isActive: true,
        createdAt: { [Op.gte]: startDate }
      }
    }),

    // Clicks by date for the period
    sequelize.query(`
      SELECT 
        DATE(c."clickedAt") as date,
        COUNT(*) as count
      FROM clicks c
      INNER JOIN urls u ON c."urlId" = u.id
      WHERE u."userId" = :userId
        AND c."clickedAt" >= :startDate
      GROUP BY DATE(c."clickedAt")
      ORDER BY date ASC
    `, {
      replacements: { userId, startDate },
      type: sequelize.QueryTypes.SELECT
    }),

    // Top performing URLs
    Url.findAll({
      where: { userId, isActive: true },
      order: [['clicks', 'DESC']],
      limit: 5,
      attributes: ['id', 'shortCode', 'originalUrl', 'title', 'clicks']
    })
  ]);

  // Calculate average clicks per URL
  const averageClicksPerUrl = totalUrls > 0 
    ? Math.round(totalClicks / totalUrls) 
    : 0;

  res.json({
    success: true,
    data: {
      overview: {
        totalUrls,
        totalClicks,
        urlsCreatedRecently,
        averageClicksPerUrl
      },
      clicksByDate,
      topUrls: topUrls.map(url => ({
        ...url.toJSON(),
        shortUrl: `${config.app.url}/${url.shortCode}`
      }))
    }
  });
});

module.exports = {
  getUrlAnalytics,
  getDashboardStats
};