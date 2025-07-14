const { Url, Click } = require('../models');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const config = require('../config/config');

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
    clicksByDevice,
    clicksByBrowser,
    clicksByOS,
    clicksByReferer,
    clicksByUTM,
    recentClicks,
    clickHeatmapData
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

    // Clicks by device
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

    // Clicks by UTM parameters
    Click.findAll({
      where: { 
        urlId: id, 
        ...dateFilter,
        [Op.or]: [
          { utmSource: { [Op.ne]: null } },
          { utmMedium: { [Op.ne]: null } },
          { utmCampaign: { [Op.ne]: null } }
        ]
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

    // Recent clicks with more details
    Click.findAll({
      where: { urlId: id },
      order: [['clickedAt', 'DESC']],
      limit: 20,
      attributes: [
        'id',
        'ipAddress', 
        'country', 
        'city', 
        'clickedAt',
        'device',
        'browser',
        'os',
        'referer'
      ]
    }),

    // Click heatmap data (day of week and hour)
    sequelize.query(`
      SELECT 
        EXTRACT(DOW FROM "clickedAt") as day_of_week,
        EXTRACT(HOUR FROM "clickedAt") as hour,
        COUNT(*) as count
      FROM clicks
      WHERE "urlId" = :urlId
        ${startDate ? 'AND "clickedAt" >= :startDate' : ''}
        ${endDate ? 'AND "clickedAt" <= :endDate' : ''}
      GROUP BY day_of_week, hour
    `, {
      replacements: { 
        urlId: id,
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) })
      },
      type: sequelize.QueryTypes.SELECT
    })
  ]);

  // Process heatmap data into 7x24 array
  const clickHeatmap = Array(7).fill(null).map(() => Array(24).fill(0));
  clickHeatmapData.forEach(({ day_of_week, hour, count }) => {
    // PostgreSQL DOW: 0 = Sunday, 1 = Monday, etc.
    clickHeatmap[parseInt(day_of_week)][parseInt(hour)] = parseInt(count);
  });

  // Format the response
  res.json({
    success: true,
    data: {
      analytics: {
        totalClicks,
        clicksByDate: clicksByDate || [],
        clicksByCountry: (clicksByCountry || []).filter(c => c.country),
        clicksByDevice: (clicksByDevice || []).filter(d => d.device),
        clicksByBrowser: (clicksByBrowser || []).filter(b => b.browser),
        clicksByOS: (clicksByOS || []).filter(o => o.os),
        clicksByReferer: (clicksByReferer || []).filter(r => r.referer),
        clicksByUTM: clicksByUTM || [],
        recentClicks: recentClicks.map(click => ({
          id: click.id,
          clickedAt: click.clickedAt,
          country: click.country || 'Unknown',
          city: click.city || 'Unknown',
          device: click.device || 'Unknown',
          browser: click.browser || 'Unknown',
          os: click.os || 'Unknown',
          referer: click.referer || null
        })),
        clickHeatmap
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
    topUrls,
    clickGrowth,
    deviceBreakdown
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
      attributes: ['id', 'shortCode', 'originalUrl', 'title', 'clicks', 'createdAt']
    }),

    // Calculate click growth (compare to previous period)
    sequelize.query(`
      SELECT 
        COUNT(CASE WHEN c."clickedAt" >= :startDate THEN 1 END) as current_period,
        COUNT(CASE WHEN c."clickedAt" < :startDate AND c."clickedAt" >= :previousStartDate THEN 1 END) as previous_period
      FROM clicks c
      INNER JOIN urls u ON c."urlId" = u.id
      WHERE u."userId" = :userId
    `, {
      replacements: { 
        userId, 
        startDate,
        previousStartDate: new Date(startDate.getTime() - (days * 24 * 60 * 60 * 1000))
      },
      type: sequelize.QueryTypes.SELECT
    }),

    // Device breakdown for dashboard
    sequelize.query(`
      SELECT 
        c.device,
        COUNT(*) as count
      FROM clicks c
      INNER JOIN urls u ON c."urlId" = u.id
      WHERE u."userId" = :userId
        AND c."clickedAt" >= :startDate
        AND c.device IS NOT NULL
      GROUP BY c.device
      ORDER BY count DESC
    `, {
      replacements: { userId, startDate },
      type: sequelize.QueryTypes.SELECT
    })
  ]);

  // Calculate average clicks per URL
  const averageClicksPerUrl = totalUrls > 0 
    ? Math.round(totalClicks / totalUrls) 
    : 0;

  // Calculate growth percentage
  const growthData = clickGrowth[0] || { current_period: 0, previous_period: 0 };
  const growthPercentage = growthData.previous_period > 0
    ? Math.round(((growthData.current_period - growthData.previous_period) / growthData.previous_period) * 100)
    : 0;

  res.json({
    success: true,
    data: {
      overview: {
        totalUrls,
        totalClicks,
        urlsCreatedRecently,
        averageClicksPerUrl,
        clickGrowth: {
          percentage: growthPercentage,
          current: parseInt(growthData.current_period),
          previous: parseInt(growthData.previous_period)
        }
      },
      clicksByDate: clicksByDate || [],
      topUrls: topUrls.map(url => ({
        ...url.toJSON(),
        shortUrl: `${config.app.url}/${url.shortCode}`
      })),
      deviceBreakdown: deviceBreakdown || []
    }
  });
});

module.exports = {
  getUrlAnalytics,
  getDashboardStats
};