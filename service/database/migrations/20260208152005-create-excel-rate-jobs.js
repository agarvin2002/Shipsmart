'use strict';

module.exports = {
  up: async function(queryInterface, Sequelize) {
    // Create ENUM type for excel_rate_jobs status
    await queryInterface.sequelize.query(
      "DO $$ BEGIN " +
      "CREATE TYPE enum_excel_rate_jobs_status AS ENUM('pending', 'parsing', 'processing', 'generating', 'completed', 'failed'); " +
      "EXCEPTION " +
      "WHEN duplicate_object THEN null; " +
      "END $$;"
    );

    // Create excel_rate_jobs table
    await queryInterface.createTable('excel_rate_jobs', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      job_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Bull queue job ID',
      },
      original_filename: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      input_s3_key: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'S3 key for uploaded input Excel file',
      },
      output_s3_key: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'S3 key for generated output Excel file',
      },
      row_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Number of shipment rows in Excel',
      },
      processed_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Number of rows processed so far',
      },
      success_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Number of rows successfully fetched rates',
      },
      error_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Number of rows with errors',
      },
      status: {
        type: 'enum_excel_rate_jobs_status',
        defaultValue: 'pending',
        allowNull: false,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Create indexes
    await queryInterface.addIndex('excel_rate_jobs', ['user_id'], {
      name: 'excel_rate_jobs_user_id',
    });

    await queryInterface.addIndex('excel_rate_jobs', ['job_id'], {
      name: 'excel_rate_jobs_job_id',
      unique: true,
    });

    await queryInterface.addIndex('excel_rate_jobs', ['status'], {
      name: 'excel_rate_jobs_status',
    });

    await queryInterface.addIndex('excel_rate_jobs', ['created_at'], {
      name: 'excel_rate_jobs_created_at',
    });

    // Add comments to table and columns
    await queryInterface.sequelize.query(
      "COMMENT ON TABLE excel_rate_jobs IS 'Tracks Excel file uploads for async rate comparison jobs';"
    );

    await queryInterface.sequelize.query(
      "COMMENT ON COLUMN excel_rate_jobs.id IS 'Primary key (UUID)';"
    );

    await queryInterface.sequelize.query(
      "COMMENT ON COLUMN excel_rate_jobs.user_id IS 'User who uploaded the Excel file';"
    );

    await queryInterface.sequelize.query(
      "COMMENT ON COLUMN excel_rate_jobs.job_id IS 'Bull queue job ID for tracking async processing';"
    );

    await queryInterface.sequelize.query(
      "COMMENT ON COLUMN excel_rate_jobs.status IS 'Current status of the job (pending, parsing, processing, generating, completed, failed)';"
    );
  },

  down: async function(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('excel_rate_jobs', 'excel_rate_jobs_user_id');
    await queryInterface.removeIndex('excel_rate_jobs', 'excel_rate_jobs_job_id');
    await queryInterface.removeIndex('excel_rate_jobs', 'excel_rate_jobs_status');
    await queryInterface.removeIndex('excel_rate_jobs', 'excel_rate_jobs_created_at');

    // Drop table
    await queryInterface.dropTable('excel_rate_jobs');

    // Drop ENUM type
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_excel_rate_jobs_status;"
    );
  }
};
