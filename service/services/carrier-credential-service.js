/* global logger */
const CarrierCredentialRepository = require('../repositories/carrier-credential-repository');
const CryptoHelper = require('../helpers/crypto-helper');
const CarrierRouter = require('../lib/carrier-router');

class CarrierCredentialService {
  constructor() {
    this.credentialRepository = new CarrierCredentialRepository();
  }

  async getCredentialsByUserId(userId, options = {}) {
    try {
      const credentials = await this.credentialRepository.findByUserId(userId, options);

      return credentials.map(cred => {
        const credData = cred.toJSON();
        credData.client_id = CryptoHelper.decrypt(credData.client_id_encrypted);
        credData.client_secret = CryptoHelper.decrypt(credData.client_secret_encrypted);
        credData.account_numbers = credData.account_numbers ? JSON.parse(credData.account_numbers) : [];
        credData.selected_service_ids = credData.selected_service_ids || null;
        delete credData.client_id_encrypted;
        delete credData.client_secret_encrypted;
        return credData;
      });
    } catch (error) {
      logger.error(`Error fetching credentials for user ${userId}: ${error.stack}`);
      throw error;
    }
  }

  async getCredentialById(id, userId) {
    try {
      const credential = await this.credentialRepository.findByIdAndUserId(id, userId);
      if (!credential) {
        return { error: 'Credential not found' };
      }

      const credData = credential.toJSON();
      credData.client_id = CryptoHelper.decrypt(credData.client_id_encrypted);
      credData.client_secret = CryptoHelper.decrypt(credData.client_secret_encrypted);
      credData.account_numbers = credData.account_numbers ? JSON.parse(credData.account_numbers) : [];
      credData.selected_service_ids = credData.selected_service_ids || null;
      delete credData.client_id_encrypted;
      delete credData.client_secret_encrypted;

      return credData;
    } catch (error) {
      logger.error(`Error fetching credential ${id}: ${error.stack}`);
      throw error;
    }
  }

  async createCredential(data) {
    try {
      const existing = await this.credentialRepository.findByUserIdAndCarrier(data.user_id, data.carrier);
      if (existing) {
        return { error: `Credential for ${data.carrier} already exists` };
      }

      const encryptedClientId = CryptoHelper.encrypt(data.client_id);
      const encryptedSecret = CryptoHelper.encrypt(data.client_secret);

      const credential = await this.credentialRepository.create({
        user_id: data.user_id,
        carrier: data.carrier,
        client_id_encrypted: encryptedClientId,
        client_secret_encrypted: encryptedSecret,
        account_numbers: JSON.stringify(data.account_numbers || []),
        selected_service_ids: data.selected_service_ids || null,
      });

      const credData = credential.toJSON();
      credData.client_id = data.client_id;
      credData.client_secret = data.client_secret;
      credData.account_numbers = data.account_numbers || [];
      credData.selected_service_ids = credData.selected_service_ids || null;
      delete credData.client_id_encrypted;
      delete credData.client_secret_encrypted;

      return credData;
    } catch (error) {
      logger.error(`Error creating credential: ${error.stack}`);
      throw error;
    }
  }

  async updateCredential(id, userId, data) {
    try {
      const credential = await this.credentialRepository.findByIdAndUserId(id, userId);
      if (!credential) {
        return { error: 'Credential not found' };
      }

      const updateData = {};

      if (data.client_id) {
        updateData.client_id_encrypted = CryptoHelper.encrypt(data.client_id);
      }

      if (data.client_secret) {
        updateData.client_secret_encrypted = CryptoHelper.encrypt(data.client_secret);
      }

      if (data.account_numbers) {
        updateData.account_numbers = JSON.stringify(data.account_numbers);
      }

      if (data.is_active !== undefined) {
        updateData.is_active = data.is_active;
      }

      if (data.selected_service_ids !== undefined) {
        updateData.selected_service_ids = data.selected_service_ids;
      }

      const updated = await this.credentialRepository.update(id, updateData);

      const credData = updated.toJSON();
      credData.client_id = CryptoHelper.decrypt(credData.client_id_encrypted);
      credData.client_secret = CryptoHelper.decrypt(credData.client_secret_encrypted);
      credData.account_numbers = credData.account_numbers ? JSON.parse(credData.account_numbers) : [];
      credData.selected_service_ids = credData.selected_service_ids || null;
      delete credData.client_id_encrypted;
      delete credData.client_secret_encrypted;

      return credData;
    } catch (error) {
      logger.error(`Error updating credential ${id}: ${error.stack}`);
      throw error;
    }
  }

  async deleteCredential(id, userId) {
    try {
      const credential = await this.credentialRepository.findByIdAndUserId(id, userId);
      if (!credential) {
        return { error: 'Credential not found' };
      }

      return await this.credentialRepository.delete(id);
    } catch (error) {
      logger.error(`Error deleting credential ${id}: ${error.stack}`);
      throw error;
    }
  }

  async validateCredential(id, userId) {
    try {
      const credential = await this.credentialRepository.findByIdAndUserId(id, userId);
      if (!credential) {
        return { error: 'Credential not found' };
      }

      const clientId = CryptoHelper.decrypt(credential.client_id_encrypted);
      const clientSecret = CryptoHelper.decrypt(credential.client_secret_encrypted);

      logger.info(`Validating ${credential.carrier} credentials for user ${userId}`);

      // Use real carrier API validation
      let isValid = false;
      let errorMessage = null;

      try {
        const carrierService = CarrierRouter.getCarrierService(credential.carrier, credential);
        const validationResult = await carrierService.validateCredentials();
        isValid = validationResult.valid;
        errorMessage = validationResult.error || null;

        logger.info(`${credential.carrier} credential validation result`, {
          userId,
          carrier: credential.carrier,
          isValid,
        });
      } catch (error) {
        isValid = false;
        errorMessage = error.message;
        logger.error(`${credential.carrier} credential validation failed`, {
          userId,
          error: error.message,
        });
      }

      await this.credentialRepository.updateValidationStatus(
        id,
        isValid ? 'valid' : 'invalid',
        new Date()
      );

      return {
        valid: isValid,
        carrier: credential.carrier,
        validated_at: new Date().toISOString(),
        ...(errorMessage && { error: errorMessage }),
      };
    } catch (error) {
      logger.error(`Error validating credential ${id}: ${error.stack}`);
      throw error;
    }
  }
}

module.exports = CarrierCredentialService;
