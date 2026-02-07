const { CarrierCredential } = require('../models');

class CarrierCredentialRepository {
  async findById(id, userId) {
    return await CarrierCredential.findOne({
      where: { id, user_id: userId },
    });
  }

  async findByUserId(userId, options = {}) {
    const where = { user_id: userId };

    if (options.carrier) {
      where.carrier = options.carrier;
    }

    if (options.active_only !== false) {
      where.is_active = true;
    }

    return await CarrierCredential.findAll({
      where,
      order: [['carrier', 'ASC']],
      limit: options.limit,
      offset: options.offset,
    });
  }

  async findByIdAndUserId(id, userId) {
    return await CarrierCredential.findOne({
      where: { id, user_id: userId },
    });
  }

  async findByUserIdAndCarrier(userId, carrier) {
    return await CarrierCredential.findOne({
      where: { user_id: userId, carrier },
    });
  }

  async create(credentialData) {
    return await CarrierCredential.create(credentialData);
  }

  async update(id, userId, credentialData) {
    const credential = await CarrierCredential.findOne({
      where: { id, user_id: userId },
    });
    if (!credential) return null;
    return await credential.update(credentialData);
  }

  async delete(id, userId) {
    const credential = await CarrierCredential.findOne({
      where: { id, user_id: userId },
    });
    if (!credential) return null;
    await credential.destroy();
    return { message: 'Carrier credential deleted successfully' };
  }

  async updateValidationStatus(id, userId, status, timestamp) {
    return await CarrierCredential.update(
      { validation_status: status, last_validated_at: timestamp },
      { where: { id, user_id: userId } }
    );
  }
}

module.exports = CarrierCredentialRepository;
