const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Webhook = sequelize.define('Webhook', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isUrl: true
    }
  },
  events: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: ['click'],
    validate: {
      isValidEvents(value) {
        const validEvents = ['click', 'milestone', 'url_created', 'url_deleted'];
        const invalid = value.filter(event => !validEvents.includes(event));
        if (invalid.length > 0) {
          throw new Error(`Invalid events: ${invalid.join(', ')}`);
        }
      }
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  secret: {
    type: DataTypes.STRING,
    defaultValue: () => require('crypto').randomBytes(32).toString('hex')
  },
  lastTriggeredAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  failureCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'webhooks',
  timestamps: true
});

module.exports = Webhook;