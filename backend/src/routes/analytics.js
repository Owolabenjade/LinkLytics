const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// Apply API rate limiting
router.use(apiLimiter);

// All analytics routes require authentication
router.use(authenticate);

// Get analytics for specific URL
router.get('/url/:id', analyticsController.getUrlAnalytics);

// Get dashboard statistics
router.get('/dashboard', analyticsController.getDashboardStats);

module.exports = router;