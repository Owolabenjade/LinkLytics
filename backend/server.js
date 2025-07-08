require('dotenv').config();
const app = require('./src/app');
const config = require('./src/config/config');
const { testConnection } = require('./src/config/database');
const { syncDatabase } = require('./src/models');
const redis = require('./src/config/redis');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Initialize server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Sync database models
    await syncDatabase(false); // Set to true to drop tables and recreate
    
    // Test Redis connection
    await redis.ping();
    
    // Start server
    const PORT = config.app.port;
    const server = app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`📱 Environment: ${config.app.env}`);
      console.log(`🔗 URL: ${config.app.url}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION! 💥 Shutting down...');
      console.error(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
      server.close(() => {
        console.log('💥 Process terminated!');
      });
    });

  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();