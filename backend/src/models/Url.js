const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Url = sequelize.define('Url', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  originalUrl: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      isUrl: true
    }
  },
  shortCode: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
    index: true
  },
  customAlias: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  clicks: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'urls',
  timestamps: true,
  indexes: [
    {
      fields: ['shortCode']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['createdAt']
    }
  ]
});

// Class methods
Url.incrementClicks = async function(shortCode) {
  const url = await this.findOne({ where: { shortCode, isActive: true } });
  if (url) {
    await url.increment('clicks');
    return url;
  }
  return null;
};

module.exports = Url;