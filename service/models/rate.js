module.exports = (sequelize, DataTypes) => {
  const Rate = sequelize.define('Rate', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    shipment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'shipments',
        key: 'id',
      },
      onDelete: 'CASCADE',
      comment: 'Nullable for standalone rate quotes',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    carrier: {
      type: DataTypes.ENUM('fedex', 'ups', 'usps', 'dhl'),
      allowNull: false,
    },
    service_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Human-readable service name (e.g., "FedEx Ground")',
    },
    service_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Carrier-specific service code',
    },
    rate_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Rate amount',
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
      allowNull: false,
    },
    delivery_days: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Estimated delivery time in days',
    },
    estimated_delivery_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Estimated delivery date from carrier',
    },
    carrier_rate_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'External carrier rate ID for reference',
    },
    raw_response: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Full carrier API response for debugging',
    },
    fetched_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When this rate quote expires',
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
    tableName: 'rates',
    indexes: [
      { fields: ['shipment_id'] },
      { fields: ['user_id'] },
      { fields: ['carrier'] },
      { fields: ['fetched_at'] },
      { fields: ['rate_amount'] },
    ],
  });

  Rate.associate = (models) => {
    Rate.belongsTo(models.Shipment, { foreignKey: 'shipment_id', as: 'shipment' });
    Rate.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return Rate;
};
