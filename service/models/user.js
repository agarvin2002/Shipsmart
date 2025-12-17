module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    company_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      defaultValue: 'active',
      allowNull: false,
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    email_verification_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    password_reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    password_reset_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_login_at: {
      type: DataTypes.DATE,
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
    tableName: 'users',
    indexes: [
      { fields: ['email'] },
      { fields: ['status'] },
    ],
  });

  User.associate = (models) => {
    User.hasMany(models.UserAddress, { foreignKey: 'user_id', as: 'addresses' });
    User.hasMany(models.CarrierCredential, { foreignKey: 'user_id', as: 'carrierCredentials' });
    User.hasMany(models.Session, { foreignKey: 'user_id', as: 'sessions' });
    User.hasMany(models.Shipment, { foreignKey: 'user_id', as: 'shipments' });
    User.hasMany(models.Rate, { foreignKey: 'user_id', as: 'rates' });
    User.hasMany(models.RateHistory, { foreignKey: 'user_id', as: 'rateHistory' });
  };

  return User;
};
