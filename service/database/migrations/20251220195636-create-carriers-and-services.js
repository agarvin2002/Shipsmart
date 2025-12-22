'use strict';

module.exports = {
  up: async function(queryInterface, Sequelize) {
    // Create carriers table
    await queryInterface.createTable('carriers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      logo_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      base_url: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      endpoints: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      headers: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      auth_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      required_credentials: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      },
      timeout_ms: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30000
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add index on code
    await queryInterface.addIndex('carriers', ['code'], {
      name: 'carriers_code_idx',
      unique: true
    });

    // Add index on is_active
    await queryInterface.addIndex('carriers', ['is_active'], {
      name: 'carriers_is_active_idx'
    });

    // Create carrier_services table
    await queryInterface.createTable('carrier_services', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      carrier_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'carriers',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      service_code: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      service_name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add composite unique index on carrier_id and service_code
    await queryInterface.addIndex('carrier_services', ['carrier_id', 'service_code'], {
      name: 'carrier_services_carrier_id_service_code_idx',
      unique: true
    });

    // Add index on carrier_id
    await queryInterface.addIndex('carrier_services', ['carrier_id'], {
      name: 'carrier_services_carrier_id_idx'
    });

    // Add index on category
    await queryInterface.addIndex('carrier_services', ['category'], {
      name: 'carrier_services_category_idx'
    });

    // Add selected_service_ids column to carrier_credentials table
    await queryInterface.sequelize.query(
      "ALTER TABLE carrier_credentials ADD COLUMN selected_service_ids INTEGER[] DEFAULT NULL;"
    );

    // Add comment to selected_service_ids column
    await queryInterface.sequelize.query(
      "COMMENT ON COLUMN carrier_credentials.selected_service_ids IS 'Array of carrier_service IDs user has enabled. NULL means all services.';"
    );
  },

  down: async function(queryInterface, Sequelize) {
    // Remove selected_service_ids column from carrier_credentials
    await queryInterface.removeColumn('carrier_credentials', 'selected_service_ids');

    // Drop indexes for carrier_services
    await queryInterface.removeIndex('carrier_services', 'carrier_services_category_idx');
    await queryInterface.removeIndex('carrier_services', 'carrier_services_carrier_id_idx');
    await queryInterface.removeIndex('carrier_services', 'carrier_services_carrier_id_service_code_idx');

    // Drop carrier_services table
    await queryInterface.dropTable('carrier_services');

    // Drop indexes for carriers
    await queryInterface.removeIndex('carriers', 'carriers_is_active_idx');
    await queryInterface.removeIndex('carriers', 'carriers_code_idx');

    // Drop carriers table
    await queryInterface.dropTable('carriers');
  }
};
