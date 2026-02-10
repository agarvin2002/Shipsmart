module.exports = (sequelize, DataTypes) => {
  const ExcelRateJob = sequelize.define('ExcelRateJob', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
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
    job_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'Bull queue job ID',
    },
    original_filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Original name of uploaded Excel file',
    },
    input_s3_key: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'S3 key for uploaded input Excel file',
    },
    output_s3_key: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'S3 key for generated output Excel file',
    },
    row_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Number of shipment rows in Excel',
    },
    processed_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Number of rows processed so far',
    },
    success_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Number of rows successfully fetched rates',
    },
    error_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Number of rows with errors',
    },
    status: {
      type: DataTypes.ENUM('pending', 'parsing', 'processing', 'generating', 'completed', 'failed'),
      defaultValue: 'pending',
      allowNull: false,
      comment: 'Current status of the job',
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if job failed',
    },
    created_at: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    updated_at: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the job completed or failed',
    },
  }, {
    tableName: 'excel_rate_jobs',
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['job_id'], unique: true },
      { fields: ['status'] },
      { fields: ['created_at'] },
    ],
  });

  ExcelRateJob.associate = (models) => {
    ExcelRateJob.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return ExcelRateJob;
};
