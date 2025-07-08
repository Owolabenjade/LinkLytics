const express = require('express');
const router = express.Router();
const urlController = require('../controllers/urlController');
const { validators, validate } = require('../utils/validators');
const { authenticate, authenticateApiKey } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// Apply API rate limiting to all routes
router.use(apiLimiter);

// Protected routes - can use either JWT or API key
router.post('/shorten',
  authenticate,
  validators.createUrl,
  validate,
  urlController.createUrl
);

router.get('/',
  authenticate,
  urlController.getUserUrls
);

router.get('/:id',
  authenticate,
  urlController.getUrl
);

router.put('/:id',
  authenticate,
  urlController.updateUrl
);

router.delete('/:id',
  authenticate,
  urlController.deleteUrl
);

// API key routes (for programmatic access)
router.post('/api/shorten',
  authenticateApiKey,
  validators.createUrl,
  validate,
  urlController.createUrl
);

module.exports = router;