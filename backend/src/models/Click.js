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
  country: {
    type: DataTypes.STRING(2),
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  device: {
    type: DataTypes.STRING,
    allowNull: true
  },
  browser: {
    type: DataTypes.STRING,
    allowNull: true
  },
  os: {
    type: DataTypes.STRING,
    allowNull: true
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
    }
  ]
});

module.exports = Click;