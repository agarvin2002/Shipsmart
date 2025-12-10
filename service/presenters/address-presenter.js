const BasePresenter = require('./base-presenter');

class AddressPresenter extends BasePresenter {
  static present(address) {
    if (!address) return null;

    const data = this.sanitize(address);

    return {
      id: data.id,
      label: data.address_label,
      is_default: data.is_default || false,
      company_name: data.company_name || null,
      address: {
        street_1: data.street_address_1,
        street_2: data.street_address_2 || null,
        city: data.city,
        state: data.state_province,
        postal_code: data.postal_code,
        country: data.country || 'US'
      },
      phone: data.phone || null,
      created_at: this.formatTimestamp(data.created_at)
    };
  }

  static presentCompact(address) {
    if (!address) return null;

    const data = this.sanitize(address);

    return {
      id: data.id,
      label: data.address_label,
      is_default: data.is_default || false,
      full_address: this.formatFullAddress(data)
    };
  }

  static formatFullAddress(data) {
    const parts = [
      data.street_address_1,
      data.street_address_2,
      data.city,
      data.state_province,
      data.postal_code,
      data.country || 'US'
    ].filter(Boolean);

    return parts.join(', ');
  }
}

module.exports = AddressPresenter;
