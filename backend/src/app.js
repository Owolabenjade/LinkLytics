const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const config = require('./config/config');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth');
const urlRoutes = require('./routes/urls');
const analyticsRoutes = require('./routes/analytics');
const webhookRoutes = require('./routes/webhooks');
const urlController = require('./controllers/urlController');
const { validators, validate } = require('./utils/validators');

// Create Express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.app.clientUrl,
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression middleware
app.use(compression());

// Logging middleware
if (config.app.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'LinkLytics API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/urls', urlRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/webhooks', webhookRoutes);

// Redirect route (main functionality)
app.get('/:shortCode', 
  validators.shortCode,
  validate,
  urlController.redirect
);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to LinkLytics API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      urls: '/api/urls',
      analytics: '/api/analytics',
      redirect: '/:shortCode'
    }
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;