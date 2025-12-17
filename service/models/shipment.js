module.exports = (sequelize, DataTypes) => {
  const Shipment = sequelize.define('Shipment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
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
    origin_address_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user_addresses',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    destination_address_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user_addresses',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    package_weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Weight in lbs',
    },
    package_dimensions: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'JSON: { length, width, height } in inches',
    },
    package_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Package value in USD for insurance',
    },
    insurance_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Insurance amount in USD',
    },
    service_type: {
      type: DataTypes.ENUM('ground', 'express', 'overnight', 'international'),
      defaultValue: 'ground',
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('draft', 'quoted', 'booked', 'shipped', 'delivered', 'cancelled'),
      defaultValue: 'draft',
      allowNull: false,
    },
    selected_carrier: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Carrier selected after rate comparison',
    },
    selected_rate_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID of the selected rate (no FK constraint to avoid cyclic dependency)',
    },
    tracking_number: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    label_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'URL to shipping label PDF',
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
    tableName: 'shipments',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['status'] },
      { fields: ['origin_address_id'] },
      { fields: ['destination_address_id'] },
      { fields: ['tracking_number'] },
      { fields: ['created_at'] },
    ],
  });

  Shipment.associate = (models) => {
    Shipment.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    Shipment.belongsTo(models.UserAddress, { foreignKey: 'origin_address_id', as: 'originAddress' });
    Shipment.belongsTo(models.UserAddress, { foreignKey: 'destination_address_id', as: 'destinationAddress' });
    Shipment.hasMany(models.Rate, { foreignKey: 'shipment_id', as: 'rates' });
    Shipment.belongsTo(models.Rate, { foreignKey: 'selected_rate_id', as: 'selectedRate', constraints: false });
  };

  return Shipment;
};
