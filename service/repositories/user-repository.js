const { User } = require('../models');
const { USER_STATUS } = require('@shipsmart/constants');

class UserRepository {
  async findById(id) {
    return await User.findByPk(id);
  }

  async findByEmail(email) {
    return await User.findOne({ where: { email } });
  }

  async findAll(filters = {}) {
    return await User.findAll({ where: filters });
  }

  async findWithAddresses(id) {
    return await User.findByPk(id, {
      include: [{ association: 'addresses' }],
    });
  }

  async findWithCredentials(id) {
    return await User.findByPk(id, {
      include: [{ association: 'carrierCredentials' }],
    });
  }

  async create(userData) {
    return await User.create(userData);
  }

  async update(id, userData) {
    const user = await User.findByPk(id);
    if (!user) return null;
    return await user.update(userData);
  }

  async updatePassword(id, passwordHash) {
    const user = await User.findByPk(id);
    if (!user) return null;
    return await user.update({ password_hash: passwordHash });
  }

  async updateLastLogin(id) {
    const user = await User.findByPk(id);
    if (!user) return null;
    return await user.update({ last_login_at: new Date() });
  }

  async softDelete(id) {
    const user = await User.findByPk(id);
    if (!user) return null;
    return await user.update({ status: USER_STATUS.INACTIVE });
  }

  async setEmailVerified(id) {
    const user = await User.findByPk(id);
    if (!user) return null;
    return await user.update({ email_verified: true, email_verification_token: null });
  }

  async setVerificationToken(id, token) {
    const user = await User.findByPk(id);
    if (!user) return null;
    return await user.update({ email_verification_token: token });
  }

  async setResetToken(id, token, expiresAt) {
    const user = await User.findByPk(id);
    if (!user) return null;
    return await user.update({ password_reset_token: token, password_reset_expires_at: expiresAt });
  }

  async clearResetToken(id) {
    const user = await User.findByPk(id);
    if (!user) return null;
    return await user.update({ password_reset_token: null, password_reset_expires_at: null });
  }

  async findByResetToken(token) {
    return await User.findOne({
      where: {
        password_reset_token: token,
      },
    });
  }

  async findByVerificationToken(token) {
    return await User.findOne({ where: { email_verification_token: token } });
  }
}

module.exports = UserRepository;
