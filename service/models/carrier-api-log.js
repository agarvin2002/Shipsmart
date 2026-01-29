/**
 * CarrierApiLog Model
 *
 * Stores ONE entry per shipment+carrier with latest API request/response data.
 * Uses UPSERT pattern: Update existing entry when same shipment+carrier queried again.
 *
 * Key Fields:
 * - shipment_id + carrier: Composite UNIQUE key
 * - query_count: Tracks how many times shipment+carrier was queried
 * - first_queried_at / last_queried_at: Lifecycle tracking
 */

module.exports = (sequelize, DataTypes) => {
  const CarrierApiLog = sequelize.define('CarrierApiLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    shipment_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Links to api_request_logs (part of composite unique key)'
    },
    request_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Most recent request ID'
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User who made the request'
    },

    // Carrier info
    carrier: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Carrier name: fedex, ups, usps, dhl (part of composite unique key)'
    },
    operation: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Operation type: authenticate, get_rates, create_shipment'
    },

    // Request data
    endpoint: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Carrier API endpoint URL'
    },
    http_method: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'HTTP method used'
    },
    request_headers: {
      type: DataTypes.JSONB,
      comment: 'Request headers (sanitized)'
    },
    request_body: {
      type: DataTypes.JSONB,
      comment: 'Request payload sent to carrier'
    },
    request_body_size: {
      type: DataTypes.INTEGER,
      comment: 'Size of request body in bytes'
    },

    // Response data
    response_status: {
      type: DataTypes.INTEGER,
      comment: 'HTTP response status code from carrier'
    },
    response_headers: {
      type: DataTypes.JSONB,
      comment: 'Response headers from carrier'
    },
    response_body: {
      type: DataTypes.JSONB,
      comment: 'Response payload from carrier'
    },
    response_body_size: {
      type: DataTypes.INTEGER,
      comment: 'Size of response body in bytes'
    },

    // Timing (latest query)
    request_started_at: {
      type: DataTypes.DATE,
      comment: 'When the latest carrier request started'
    },
    request_completed_at: {
      type: DataTypes.DATE,
      comment: 'When the latest carrier request completed'
    },
    duration_ms: {
      type: DataTypes.INTEGER,
      comment: 'Latest request duration in milliseconds'
    },

    // Error tracking (latest)
    error_type: {
      type: DataTypes.STRING(100),
      comment: 'Error type: timeout, auth_failed, api_error, network_error'
    },
    error_message: {
      type: DataTypes.TEXT,
      comment: 'Error message if request failed'
    },
    error_stack: {
      type: DataTypes.TEXT,
      comment: 'Error stack trace if request failed'
    },

    // Retry info (latest)
    attempt_number: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Attempt number for this request'
    },
    max_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Maximum number of attempts allowed'
    },

    // Query count tracking
    query_count: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Number of times this shipment+carrier was queried'
    },
    first_queried_at: {
      type: DataTypes.DATE,
      comment: 'When this shipment+carrier was first queried'
    },
    last_queried_at: {
      type: DataTypes.DATE,
      comment: 'When this shipment+carrier was most recently queried'
    }
  }, {
    tableName: 'carrier_api_logs',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['shipment_id', 'carrier'],
        unique: true,
        name: 'carrier_api_logs_shipment_carrier_unique'
      },
      {
        fields: ['shipment_id'],
        name: 'idx_carrier_logs_shipment_id'
      },
      {
        fields: ['user_id'],
        name: 'idx_carrier_logs_user_id'
      },
      {
        fields: ['carrier'],
        name: 'idx_carrier_logs_carrier'
      },
      {
        fields: ['operation'],
        name: 'idx_carrier_logs_operation'
      },
      {
        fields: [{ name: 'last_queried_at', order: 'DESC' }],
        name: 'idx_carrier_logs_last_queried'
      }
    ]
  });

  /**
   * Associations
   */
  CarrierApiLog.associate = (models) => {
    // Belongs to User
    CarrierApiLog.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    // Belongs to ApiRequestLog (linked by shipment_id)
    CarrierApiLog.belongsTo(models.ApiRequestLog, {
      foreignKey: 'shipment_id',
      targetKey: 'shipment_id',
      as: 'apiRequestLog'
    });
  };

  return CarrierApiLog;
};
