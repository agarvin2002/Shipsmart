const BasePresenter = require('./base-presenter');

class CarrierCredentialPresenter extends BasePresenter {
  static present(credential) {
    if (!credential) return null;

    const data = this.sanitize(credential);

    return {
      id: data.id,
      carrier: data.carrier,
      client_id: this.maskCredential(data.client_id),
      client_secret: this.maskCredential(data.client_secret),
      account_numbers: data.account_numbers || [],
      is_active: data.is_active || false,
      validation_status: data.validation_status || 'pending',
      last_validated_at: this.formatTimestamp(data.last_validated_at),
      created_at: this.formatTimestamp(data.created_at)
    };
  }

  static presentBasic(credential) {
    if (!credential) return null;

    const data = this.sanitize(credential);

    return {
      id: data.id,
      carrier: data.carrier,
      is_active: data.is_active || false,
      validation_status: data.validation_status || 'pending'
    };
  }

  static maskCredential(value) {
    if (!value) return null;
    if (value.length <= 8) return '****';
    return value.substring(0, 4) + '****' + value.substring(value.length - 4);
  }
}

module.exports = CarrierCredentialPresenter;
