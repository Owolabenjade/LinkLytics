const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Click = sequelize.define('Click', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  urlId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'urls',
      key: 'id'
    }
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  referer: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Geographic data
  country: {
    type: DataTypes.STRING,
    allowNull: true
  },
  countryCode: {
    type: DataTypes.STRING(2),
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  region: {
    type: DataTypes.STRING,
    allowNull: true
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  // Device information
  device: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Desktop'
  },
  deviceType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  browser: {
    type: DataTypes.STRING,
    allowNull: true
  },
  browserVersion: {
    type: DataTypes.STRING,
    allowNull: true
  },
  os: {
    type: DataTypes.STRING,
    allowNull: true
  },
  osVersion: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // UTM parameters
  utmSource: {
    type: DataTypes.STRING,
    allowNull: true
  },
  utmMedium: {
    type: DataTypes.STRING,
    allowNull: true
  },
  utmCampaign: {
    type: DataTypes.STRING,
    allowNull: true
  },
  utmTerm: {
    type: DataTypes.STRING,
    allowNull: true
  },
  utmContent: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Additional metadata
  isBot: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isMobile: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  clickedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'clicks',
  timestamps: false,
  indexes: [
    {
      fields: ['urlId']
    },
    {
      fields: ['clickedAt']
    },
    {
      fields: ['country']
    },
    {
      fields: ['device']
    },
    {
      fields: ['browser']
    }
  ]
});

module.exports = Click;