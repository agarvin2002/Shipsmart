class BasePresenter {
  static sanitize(data) {
    if (!data) return null;

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }

    // Handle Sequelize models
    const plainData = data.dataValues || data;

    // Remove sensitive and internal fields
    const sensitiveFields = [
      'password_hash',
      'password_reset_token',
      'password_reset_expires',
      'email_verification_token',
      'deleted_at'
    ];

    const cleaned = { ...plainData };

    sensitiveFields.forEach(field => {
      delete cleaned[field];
    });

    return cleaned;
  }

  static formatTimestamp(date) {
    if (!date) return null;

    if (typeof date === 'string' && /^\d{8}$/.test(date)) {
      const year = date.substring(0, 4);
      const month = date.substring(4, 6);
      const day = date.substring(6, 8);
      return new Date(`${year}-${month}-${day}`).toISOString();
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate.toISOString();
  }

  static present(data) {
    return this.sanitize(data);
  }

  static presentCollection(items) {
    if (!Array.isArray(items)) return [];
    return items.map(item => this.present(item));
  }
}

module.exports = BasePresenter;
