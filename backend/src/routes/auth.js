const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validators, validate } = require('../utils/validators');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Public routes (with rate limiting)
router.post('/register', 
  authLimiter,
  validators.register, 
  validate, 
  authController.register
);

router.post('/login', 
  authLimiter,
  validators.login, 
  validate, 
  authController.login
);

// Protected routes
router.get('/me', 
  authenticate, 
  authController.getMe
);

router.put('/profile', 
  authenticate, 
  authController.updateProfile
);

router.post('/change-password', 
  authenticate, 
  authController.changePassword
);

router.post('/regenerate-api-key', 
  authenticate, 
  authController.regenerateApiKey
);

module.exports = router;