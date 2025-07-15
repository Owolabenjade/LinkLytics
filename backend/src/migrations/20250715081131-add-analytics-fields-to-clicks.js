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

    // Helper function to check if index exists
    const indexExists = async (tableName, indexName) => {
      const [results] = await queryInterface.sequelize.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = '${tableName}' 
        AND indexname = '${indexName}'
      `);
      return results.length > 0;
    };

    // Add indexes for better query performance (only if they don't exist)
    const indexesToAdd = [
      { column: 'device', name: 'clicks_device' },
      { column: 'browser', name: 'clicks_browser' },
      { column: 'os', name: 'clicks_os' },
      { column: 'utmSource', name: 'clicks_utm_source' },
      { column: 'utmCampaign', name: 'clicks_utm_campaign' }
    ];

    for (const index of indexesToAdd) {
      const exists = await indexExists('clicks', index.name);
      if (!exists) {
        await queryInterface.addIndex('clicks', [index.column], {
          name: index.name
        });
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Helper function to check if index exists
    const indexExists = async (tableName, indexName) => {
      const [results] = await queryInterface.sequelize.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = '${tableName}' 
        AND indexname = '${indexName}'
      `);
      return results.length > 0;
    };

    // Remove indexes (only if they exist)
    const indexesToRemove = [
      'clicks_device',
      'clicks_browser', 
      'clicks_os',
      'clicks_utm_source',
      'clicks_utm_campaign'
    ];

    for (const indexName of indexesToRemove) {
      const exists = await indexExists('clicks', indexName);
      if (exists) {
        await queryInterface.removeIndex('clicks', indexName);
      }
    }

    // Remove columns
    const columnsToRemove = [
      'device', 'deviceType', 'browser', 'browserVersion', 
      'os', 'osVersion', 'utmSource', 'utmMedium', 
      'utmCampaign', 'utmTerm', 'utmContent', 
      'isBot', 'isMobile'
    ];

    const tableInfo = await queryInterface.describeTable('clicks');
    
    for (const column of columnsToRemove) {
      if (tableInfo[column]) {
        await queryInterface.removeColumn('clicks', column);
      }
    }
  }
};
