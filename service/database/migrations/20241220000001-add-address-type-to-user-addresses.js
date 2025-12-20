'use strict';

module.exports = {
  up: async function(queryInterface, Sequelize) {
    // Create ENUM type for address_type
    await queryInterface.sequelize.query(
      "DO $$ BEGIN " +
      "CREATE TYPE enum_user_addresses_address_type AS ENUM('source', 'destination'); " +
      "EXCEPTION " +
      "WHEN duplicate_object THEN null; " +
      "END $$;"
    );

    // Add address_type column with default value
    await queryInterface.sequelize.query(
      "ALTER TABLE user_addresses ADD COLUMN address_type enum_user_addresses_address_type NOT NULL DEFAULT 'source';"
    );

    // Add comment to address_type column
    await queryInterface.sequelize.query(
      "COMMENT ON COLUMN user_addresses.address_type IS 'Type of address: source (origin/from) or destination (to)';"
    );

    // Update comment on is_default column
    await queryInterface.sequelize.query(
      "COMMENT ON COLUMN user_addresses.is_default IS 'Only applicable for source addresses. One default source per user allowed.';"
    );

    // Create index on user_id and address_type
    await queryInterface.addIndex('user_addresses', ['user_id', 'address_type'], {
      name: 'user_addresses_user_id_address_type'
    });

    // Create composite index on user_id, address_type, and is_default
    await queryInterface.addIndex('user_addresses', ['user_id', 'address_type', 'is_default'], {
      name: 'user_addresses_user_id_address_type_is_default'
    });

    // Remove old index if exists (will be replaced by composite indexes above)
    await queryInterface.sequelize.query(
      "DROP INDEX IF EXISTS user_addresses_user_id_is_default;"
    );
  },

  down: async function(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('user_addresses', 'user_addresses_user_id_address_type');
    await queryInterface.removeIndex('user_addresses', 'user_addresses_user_id_address_type_is_default');

    // Remove column
    await queryInterface.removeColumn('user_addresses', 'address_type');

    // Drop ENUM type
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_user_addresses_address_type;"
    );

    // Recreate old index
    await queryInterface.addIndex('user_addresses', ['user_id', 'is_default'], {
      name: 'user_addresses_user_id_is_default'
    });
  }
};
