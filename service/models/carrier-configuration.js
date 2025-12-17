module.exports = (sequelize, DataTypes) => {
  const CarrierConfiguration = sequelize.define('CarrierConfiguration', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    carrier: {
      type: DataTypes.ENUM('fedex', 'ups', 'usps', 'dhl'),
      allowNull: false,
      unique: true,
    },
    region: {
      type: DataTypes.STRING(10),
      defaultValue: 'US',
      allowNull: false,
      comment: 'Region code (US, EU, etc.)',
    },
    api_version: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'API version (e.g., v1, v2)',
    },
    api_endpoints: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'JSON: { base_url, auth_url, rate_url, track_url, etc. }',
    },
    timeout: {
      type: DataTypes.INTEGER,
      defaultValue: 15000,
      allowNull: false,
      comment: 'Request timeout in milliseconds',
    },
    retry_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      allowNull: false,
      comment: 'Number of retry attempts on failure',
    },
    rate_cache_ttl: {
      type: DataTypes.INTEGER,
      defaultValue: 300,
      allowNull: false,
      comment: 'Rate cache TTL in seconds',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Whether this carrier is enabled for rate shopping',
    },
    supported_services: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of supported service types',
    },
    additional_config: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Carrier-specific configuration options',
    },
    created_at: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    updated_at: {
      allowNull: false,
      type: DataTypes.DATE,
    },
  }, {
    tableName: 'carrier_configurations',
    indexes: [
      { unique: true, fields: ['carrier'] },
      { fields: ['is_active'] },
      { fields: ['region'] },
    ],
  });

  return CarrierConfiguration;
};
