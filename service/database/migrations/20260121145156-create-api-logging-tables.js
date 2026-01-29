/**
 * Migration: Create API and Carrier Logging Tables
 *
 * Creates two tables for comprehensive API logging:
 * 1. api_request_logs: Stores ONE entry per shipment (UPSERT pattern)
 * 2. carrier_api_logs: Stores ONE entry per shipment+carrier (UPSERT pattern)
 *
 * Key Design:
 * - Uses shipment_id as primary identifier (NOT request_id)
 * - UNIQUE constraints prevent duplicates
 * - Query tracking: query_count, first_queried_at, last_queried_at
 * - Retention: Based on last_queried_at (keep frequently accessed data)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ============================================================
    // Table 1: api_request_logs
    // ============================================================
    await queryInterface.createTable('api_request_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      shipment_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Unique identifier from request payload (PRIMARY KEY for UPSERT)'
      },
      request_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Most recent request ID (from express-request-id)'
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        comment: 'User who made the request'
      },

      // Latest request metadata
      method: {
        type: Sequelize.STRING(10),
        allowNull: false,
        comment: 'HTTP method (POST, GET, etc.)'
      },
      path: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'API endpoint path'
      },
      query_params: {
        type: Sequelize.JSONB,
        comment: 'Query parameters from URL'
      },
      headers: {
        type: Sequelize.JSONB,
        comment: 'Request headers (sanitized)'
      },

      // Latest request body
      request_body: {
        type: Sequelize.JSONB,
        comment: 'Request payload (sanitized)'
      },
      request_body_size: {
        type: Sequelize.INTEGER,
        comment: 'Size of request body in bytes'
      },

      // Latest response data
      response_status: {
        type: Sequelize.INTEGER,
        comment: 'HTTP response status code'
      },
      response_body: {
        type: Sequelize.JSONB,
        comment: 'Response payload'
      },
      response_body_size: {
        type: Sequelize.INTEGER,
        comment: 'Size of response body in bytes'
      },
      response_headers: {
        type: Sequelize.JSONB,
        comment: 'Response headers (sanitized)'
      },

      // Timing (latest query)
      request_started_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When the latest request started'
      },
      request_completed_at: {
        type: Sequelize.DATE,
        comment: 'When the latest request completed'
      },
      duration_ms: {
        type: Sequelize.INTEGER,
        comment: 'Latest request duration in milliseconds'
      },

      // Context
      ip_address: {
        type: Sequelize.INET,
        comment: 'Client IP address'
      },
      user_agent: {
        type: Sequelize.TEXT,
        comment: 'Client user agent string'
      },

      // Error tracking (latest)
      error_message: {
        type: Sequelize.TEXT,
        comment: 'Error message if request failed'
      },
      error_stack: {
        type: Sequelize.TEXT,
        comment: 'Error stack trace if request failed'
      },

      // Query count tracking
      query_count: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: 'Number of times this shipment was queried'
      },
      first_queried_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When this shipment was first queried'
      },
      last_queried_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When this shipment was most recently queried'
      },

      // Metadata
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: 'Record creation timestamp'
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: 'Record last update timestamp'
      }
    });

    // Indexes for api_request_logs
    await queryInterface.addIndex('api_request_logs', ['shipment_id'], {
      name: 'idx_api_logs_shipment_id',
      unique: true
    });
    await queryInterface.addIndex('api_request_logs', ['user_id'], {
      name: 'idx_api_logs_user_id'
    });
    await queryInterface.addIndex('api_request_logs', ['user_id', 'shipment_id'], {
      name: 'idx_api_logs_user_shipment'
    });
    await queryInterface.addIndex('api_request_logs', [{ attribute: 'last_queried_at', order: 'DESC' }], {
      name: 'idx_api_logs_last_queried'
    });

    // ============================================================
    // Table 2: carrier_api_logs
    // ============================================================
    await queryInterface.createTable('carrier_api_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      shipment_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Links to api_request_logs (part of composite unique key)'
      },
      request_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Most recent request ID'
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        comment: 'User who made the request'
      },

      // Carrier info
      carrier: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Carrier name: fedex, ups, usps, dhl (part of composite unique key)'
      },
      operation: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Operation type: authenticate, get_rates, create_shipment'
      },

      // Request data
      endpoint: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Carrier API endpoint URL'
      },
      http_method: {
        type: Sequelize.STRING(10),
        allowNull: false,
        comment: 'HTTP method used'
      },
      request_headers: {
        type: Sequelize.JSONB,
        comment: 'Request headers (sanitized)'
      },
      request_body: {
        type: Sequelize.JSONB,
        comment: 'Request payload sent to carrier'
      },
      request_body_size: {
        type: Sequelize.INTEGER,
        comment: 'Size of request body in bytes'
      },

      // Response data
      response_status: {
        type: Sequelize.INTEGER,
        comment: 'HTTP response status code from carrier'
      },
      response_headers: {
        type: Sequelize.JSONB,
        comment: 'Response headers from carrier'
      },
      response_body: {
        type: Sequelize.JSONB,
        comment: 'Response payload from carrier'
      },
      response_body_size: {
        type: Sequelize.INTEGER,
        comment: 'Size of response body in bytes'
      },

      // Timing (latest query)
      request_started_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When the latest carrier request started'
      },
      request_completed_at: {
        type: Sequelize.DATE,
        comment: 'When the latest carrier request completed'
      },
      duration_ms: {
        type: Sequelize.INTEGER,
        comment: 'Latest request duration in milliseconds'
      },

      // Error tracking (latest)
      error_type: {
        type: Sequelize.STRING(100),
        comment: 'Error type: timeout, auth_failed, api_error, network_error'
      },
      error_message: {
        type: Sequelize.TEXT,
        comment: 'Error message if request failed'
      },
      error_stack: {
        type: Sequelize.TEXT,
        comment: 'Error stack trace if request failed'
      },

      // Retry info (latest)
      attempt_number: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: 'Attempt number for this request'
      },
      max_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: 'Maximum number of attempts allowed'
      },

      // Query count tracking
      query_count: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: 'Number of times this shipment+carrier was queried'
      },
      first_queried_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When this shipment+carrier was first queried'
      },
      last_queried_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When this shipment+carrier was most recently queried'
      },

      // Metadata
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: 'Record creation timestamp'
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: 'Record last update timestamp'
      }
    });

    // Add unique constraint on shipment_id + carrier (CRITICAL for UPSERT)
    await queryInterface.addConstraint('carrier_api_logs', {
      fields: ['shipment_id', 'carrier'],
      type: 'unique',
      name: 'carrier_api_logs_shipment_carrier_unique'
    });

    // Indexes for carrier_api_logs
    await queryInterface.addIndex('carrier_api_logs', ['shipment_id'], {
      name: 'idx_carrier_logs_shipment_id'
    });
    await queryInterface.addIndex('carrier_api_logs', ['user_id'], {
      name: 'idx_carrier_logs_user_id'
    });
    await queryInterface.addIndex('carrier_api_logs', ['carrier'], {
      name: 'idx_carrier_logs_carrier'
    });
    await queryInterface.addIndex('carrier_api_logs', ['operation'], {
      name: 'idx_carrier_logs_operation'
    });
    await queryInterface.addIndex('carrier_api_logs', ['response_status'], {
      name: 'idx_carrier_logs_status'
    });
    await queryInterface.addIndex('carrier_api_logs', [{ attribute: 'last_queried_at', order: 'DESC' }], {
      name: 'idx_carrier_logs_last_queried'
    });
    await queryInterface.addIndex('carrier_api_logs', ['carrier', { attribute: 'last_queried_at', order: 'DESC' }], {
      name: 'idx_carrier_logs_carrier_time'
    });
    await queryInterface.addIndex('carrier_api_logs', ['user_id', 'carrier', { attribute: 'last_queried_at', order: 'DESC' }], {
      name: 'idx_carrier_logs_user_carrier'
    });
    await queryInterface.addIndex('carrier_api_logs', ['shipment_id', 'carrier'], {
      name: 'idx_carrier_logs_shipment_carrier'
    });
  },

  down: async (queryInterface) => {
    // Drop tables in reverse order (carrier_api_logs first due to potential FK references)
    await queryInterface.dropTable('carrier_api_logs');
    await queryInterface.dropTable('api_request_logs');
  }
};
