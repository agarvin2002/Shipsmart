/**
 * ApiRequestLog Model
 *
 * Stores ONE entry per shipment with latest API request/response data.
 * Uses UPSERT pattern: Update existing entry when same shipment queried again.
 *
 * Key Fields:
 * - shipment_id: UNIQUE identifier (from request payload)
 * - query_count: Tracks how many times shipment was queried
 * - first_queried_at / last_queried_at: Lifecycle tracking
 */

module.exports = (sequelize, DataTypes) => {
  const ApiRequestLog = sequelize.define('ApiRequestLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    shipment_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'Unique identifier from request payload (PRIMARY KEY for UPSERT)'
    },
    request_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Most recent request ID (from express-request-id middleware)'
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User who made the request'
    },

    // Latest request metadata
    method: {
      type: DataTypes.STRING(10),
      comment: 'HTTP method (POST, GET, etc.)'
    },
    path: {
      type: DataTypes.TEXT,
      comment: 'API endpoint path'
    },
    query_params: {
      type: DataTypes.JSONB,
      comment: 'Query parameters from URL'
    },
    headers: {
      type: DataTypes.JSONB,
      comment: 'Request headers (sanitized)'
    },

    // Latest request body
    request_body: {
      type: DataTypes.JSONB,
      comment: 'Request payload (sanitized)'
    },
    request_body_size: {
      type: DataTypes.INTEGER,
      comment: 'Size of request body in bytes'
    },

    // Latest response data
    response_status: {
      type: DataTypes.INTEGER,
      comment: 'HTTP response status code'
    },
    response_body: {
      type: DataTypes.JSONB,
      comment: 'Response payload'
    },
    response_body_size: {
      type: DataTypes.INTEGER,
      comment: 'Size of response body in bytes'
    },
    response_headers: {
      type: DataTypes.JSONB,
      comment: 'Response headers (sanitized)'
    },

    // Timing (latest query)
    request_started_at: {
      type: DataTypes.DATE,
      comment: 'When the latest request started'
    },
    request_completed_at: {
      type: DataTypes.DATE,
      comment: 'When the latest request completed'
    },
    duration_ms: {
      type: DataTypes.INTEGER,
      comment: 'Latest request duration in milliseconds'
    },

    // Context
    ip_address: {
      type: DataTypes.INET,
      comment: 'Client IP address'
    },
    user_agent: {
      type: DataTypes.TEXT,
      comment: 'Client user agent string'
    },

    // Error tracking (latest)
    error_message: {
      type: DataTypes.TEXT,
      comment: 'Error message if request failed'
    },
    error_stack: {
      type: DataTypes.TEXT,
      comment: 'Error stack trace if request failed'
    },

    // Query count tracking
    query_count: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Number of times this shipment was queried'
    },
    first_queried_at: {
      type: DataTypes.DATE,
      comment: 'When this shipment was first queried'
    },
    last_queried_at: {
      type: DataTypes.DATE,
      comment: 'When this shipment was most recently queried'
    }
  }, {
    tableName: 'api_request_logs',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['shipment_id'],
        unique: true,
        name: 'idx_api_logs_shipment_id'
      },
      {
        fields: ['user_id'],
        name: 'idx_api_logs_user_id'
      },
      {
        fields: ['user_id', 'shipment_id'],
        name: 'idx_api_logs_user_shipment'
      },
      {
        fields: [{ name: 'last_queried_at', order: 'DESC' }],
        name: 'idx_api_logs_last_queried'
      }
    ]
  });

  /**
   * Associations
   */
  ApiRequestLog.associate = (models) => {
    // Belongs to User
    ApiRequestLog.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    // Has many carrier API logs (linked by shipment_id)
    ApiRequestLog.hasMany(models.CarrierApiLog, {
      foreignKey: 'shipment_id',
      sourceKey: 'shipment_id',
      as: 'CarrierApiLogs'
    });
  };

  return ApiRequestLog;
};
