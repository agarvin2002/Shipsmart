module.exports = (sequelize, DataTypes) => {
  const CarrierCredential = sequelize.define('CarrierCredential', {
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
      type: DataTypes.ENUM('fedex', 'ups', 'dhl', 'usps'),
      allowNull: false,
    },
    client_id_encrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    client_secret_encrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    account_numbers: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    last_validated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    validation_status: {
      type: DataTypes.ENUM('pending', 'valid', 'invalid'),
      defaultValue: 'pending',
      allowNull: false,
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
    tableName: 'carrier_credentials',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['carrier'] },
      { unique: true, fields: ['user_id', 'carrier'] },
    ],
  });

  CarrierCredential.associate = (models) => {
    CarrierCredential.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return CarrierCredential;
};
