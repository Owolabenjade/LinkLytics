const { sequelize } = require('../config/database');
const User = require('./User');
const Url = require('./Url');
const Click = require('./Click');
const Webhook = require('./Webhook');

// Define associations
User.hasMany(Url, { foreignKey: 'userId', as: 'urls' });
Url.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Url.hasMany(Click, { foreignKey: 'urlId', as: 'clicks' });
Click.belongsTo(Url, { foreignKey: 'urlId', as: 'url' });

User.hasMany(Webhook, { foreignKey: 'userId', as: 'webhooks' });
Webhook.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Sync database
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('✅ Database synced successfully');
  } catch (error) {
    console.error('❌ Error syncing database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Url,
  Click,
  Webhook,
  syncDatabase
};