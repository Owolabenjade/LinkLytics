'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('clicks');
    
    // Add device field if it doesn't exist
    if (!tableInfo.device) {
      await queryInterface.addColumn('clicks', 'device', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'Desktop'
      });
    }

    // Add deviceType field if it doesn't exist
    if (!tableInfo.deviceType) {
      await queryInterface.addColumn('clicks', 'deviceType', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    // Add browser field if it doesn't exist
    if (!tableInfo.browser) {
      await queryInterface.addColumn('clicks', 'browser', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    // Add browserVersion field if it doesn't exist
    if (!tableInfo.browserVersion) {
      await queryInterface.addColumn('clicks', 'browserVersion', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    // Add os field if it doesn't exist
    if (!tableInfo.os) {
      await queryInterface.addColumn('clicks', 'os', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    // Add osVersion field if it doesn't exist
    if (!tableInfo.osVersion) {
      await queryInterface.addColumn('clicks', 'osVersion', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    // Add UTM fields if they don't exist
    if (!tableInfo.utmSource) {
      await queryInterface.addColumn('clicks', 'utmSource', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.utmMedium) {
      await queryInterface.addColumn('clicks', 'utmMedium', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.utmCampaign) {
      await queryInterface.addColumn('clicks', 'utmCampaign', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.utmTerm) {
      await queryInterface.addColumn('clicks', 'utmTerm', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.utmContent) {
      await queryInterface.addColumn('clicks', 'utmContent', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    // Add boolean fields
    if (!tableInfo.isBot) {
      await queryInterface.addColumn('clicks', 'isBot', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
    }

    if (!tableInfo.isMobile) {
      await queryInterface.addColumn('clicks', 'isMobile', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
    }

    // Add indexes for better query performance
    await queryInterface.addIndex('clicks', ['device']);
    await queryInterface.addIndex('clicks', ['browser']);
    await queryInterface.addIndex('clicks', ['os']);
    await queryInterface.addIndex('clicks', ['utmSource']);
    await queryInterface.addIndex('clicks', ['utmCampaign']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('clicks', ['device']);
    await queryInterface.removeIndex('clicks', ['browser']);
    await queryInterface.removeIndex('clicks', ['os']);
    await queryInterface.removeIndex('clicks', ['utmSource']);
    await queryInterface.removeIndex('clicks', ['utmCampaign']);

    // Remove columns
    const columnsToRemove = [
      'device', 'deviceType', 'browser', 'browserVersion', 
      'os', 'osVersion', 'utmSource', 'utmMedium', 
      'utmCampaign', 'utmTerm', 'utmContent', 
      'isBot', 'isMobile'
    ];

    for (const column of columnsToRemove) {
      await queryInterface.removeColumn('clicks', column);
    }
  }
};