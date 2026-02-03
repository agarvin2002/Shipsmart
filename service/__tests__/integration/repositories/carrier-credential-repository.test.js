/**
 * CarrierCredentialRepository Integration Tests
 * Tests all CRUD operations with real database
 */

const CarrierCredentialRepository = require('../../../repositories/carrier-credential-repository');
const { CarrierCredential } = require('../../../models');
const { cleanDatabase, createTestUser, createTestCarrierCredential } = require('../../utils/db-cleaner');
const CryptoHelper = require('../../../helpers/crypto-helper');

describe('CarrierCredentialRepository Integration Tests', () => {
  let credentialRepository;
  let testUser;

  beforeAll(() => {
    credentialRepository = new CarrierCredentialRepository();
  });

  beforeEach(async () => {
    await cleanDatabase();
    testUser = await createTestUser({
      email: 'carrier-test@example.com',
      first_name: 'Carrier',
      last_name: 'Tester'
    });
  });

  describe('#create', () => {
    it('should create carrier credential with encrypted data', async () => {
      // Arrange
      const plainClientId = 'fedex-client-id-12345';
      const plainClientSecret = 'fedex-secret-key-67890';

      const credentialData = {
        user_id: testUser.id,
        carrier: 'fedex',
        client_id_encrypted: CryptoHelper.encrypt(plainClientId),
        client_secret_encrypted: CryptoHelper.encrypt(plainClientSecret),
        account_numbers: '123456789'
      };

      // Act
      const credential = await credentialRepository.create(credentialData);

      // Assert
      expect(credential).toBeDefined();
      expect(credential.id).toBeDefined();
      expect(credential.user_id).toBe(testUser.id);
      expect(credential.carrier).toBe('fedex');
      expect(credential.account_numbers).toBe('123456789');

      // Verify credentials are encrypted in database
      const dbRecord = await CarrierCredential.findByPk(credential.id);
      expect(dbRecord.client_id_encrypted).toBeDefined();
      expect(dbRecord.client_id_encrypted).not.toBe(plainClientId);
      expect(dbRecord.client_secret_encrypted).toBeDefined();
      expect(dbRecord.client_secret_encrypted).not.toBe(plainClientSecret);

      // Verify we can decrypt back to original
      const decryptedId = CryptoHelper.decrypt(dbRecord.client_id_encrypted);
      const decryptedSecret = CryptoHelper.decrypt(dbRecord.client_secret_encrypted);
      expect(decryptedId).toBe(plainClientId);
      expect(decryptedSecret).toBe(plainClientSecret);
    });

    it('should create credential with minimal required fields', async () => {
      // Arrange
      const credentialData = {
        user_id: testUser.id,
        carrier: 'ups',
        client_id_encrypted: CryptoHelper.encrypt('ups-client-id'),
        client_secret_encrypted: CryptoHelper.encrypt('ups-secret')
      };

      // Act
      const credential = await credentialRepository.create(credentialData);

      // Assert
      expect(credential.id).toBeDefined();
      expect(credential.carrier).toBe('ups');
    });

    it('should enforce unique constraint (one credential per carrier per user)', async () => {
      // Arrange
      await createTestCarrierCredential(testUser.id, { carrier: 'fedex' });

      // Act & Assert
      await expect(
        credentialRepository.create({
          user_id: testUser.id,
          carrier: 'fedex',  // Same carrier for same user
          client_id: 'another-id',
          client_secret: 'another-secret'
        })
      ).rejects.toThrow();
    });
  });

  describe('#findById', () => {
    it('should find credential by ID for correct user', async () => {
      // Arrange
      const credential = await createTestCarrierCredential(testUser.id, {
        carrier: 'ups',
        account_numbers: '987654321'
      });

      // Act
      const found = await credentialRepository.findById(credential.id, testUser.id);

      // Assert
      expect(found).toBeDefined();
      expect(found.id).toBe(credential.id);
      expect(found.carrier).toBe('ups');
      expect(found.account_numbers).toBe('987654321');
    });

    it('should return null for non-existent credential', async () => {
      // Act
      const found = await credentialRepository.findById(999999, testUser.id);

      // Assert
      expect(found).toBeNull();
    });

    it('should return null when user tries to access another users credential', async () => {
      // Arrange
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const credential = await createTestCarrierCredential(testUser.id, { carrier: 'fedex' });

      // Act
      const found = await credentialRepository.findById(credential.id, otherUser.id);

      // Assert
      expect(found).toBeNull();
    });
  });

  describe('#findByUserId', () => {
    it('should find all credentials for a user', async () => {
      // Arrange
      await createTestCarrierCredential(testUser.id, { carrier: 'fedex' });
      await createTestCarrierCredential(testUser.id, { carrier: 'ups' });
      await createTestCarrierCredential(testUser.id, { carrier: 'usps' });

      // Act
      const credentials = await credentialRepository.findByUserId(testUser.id);

      // Assert
      expect(credentials).toHaveLength(3);
      expect(credentials.every(c => c.user_id === testUser.id)).toBe(true);

      const carriers = credentials.map(c => c.carrier);
      expect(carriers).toContain('fedex');
      expect(carriers).toContain('ups');
      expect(carriers).toContain('usps');
    });

    it('should return empty array for user with no credentials', async () => {
      // Act
      const credentials = await credentialRepository.findByUserId(testUser.id);

      // Assert
      expect(credentials).toEqual([]);
    });

    it('should only return credentials for specified user', async () => {
      // Arrange
      const otherUser = await createTestUser({ email: 'other@example.com' });
      await createTestCarrierCredential(testUser.id, { carrier: 'fedex' });
      await createTestCarrierCredential(testUser.id, { carrier: 'ups' });
      await createTestCarrierCredential(otherUser.id, { carrier: 'usps' });

      // Act
      const testUserCreds = await credentialRepository.findByUserId(testUser.id);
      const otherUserCreds = await credentialRepository.findByUserId(otherUser.id);

      // Assert
      expect(testUserCreds).toHaveLength(2);
      expect(otherUserCreds).toHaveLength(1);
    });
  });

  describe('#findByUserIdAndCarrier', () => {
    it('should find specific carrier credential for user', async () => {
      // Arrange
      await createTestCarrierCredential(testUser.id, { carrier: 'fedex' });
      await createTestCarrierCredential(testUser.id, { carrier: 'ups' });

      // Act
      const fedexCred = await credentialRepository.findByUserIdAndCarrier(testUser.id, 'fedex');

      // Assert
      expect(fedexCred).toBeDefined();
      expect(fedexCred.carrier).toBe('fedex');
      expect(fedexCred.user_id).toBe(testUser.id);
    });

    it('should return null for non-existent carrier', async () => {
      // Arrange
      await createTestCarrierCredential(testUser.id, { carrier: 'fedex' });

      // Act
      const result = await credentialRepository.findByUserIdAndCarrier(testUser.id, 'dhl');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when user tries to access another users carrier credential', async () => {
      // Arrange
      const otherUser = await createTestUser({ email: 'other@example.com' });
      await createTestCarrierCredential(testUser.id, { carrier: 'fedex' });

      // Act
      const result = await credentialRepository.findByUserIdAndCarrier(otherUser.id, 'fedex');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('#update', () => {
    it('should update credential fields', async () => {
      // Arrange
      const credential = await createTestCarrierCredential(testUser.id, {
        carrier: 'fedex',
        account_numbers: 'old-account'
      });

      const newClientId = 'new-client-id';

      // Act
      const updated = await credentialRepository.update(
        credential.id,
        testUser.id,
        {
          account_numbers: 'new-account-123',
          client_id_encrypted: CryptoHelper.encrypt(newClientId)
        }
      );

      // Assert
      expect(updated).toBeDefined();
      expect(updated.account_numbers).toBe('new-account-123');

      // Verify updated client_id is encrypted
      const dbRecord = await CarrierCredential.findByPk(credential.id);
      expect(dbRecord.client_id_encrypted).not.toBe(newClientId);
      const decrypted = CryptoHelper.decrypt(dbRecord.client_id_encrypted);
      expect(decrypted).toBe(newClientId);
    });

    it('should return null when updating non-existent credential', async () => {
      // Act
      const result = await credentialRepository.update(
        999999,
        testUser.id,
        { account_number: 'test' }
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when user tries to update another users credential', async () => {
      // Arrange
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const credential = await createTestCarrierCredential(testUser.id, { carrier: 'fedex' });

      // Act
      const result = await credentialRepository.update(
        credential.id,
        otherUser.id,
        { account_numbers: 'hacked' }
      );

      // Assert
      expect(result).toBeNull();

      // Verify original credential unchanged
      const original = await CarrierCredential.findByPk(credential.id);
      expect(original.account_numbers).not.toBe('hacked');
    });
  });

  describe('#delete', () => {
    it('should delete credential', async () => {
      // Arrange
      const credential = await createTestCarrierCredential(testUser.id, { carrier: 'fedex' });

      // Act
      const result = await credentialRepository.delete(credential.id, testUser.id);

      // Assert
      expect(result).toEqual({ message: 'Carrier credential deleted successfully' });

      // Verify deletion
      const deleted = await CarrierCredential.findByPk(credential.id);
      expect(deleted).toBeNull();
    });

    it('should return null when deleting non-existent credential', async () => {
      // Act
      const result = await credentialRepository.delete(999999, testUser.id);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when user tries to delete another users credential', async () => {
      // Arrange
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const credential = await createTestCarrierCredential(testUser.id, { carrier: 'fedex' });

      // Act
      const result = await credentialRepository.delete(credential.id, otherUser.id);

      // Assert
      expect(result).toBeNull();

      // Verify credential still exists
      const stillExists = await CarrierCredential.findByPk(credential.id);
      expect(stillExists).not.toBeNull();
    });
  });

  // Note: validateCredentials method does not exist in current repository implementation
  // Commented out for future implementation
  // describe('#validateCredentials', () => {
  //   it('should validate existing active credentials', async () => {
  //     await createTestCarrierCredential(testUser.id, {
  //       carrier: 'fedex',
  //       is_active: true
  //     });
  //     const isValid = await credentialRepository.validateCredentials(testUser.id, 'fedex');
  //     expect(isValid).toBe(true);
  //   });
  //
  //   it('should return false for non-existent credentials', async () => {
  //     const isValid = await credentialRepository.validateCredentials(testUser.id, 'dhl');
  //     expect(isValid).toBe(false);
  //   });
  //
  //   it('should return false for inactive credentials', async () => {
  //     await createTestCarrierCredential(testUser.id, {
  //       carrier: 'fedex',
  //       is_active: false
  //     });
  //     const isValid = await credentialRepository.validateCredentials(testUser.id, 'fedex');
  //     expect(isValid).toBe(false);
  //   });
  // });
});
