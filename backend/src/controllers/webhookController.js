const Webhook = require('../models/Webhook');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const { generateSignature } = require('../services/webhookService');

/**
 * Create a new webhook
 */
const createWebhook = catchAsync(async (req, res, next) => {
  const { url, events } = req.body;
  const userId = req.user.id;

  // Check if user already has a webhook for this URL
  const existing = await Webhook.findOne({
    where: { userId, url }
  });

  if (existing) {
    return next(new AppError('Webhook already exists for this URL', 400));
  }

  // Create webhook
  const webhook = await Webhook.create({
    userId,
    url,
    events
  });

  res.status(201).json({
    success: true,
    message: 'Webhook created successfully',
    data: {
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret,
        isActive: webhook.isActive,
        createdAt: webhook.createdAt
      }
    }
  });
});

/**
 * Get all webhooks for a user
 */
const getWebhooks = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const webhooks = await Webhook.findAll({
    where: { userId },
    attributes: [
      'id', 'url', 'events', 'isActive', 
      'lastTriggeredAt', 'failureCount', 'createdAt'
    ],
    order: [['createdAt', 'DESC']]
  });

  res.json({
    success: true,
    data: { webhooks }
  });
});

/**
 * Update webhook
 */
const updateWebhook = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { events, isActive } = req.body;
  const userId = req.user.id;

  const webhook = await Webhook.findOne({
    where: { id, userId }
  });

  if (!webhook) {
    return next(new AppError('Webhook not found', 404));
  }

  // Update webhook
  await webhook.update({
    events: events || webhook.events,
    isActive: isActive !== undefined ? isActive : webhook.isActive,
    // Reset failure count if reactivating
    failureCount: isActive ? 0 : webhook.failureCount
  });

  res.json({
    success: true,
    message: 'Webhook updated successfully',
    data: {
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive
      }
    }
  });
});

/**
 * Delete webhook
 */
const deleteWebhook = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const webhook = await Webhook.findOne({
    where: { id, userId }
  });

  if (!webhook) {
    return next(new AppError('Webhook not found', 404));
  }

  await webhook.destroy();

  res.json({
    success: true,
    message: 'Webhook deleted successfully'
  });
});

/**
 * Test webhook
 */
const testWebhook = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const webhook = await Webhook.findOne({
    where: { id, userId }
  });

  if (!webhook) {
    return next(new AppError('Webhook not found', 404));
  }

  // Send test payload
  const testPayload = {
    event: 'test',
    timestamp: new Date().toISOString(),
    data: {
      message: 'This is a test webhook from LinkLytics'
    }
  };

  const signature = generateSignature(testPayload, webhook.secret);

  try {
    const axios = require('axios');
    await axios.post(webhook.url, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-LinkLytics-Signature': signature,
        'X-LinkLytics-Event': 'test'
      },
      timeout: 5000
    });

    res.json({
      success: true,
      message: 'Test webhook sent successfully'
    });
  } catch (error) {
    return next(new AppError(`Webhook test failed: ${error.message}`, 400));
  }
});

module.exports = {
  createWebhook,
  getWebhooks,
  updateWebhook,
  deleteWebhook,
  testWebhook
};