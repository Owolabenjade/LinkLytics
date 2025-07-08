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
  },
  isABTest: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  destinations: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
    validate: {
      isValidDestinations(value) {
        if (!value || !this.isABTest) return;
        
        if (!Array.isArray(value) || value.length < 2) {
          throw new Error('A/B test requires at least 2 destinations');
        }
        
        const totalWeight = value.reduce((sum, dest) => sum + (dest.weight || 0), 0);
        if (totalWeight !== 100) {
          throw new Error('Destination weights must sum to 100');
        }
        
        value.forEach((dest, index) => {
          if (!dest.url || !dest.weight) {
            throw new Error(`Destination ${index} must have url and weight`);
          }
        });
      }
    }
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