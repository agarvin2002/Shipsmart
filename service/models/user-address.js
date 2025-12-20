module.exports = (sequelize, DataTypes) => {
  const UserAddress = sequelize.define('UserAddress', {
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
    address_label: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    address_type: {
      type: DataTypes.ENUM('source', 'destination'),
      allowNull: false,
      defaultValue: 'source',
      comment: 'Type of address: source (origin/from) or destination (to)',
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Only applicable for source addresses. One default source per user allowed.',
    },
    company_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    street_address_1: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    street_address_2: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    state_province: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    postal_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING(2),
      defaultValue: 'US',
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
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
    tableName: 'user_addresses',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['user_id', 'address_type'] },
      { fields: ['user_id', 'address_type', 'is_default'] },
    ],
    validate: {
      onlyOneDefaultSource() {
        // Validation for ensuring only one default source per user
        // This is also enforced at service layer
        if (this.address_type === 'source' && this.is_default) {
          // Additional validation will be in service layer
        }
      },
    },
  });

  UserAddress.associate = (models) => {
    UserAddress.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    UserAddress.hasMany(models.Shipment, { foreignKey: 'origin_address_id', as: 'shipmentsAsOrigin' });
    UserAddress.hasMany(models.Shipment, { foreignKey: 'destination_address_id', as: 'shipmentsAsDestination' });
  };

  return UserAddress;
};
