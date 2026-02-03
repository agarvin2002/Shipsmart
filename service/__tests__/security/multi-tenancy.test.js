/**
 * Multi-Tenancy Security Tests
 *
 * 🔴 CRITICAL SECURITY TESTS
 *
 * WHAT IS MULTI-TENANCY?
 * - Multiple users (tenants) share the same database and application
 * - Each user's data MUST be completely isolated from other users
 * - User A should NEVER be able to access User B's data
 *
 * WHY IS THIS CRITICAL?
 * - Prevents data leaks between users
 * - Protects sensitive information (carrier credentials, rates, addresses)
 * - Regulatory compliance (GDPR, HIPAA, etc.)
 * - Customer trust - any breach is catastrophic
 *
 * HOW WE ENFORCE IT:
 * - Every repository method includes user_id in WHERE clause
 * - Example: findById(id, userId) checks BOTH id AND user_id
 * - If user_id doesn't match, return null (access denied)
 *
 * WHAT WE TEST:
 * - Attempting to access another user's rates
 * - Attempting to access another user's credentials
 * - Attempting to access another user's addresses
 * - Attempting to modify/delete another user's data
 */

const RateRepository = require('../../repositories/rate-repository');
const CarrierCredentialRepository = require('../../repositories/carrier-credential-repository');
const AddressRepository = require('../../repositories/address-repository');
const {
  cleanDatabase,
  createTestUser,
  createTestRate,
  createTestCarrierCredential,
  createTestAddress
} = require('../utils/db-cleaner');

describe('🔒 Multi-Tenancy Security Tests', () => {
  let user1, user2;
  let rateRepo, credentialRepo, addressRepo;

  beforeAll(() => {
    rateRepo = new RateRepository();
    credentialRepo = new CarrierCredentialRepository();
    addressRepo = new AddressRepository();
  });

  beforeEach(async () => {
    // Clean database
    await cleanDatabase();

    // Create two separate users
    user1 = await createTestUser({
      email: 'user1@example.com',
      first_name: 'User',
      last_name: 'One'
    });

    user2 = await createTestUser({
      email: 'user2@example.com',
      first_name: 'User',
      last_name: 'Two'
    });
  });

  /**
   * SECURITY TEST: Rate Repository
   * Purpose: Ensure users cannot access each other's shipping rates
   */
  describe('RateRepository - User Isolation', () => {
    it('🔴 CRITICAL: User cannot access another users rate by ID', async () => {
      // Arrange: Create rate for User 1
      const user1Rate = await createTestRate(user1.id, {
        carrier: 'fedex',
        rate_amount: '15.50',
        origin_zip: '10001',
        destination_zip: '90210'
      });

      // Act: User 2 tries to access User 1's rate
      const result = await rateRepo.findById(user1Rate.id, user2.id);

      // Assert: CRITICAL - Must return null (access denied)
      expect(result).toBeNull();
    });

    it('🔴 CRITICAL: User can only see their own rates', async () => {
      // Arrange: Create rates for both users
      await createTestRate(user1.id, { carrier: 'fedex', rate_amount: '15.50' });
      await createTestRate(user1.id, { carrier: 'ups', rate_amount: '18.00' });
      await createTestRate(user2.id, { carrier: 'usps', rate_amount: '12.75' });

      // Act: Each user queries their rates
      const user1Rates = await rateRepo.findByUserId(user1.id);
      const user2Rates = await rateRepo.findByUserId(user2.id);

      // Assert: User 1 sees 2 rates, User 2 sees 1 rate
      expect(user1Rates.length).toBe(2);
      expect(user2Rates.length).toBe(1);

      // Assert: All rates belong to correct user
      expect(user1Rates.every(r => r.user_id === user1.id)).toBe(true);
      expect(user2Rates.every(r => r.user_id === user2.id)).toBe(true);
    });

    it('🔴 CRITICAL: User cannot delete another users rate', async () => {
      // Arrange: Create rate for User 1
      const user1Rate = await createTestRate(user1.id, {
        carrier: 'fedex',
        rate_amount: '15.50'
      });

      // Act: User 2 tries to delete User 1's rate
      const result = await rateRepo.delete(user1Rate.id, user2.id);

      // Assert: Deletion should fail (returns null)
      expect(result).toBeNull();

      // Verify rate still exists for User 1
      const stillExists = await rateRepo.findById(user1Rate.id, user1.id);
      expect(stillExists).not.toBeNull();
    });
  });

  /**
   * SECURITY TEST: CarrierCredential Repository
   * Purpose: Ensure users cannot access each other's carrier API credentials
   * This is EXTREMELY sensitive data (API keys, secrets)
   */
  describe('CarrierCredentialRepository - Credential Isolation', () => {
    it('🔴 CRITICAL: User cannot access another users carrier credentials', async () => {
      // Arrange: User 1 adds FedEx credentials
      const user1Credential = await createTestCarrierCredential(user1.id, {
        carrier: 'fedex',
        client_id: 'user1_fedex_client_id',
        client_secret: 'user1_fedex_secret'
      });

      // Act: User 2 tries to access User 1's credentials
      const result = await credentialRepo.findById(user1Credential.id, user2.id);

      // Assert: CRITICAL - Must return null (access denied)
      expect(result).toBeNull();
    });

    it('🔴 CRITICAL: User can only see their own credentials', async () => {
      // Arrange: Both users add credentials
      await createTestCarrierCredential(user1.id, { carrier: 'fedex' });
      await createTestCarrierCredential(user1.id, { carrier: 'ups' });
      await createTestCarrierCredential(user2.id, { carrier: 'fedex' });

      // Act: Each user queries their credentials
      const user1Creds = await credentialRepo.findByUserId(user1.id);
      const user2Creds = await credentialRepo.findByUserId(user2.id);

      // Assert: Correct counts
      expect(user1Creds.length).toBe(2);
      expect(user2Creds.length).toBe(1);

      // Assert: All credentials belong to correct user
      expect(user1Creds.every(c => c.user_id === user1.id)).toBe(true);
      expect(user2Creds.every(c => c.user_id === user2.id)).toBe(true);
    });

    it('🔴 CRITICAL: User cannot update another users credentials', async () => {
      // Arrange: User 1's credential
      const user1Credential = await createTestCarrierCredential(user1.id, {
        carrier: 'fedex',
        client_id: 'original_client_id'
      });

      // Act: User 2 tries to update User 1's credential
      const result = await credentialRepo.update(
        user1Credential.id,
        user2.id,
        { client_id: 'hacked_client_id' }
      );

      // Assert: Update should fail
      expect(result).toBeNull();

      // Verify original credential unchanged
      const original = await credentialRepo.findById(user1Credential.id, user1.id);
      expect(original).not.toBeNull();
    });

    it('🔴 CRITICAL: User cannot delete another users credentials', async () => {
      // Arrange: User 1's credential
      const user1Credential = await createTestCarrierCredential(user1.id, {
        carrier: 'fedex'
      });

      // Act: User 2 tries to delete User 1's credential
      const result = await credentialRepo.delete(user1Credential.id, user2.id);

      // Assert: Deletion should fail
      expect(result).toBeNull();

      // Verify credential still exists
      const stillExists = await credentialRepo.findById(user1Credential.id, user1.id);
      expect(stillExists).not.toBeNull();
    });
  });

  /**
   * SECURITY TEST: Address Repository
   * Purpose: Ensure users cannot access each other's addresses
   */
  describe('AddressRepository - Address Isolation', () => {
    it('🔴 CRITICAL: User cannot access another users address', async () => {
      // Arrange: User 1's address
      const user1Address = await createTestAddress(user1.id, {
        address_type: 'source',
        postal_code: '10001',
        city: 'New York'
      });

      // Act: User 2 tries to access User 1's address
      const result = await addressRepo.findById(user1Address.id, user2.id);

      // Assert: CRITICAL - Must return null (access denied)
      expect(result).toBeNull();
    });

    it('🔴 CRITICAL: User can only see their own addresses', async () => {
      // Arrange: Both users add addresses
      await createTestAddress(user1.id, { postal_code: '10001' });
      await createTestAddress(user1.id, { postal_code: '10002' });
      await createTestAddress(user2.id, { postal_code: '90210' });

      // Act: Each user queries their addresses
      const user1Addresses = await addressRepo.findByUserId(user1.id);
      const user2Addresses = await addressRepo.findByUserId(user2.id);

      // Assert: Correct counts
      expect(user1Addresses.length).toBe(2);
      expect(user2Addresses.length).toBe(1);

      // Assert: All addresses belong to correct user
      expect(user1Addresses.every(a => a.user_id === user1.id)).toBe(true);
      expect(user2Addresses.every(a => a.user_id === user2.id)).toBe(true);
    });

    it('🔴 CRITICAL: User cannot update another users address', async () => {
      // Arrange: User 1's address
      const user1Address = await createTestAddress(user1.id, {
        postal_code: '10001'
      });

      // Act: User 2 tries to update User 1's address
      const result = await addressRepo.update(
        user1Address.id,
        user2.id,
        { postal_code: '99999' }
      );

      // Assert: Update should fail
      expect(result).toBeNull();

      // Verify original unchanged
      const original = await addressRepo.findById(user1Address.id, user1.id);
      expect(original.postal_code).toBe('10001');
    });

    it('🔴 CRITICAL: User cannot delete another users address', async () => {
      // Arrange: User 1's address
      const user1Address = await createTestAddress(user1.id, {
        postal_code: '10001'
      });

      // Act: User 2 tries to delete User 1's address
      const result = await addressRepo.delete(user1Address.id, user2.id);

      // Assert: Deletion should fail
      expect(result).toBeNull();

      // Verify address still exists
      const stillExists = await addressRepo.findById(user1Address.id, user1.id);
      expect(stillExists).not.toBeNull();
    });
  });

  /**
   * SECURITY TEST: Cross-User Data Leakage
   * Purpose: Ensure no query returns data from other users
   */
  describe('Cross-User Data Leakage Prevention', () => {
    it('🔴 CRITICAL: Query with wrong user_id returns empty results', async () => {
      // Arrange: Create data for User 1
      await createTestRate(user1.id, { carrier: 'fedex' });
      await createTestCarrierCredential(user1.id, { carrier: 'fedex' });
      await createTestAddress(user1.id, { postal_code: '10001' });

      // Act: User 2 queries with their user_id
      const user2Rates = await rateRepo.findByUserId(user2.id);
      const user2Creds = await credentialRepo.findByUserId(user2.id);
      const user2Addresses = await addressRepo.findByUserId(user2.id);

      // Assert: All should be empty (User 2 has no data)
      expect(user2Rates.length).toBe(0);
      expect(user2Creds.length).toBe(0);
      expect(user2Addresses.length).toBe(0);
    });

    it('🔴 CRITICAL: Bulk operations respect user_id filtering', async () => {
      // Arrange: Create multiple rates for both users
      await createTestRate(user1.id, { carrier: 'fedex', rate_amount: '10' });
      await createTestRate(user1.id, { carrier: 'ups', rate_amount: '15' });
      await createTestRate(user1.id, { carrier: 'usps', rate_amount: '20' });
      await createTestRate(user2.id, { carrier: 'fedex', rate_amount: '25' });
      await createTestRate(user2.id, { carrier: 'ups', rate_amount: '30' });

      // Act: Each user queries recent rates
      const user1Recent = await rateRepo.findRecentRates(user1.id, 30);
      const user2Recent = await rateRepo.findRecentRates(user2.id, 30);

      // Assert: Each user sees only their own rates
      expect(user1Recent.length).toBe(3);
      expect(user2Recent.length).toBe(2);
      expect(user1Recent.every(r => r.user_id === user1.id)).toBe(true);
      expect(user2Recent.every(r => r.user_id === user2.id)).toBe(true);
    });
  });

  /**
   * SECURITY TEST: Edge Cases
   * Purpose: Test unusual scenarios that could bypass security
   */
  describe('Security Edge Cases', () => {
    it('🔴 CRITICAL: Passing null user_id does not bypass filtering', async () => {
      // Arrange: Create rate for User 1
      const user1Rate = await createTestRate(user1.id, { carrier: 'fedex' });

      // Act: Try to access with null user_id
      // Sequelize treats this as "WHERE user_id IS NULL" which won't match any rows
      const result = await rateRepo.findById(user1Rate.id, null);

      // Assert: Should return null (no match, access denied)
      expect(result).toBeNull();
    });

    it('🔴 CRITICAL: Passing undefined user_id throws error (does not bypass filtering)', async () => {
      // Arrange: Create credential for User 1
      const user1Cred = await createTestCarrierCredential(user1.id, { carrier: 'fedex' });

      // Act & Assert: Should throw error (invalid input)
      await expect(async () => {
        await credentialRepo.findById(user1Cred.id, undefined);
      }).rejects.toThrow();
    });

    it('🔴 CRITICAL: Passing wrong data type for user_id throws error (does not bypass filtering)', async () => {
      // Arrange: Create address for User 1
      const user1Address = await createTestAddress(user1.id, { postal_code: '10001' });

      // Act & Assert: Should throw error (invalid input)
      await expect(async () => {
        await addressRepo.findById(user1Address.id, 'wrong-type');
      }).rejects.toThrow();
    });
  });
});
