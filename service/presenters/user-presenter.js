const BasePresenter = require('./base-presenter');

class UserPresenter extends BasePresenter {
  static present(user) {
    if (!user) return null;

    const data = this.sanitize(user);

    return {
      id: data.id,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      full_name: `${data.first_name} ${data.last_name}`,
      company_name: data.company_name || null,
      phone: data.phone || null,
      status: data.status,
      email_verified: data.email_verified || false,
      last_login_at: this.formatTimestamp(data.last_login_at),
      created_at: this.formatTimestamp(data.created_at)
    };
  }

  static presentBasic(user) {
    if (!user) return null;

    const data = this.sanitize(user);

    return {
      id: data.id,
      email: data.email,
      full_name: `${data.first_name} ${data.last_name}`,
      status: data.status
    };
  }
}

module.exports = UserPresenter;
