module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define('Session', {
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
    token_jti: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    refresh_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    device_info: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revoked_at: {
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
    tableName: 'sessions',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['token_jti'] },
      { fields: ['expires_at'] },
    ],
  });

  Session.associate = (models) => {
    Session.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return Session;
};
