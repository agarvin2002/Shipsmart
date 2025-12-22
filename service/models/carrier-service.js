module.exports = (sequelize, DataTypes) => {
  const CarrierService = sequelize.define('CarrierService', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    carrier_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'carriers',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    service_code: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    service_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    tableName: 'carrier_services',
    indexes: [
      { unique: true, fields: ['carrier_id', 'service_code'] },
      { fields: ['carrier_id'] },
      { fields: ['category'] },
    ],
  });

  CarrierService.associate = (models) => {
    CarrierService.belongsTo(models.Carrier, {
      foreignKey: 'carrier_id',
      as: 'carrier'
    });
  };

  return CarrierService;
};
