module.exports = (sequelize, DataTypes) => {
  const RateHistory = sequelize.define('RateHistory', {
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
    carrier: {
      type: DataTypes.ENUM('fedex', 'ups', 'usps', 'dhl'),
      allowNull: false,
    },
    service_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    rate_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
      allowNull: false,
    },
    package_weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Weight in lbs',
    },
    origin_zip: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    destination_zip: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    origin_country: {
      type: DataTypes.STRING(2),
      defaultValue: 'US',
      allowNull: false,
    },
    destination_country: {
      type: DataTypes.STRING(2),
      defaultValue: 'US',
      allowNull: false,
    },
    service_type: {
      type: DataTypes.ENUM('ground', 'express', 'overnight', 'international'),
      allowNull: true,
    },
    fetched_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    created_at: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'rate_history',
    timestamps: false,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['carrier'] },
      { fields: ['origin_zip', 'destination_zip'] },
      { fields: ['fetched_at'] },
      { fields: ['service_name'] },
      { fields: ['created_at'] },
    ],
  });

  RateHistory.associate = (models) => {
    RateHistory.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return RateHistory;
};
