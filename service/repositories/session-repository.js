const { Session } = require('../models');
const { Op } = require('sequelize');

class SessionRepository {
  async findByJti(jti) {
    return await Session.findOne({ where: { token_jti: jti } });
  }

  async findByUserId(userId) {
    return await Session.findAll({ where: { user_id: userId } });
  }

  async findActiveByUserId(userId) {
    return await Session.findAll({
      where: {
        user_id: userId,
        revoked_at: null,
      },
    });
  }

  async create(sessionData) {
    return await Session.create(sessionData);
  }

  async revoke(jti) {
    return await Session.update(
      { revoked_at: new Date() },
      { where: { token_jti: jti } }
    );
  }

  async revokeAllByUserId(userId) {
    return await Session.update(
      { revoked_at: new Date() },
      { where: { user_id: userId, revoked_at: null } }
    );
  }

  async deleteExpired() {
    return await Session.destroy({
      where: { expires_at: { [Op.lt]: new Date() } },
    });
  }
}

module.exports = SessionRepository;
