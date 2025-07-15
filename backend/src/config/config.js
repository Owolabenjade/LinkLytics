require('dotenv').config();

// Original config for your application
const appConfig = {
  app: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || 'development',
    name: 'LinkLytics',
    url: process.env.APP_URL || 'http://localhost:5000',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000'
  },
  database: {
    url: process.env.DATABASE_URL
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: 3600 // 1 hour default TTL
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-key',
    expiresIn: '7d'
  },
  bcrypt: {
    saltRounds: parseInt(process.env.SALT_ROUNDS) || 10
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  shortUrl: {
    length: 7, // Length of short code
    alphabet: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  }
};

// Parse DATABASE_URL to extract individual components
const parseDbUrl = (url) => {
  if (!url) return {};
  
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) return {};
  
  return {
    username: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5]
  };
};

const dbConfig = parseDbUrl(process.env.DATABASE_URL);

// Sequelize CLI configuration
const sequelizeConfig = {
  development: {
    username: dbConfig.username || 'postgres',
    password: dbConfig.password || 'postgres',
    database: dbConfig.database || 'linklytics_dev',
    host: dbConfig.host || 'localhost',
    port: dbConfig.port || 5432,
    dialect: 'postgres',
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  },
  test: {
    username: dbConfig.username || 'postgres',
    password: dbConfig.password || 'postgres',
    database: `${dbConfig.database}_test` || 'linklytics_test',
    host: dbConfig.host || 'localhost',
    port: dbConfig.port || 5432,
    dialect: 'postgres',
    logging: false
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  }
};

// Export the original config as default and Sequelize config as named export
module.exports = appConfig;
module.exports.sequelize = sequelizeConfig;

// For backwards compatibility, you can also access environments directly
module.exports.development = sequelizeConfig.development;
module.exports.test = sequelizeConfig.test;
module.exports.production = sequelizeConfig.production;