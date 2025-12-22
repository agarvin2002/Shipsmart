module.exports = (sequelize, DataTypes) => {
  const Carrier = sequelize.define('Carrier', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    logo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    base_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    endpoints: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      get() {
        const rawValue = this.getDataValue('endpoints');
        return rawValue || {};
      },
    },
    headers: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      get() {
        const rawValue = this.getDataValue('headers');
        return rawValue || {};
      },
    },
    auth_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    required_credentials: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      get() {
        const rawValue = this.getDataValue('required_credentials');
        return rawValue || [];
      },
    },
    timeout_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30000,
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
    tableName: 'carriers',
    indexes: [
      { unique: true, fields: ['code'] },
      { fields: ['is_active'] },
    ],
  });

  Carrier.associate = (models) => {
    Carrier.hasMany(models.CarrierService, {
      foreignKey: 'carrier_id',
      as: 'services'
    });
  };

  return Carrier;
};
