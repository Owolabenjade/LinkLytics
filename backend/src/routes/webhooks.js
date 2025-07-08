const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { authenticate } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { body } = require('express-validator');
const { validate } = require('../utils/validators');

// Apply rate limiting
router.use(apiLimiter);

// All webhook routes require authentication
router.use(authenticate);

// Validation rules
const webhookValidation = [
  body('url')
    .isURL({ protocols: ['https'] })
    .withMessage('Webhook URL must be a valid HTTPS URL'),
  body('events')
    .isArray()
    .withMessage('Events must be an array')
    .custom(events => {
      const validEvents = ['click', 'milestone', 'url_created', 'url_deleted'];
      return events.every(event => validEvents.includes(event));
    })
    .withMessage('Invalid event type')
];

// Routes
router.post('/', webhookValidation, validate, webhookController.createWebhook);
router.get('/', webhookController.getWebhooks);
router.put('/:id', webhookController.updateWebhook);
router.delete('/:id', webhookController.deleteWebhook);
router.post('/:id/test', webhookController.testWebhook);

module.exports = router;