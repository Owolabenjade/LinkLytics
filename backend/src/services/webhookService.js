const axios = require('axios');
const crypto = require('crypto');
const { Op } = require('sequelize');
const Webhook = require('../models/Webhook');

/**
 * Generate webhook signature
 */
const generateSignature = (payload, secret) => {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
};

/**
 * Trigger webhooks for an event
 */
const triggerWebhooks = async (userId, event, data) => {
  try {
    // Find active webhooks for this user and event
    const webhooks = await Webhook.findAll({
      where: {
        userId,
        isActive: true,
        events: {
          [Op.contains]: [event]
        }
      }
    });

    // Trigger each webhook asynchronously
    const promises = webhooks.map(webhook => 
      sendWebhook(webhook, event, data)
    );

    // Don't wait for webhooks to complete
    Promise.all(promises).catch(err => 
      console.error('Webhook batch error:', err)
    );
  } catch (error) {
    console.error('Error triggering webhooks:', error);
  }
};

/**
 * Send a single webhook
 */
const sendWebhook = async (webhook, event, data) => {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data
  };

  const signature = generateSignature(payload, webhook.secret);

  try {
    await axios.post(webhook.url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-LinkLytics-Signature': signature,
        'X-LinkLytics-Event': event
      },
      timeout: 5000 // 5 second timeout
    });

    // Update last triggered
    await webhook.update({
      lastTriggeredAt: new Date(),
      failureCount: 0
    });
  } catch (error) {
    console.error(`Webhook failed for ${webhook.url}:`, error.message);
    
    // Increment failure count
    const newFailureCount = webhook.failureCount + 1;
    await webhook.update({
      failureCount: newFailureCount,
      // Disable after 5 consecutive failures
      isActive: newFailureCount < 5
    });
  }
};

/**
 * Check for milestone events
 */
const checkMilestones = async (url, previousClicks, newClicks) => {
  const milestones = [100, 1000, 10000, 100000];
  
  for (const milestone of milestones) {
    if (previousClicks < milestone && newClicks >= milestone) {
      await triggerWebhooks(url.userId, 'milestone', {
        url: {
          id: url.id,
          shortCode: url.shortCode,
          originalUrl: url.originalUrl
        },
        milestone,
        clicks: newClicks
      });
    }
  }
};

module.exports = {
  triggerWebhooks,
  checkMilestones,
  generateSignature
};