/**
 * CarrierCredentialService Unit Tests
 *
 * Tests carrier credential management including encryption/decryption.
 */

// Mock uuid before anything else
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

// Mock dependencies
jest.mock('../../../repositories/carrier-credential-repository');
jest.mock('../../../helpers/crypto-helper');
jest.mock('../../../lib/carrier-router');
jest.mock('@shipsmart/redis', () => ({
  RedisWrapper: {
    del: jest.fn().mockResolvedValue(0),
    getRedisKey: jest.fn((template, data) =>
      `CARRIER_TOKEN:${data.carrier}:${data.clientId}:${data.userId}`
    ),
  },
  RedisKeys: {
    CARRIER_TOKEN: 'CARRIER_TOKEN:%(carrier)s:%(clientId)s:%(userId)s',
  },
}));

const CarrierCredentialService = require('../../../services/carrier-credential-service');
const CarrierCredentialRepository = require('../../../repositories/carrier-credential-repository');
const CryptoHelper = require('../../../helpers/crypto-helper');
const CarrierRouter = require('../../../lib/carrier-router');
const { NotFoundError, ValidationError } = require('@shipsmart/errors');
const { createMockCarrierCredential } = require('../../utils/test-helpers');
const { RedisWrapper } = require('@shipsmart/redis');

describe('CarrierCredentialService', () => {
  let service;
  let mockRepository;
  let mockCredential;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup repository mock
    mockRepository = {
      findByUserId: jest.fn(),
      findByIdAndUserId: jest.fn(),
      findByUserIdAndCarrier: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateValidationStatus: jest.fn(),
    };
    CarrierCredentialRepository.mockImplementation(() => mockRepository);

    // Setup CryptoHelper mock
    CryptoHelper.encrypt = jest.fn((text) => `encrypted_${text}`);
    CryptoHelper.decrypt = jest.fn((encrypted) => encrypted.replace('encrypted_', ''));

    // Re-setup Redis mock after clearAllMocks
    RedisWrapper.del.mockResolvedValue(0);
    RedisWrapper.getRedisKey.mockImplementation((template, data) =>
      `CARRIER_TOKEN:${data.carrier}:${data.clientId}:${data.userId}`
    );

    // Setup global logger
    global.logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Create mock credential
    mockCredential = createMockCarrierCredential('fedex', {
      id: 'cred-123',
      user_id: 'user-123',
      client_id_encrypted: 'encrypted_test_client_id',
      client_secret_encrypted: 'encrypted_test_client_secret',
      account_numbers: JSON.stringify(['123456789']),
    });

    mockCredential.toJSON = jest.fn(() => ({ ...mockCredential }));

    service = new CarrierCredentialService();
  });

  afterEach(() => {
    delete global.logger;
  });

  describe('#getCredentialsByUserId', () => {
    it('should return decrypted credentials for user', async () => {
      const credentials = [mockCredential];
      mockRepository.findByUserId.mockResolvedValue(credentials);

      const result = await service.getCredentialsByUserId('user-123');

      expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-123', {});
      expect(CryptoHelper.decrypt).toHaveBeenCalledWith('encrypted_test_client_id');
      expect(CryptoHelper.decrypt).toHaveBeenCalledWith('encrypted_test_client_secret');
      expect(result).toHaveLength(1);
      expect(result[0].client_id).toBe('test_client_id');
      expect(result[0].client_secret).toBe('test_client_secret');
      expect(result[0].account_numbers).toEqual(['123456789']);
      expect(result[0].client_id_encrypted).toBeUndefined();
      expect(result[0].client_secret_encrypted).toBeUndefined();
    });

    it('should handle errors and throw', async () => {
      const dbError = new Error('Database error');
      mockRepository.findByUserId.mockRejectedValue(dbError);

      await expect(service.getCredentialsByUserId('user-123')).rejects.toThrow(
        'Database error'
      );

      expect(global.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching credentials')
      );
    });
  });

  describe('#getCredentialById', () => {
    it('should return decrypted credential', async () => {
      mockRepository.findByIdAndUserId.mockResolvedValue(mockCredential);

      const result = await service.getCredentialById('cred-123', 'user-123');

      expect(mockRepository.findByIdAndUserId).toHaveBeenCalledWith('cred-123', 'user-123');
      expect(result.client_id).toBe('test_client_id');
      expect(result.client_secret).toBe('test_client_secret');
      expect(result.account_numbers).toEqual(['123456789']);
      expect(result.client_id_encrypted).toBeUndefined();
    });

    it('should handle credential not found', async () => {
      mockRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.getCredentialById('cred-not-found', 'user-123')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('#createCredential', () => {
    it('should create credential with encrypted data', async () => {
      mockRepository.findByUserIdAndCarrier.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockCredential);

      const data = {
        user_id: 'user-123',
        carrier: 'fedex',
        client_id: 'my_client_id',
        client_secret: 'my_client_secret',
        account_numbers: ['123456789', '987654321'],
      };

      const result = await service.createCredential(data);

      expect(mockRepository.findByUserIdAndCarrier).toHaveBeenCalledWith('user-123', 'fedex');
      expect(CryptoHelper.encrypt).toHaveBeenCalledWith('my_client_id');
      expect(CryptoHelper.encrypt).toHaveBeenCalledWith('my_client_secret');
      expect(mockRepository.create).toHaveBeenCalledWith({
        user_id: 'user-123',
        carrier: 'fedex',
        client_id_encrypted: 'encrypted_my_client_id',
        client_secret_encrypted: 'encrypted_my_client_secret',
        account_numbers: JSON.stringify(['123456789', '987654321']),
        selected_service_ids: null,
      });
      expect(result.client_id).toBe('my_client_id');
      expect(result.client_secret).toBe('my_client_secret');
      expect(result.account_numbers).toEqual(['123456789', '987654321']);
    });

    it('should prevent duplicate credentials for same carrier', async () => {
      mockRepository.findByUserIdAndCarrier.mockResolvedValue(mockCredential);

      const data = {
        user_id: 'user-123',
        carrier: 'fedex',
        client_id: 'test',
        client_secret: 'test',
      };

      await expect(service.createCredential(data)).rejects.toThrow(ValidationError);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should handle errors and throw', async () => {
      mockRepository.findByUserIdAndCarrier.mockResolvedValue(null);
      mockRepository.create.mockRejectedValue(new Error('Create failed'));

      const data = {
        user_id: 'user-123',
        carrier: 'ups',
        client_id: 'test',
        client_secret: 'test',
      };

      await expect(service.createCredential(data)).rejects.toThrow('Create failed');
      expect(global.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error creating credential')
      );
    });
  });

  describe('#updateCredential', () => {
    it('should update credential and re-encrypt if needed', async () => {
      mockRepository.findByIdAndUserId.mockResolvedValue(mockCredential);
      mockRepository.update.mockResolvedValue(mockCredential);

      const updateData = {
        client_id: 'new_client_id',
        client_secret: 'new_client_secret',
        account_numbers: ['999888777'],
        is_active: false,
      };

      const result = await service.updateCredential('cred-123', 'user-123', updateData);

      expect(mockRepository.findByIdAndUserId).toHaveBeenCalledWith('cred-123', 'user-123');
      expect(CryptoHelper.encrypt).toHaveBeenCalledWith('new_client_id');
      expect(CryptoHelper.encrypt).toHaveBeenCalledWith('new_client_secret');
      expect(mockRepository.update).toHaveBeenCalledWith('cred-123', 'user-123', {
        client_id_encrypted: 'encrypted_new_client_id',
        client_secret_encrypted: 'encrypted_new_client_secret',
        account_numbers: JSON.stringify(['999888777']),
        is_active: false,
      });
      expect(result.client_id_encrypted).toBeUndefined();
    });

    it('should update only provided fields', async () => {
      mockRepository.findByIdAndUserId.mockResolvedValue(mockCredential);
      mockRepository.update.mockResolvedValue(mockCredential);

      const updateData = {
        is_active: false,
      };

      await service.updateCredential('cred-123', 'user-123', updateData);

      expect(mockRepository.update).toHaveBeenCalledWith('cred-123', 'user-123', {
        is_active: false,
      });
      expect(CryptoHelper.encrypt).not.toHaveBeenCalled();
    });

    it('should handle credential not found', async () => {
      mockRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.updateCredential('cred-not-found', 'user-123', {})
      ).rejects.toThrow(NotFoundError);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('#deleteCredential', () => {
    it('should delete credential', async () => {
      mockRepository.findByIdAndUserId.mockResolvedValue(mockCredential);
      mockRepository.delete.mockResolvedValue(true);

      const result = await service.deleteCredential('cred-123', 'user-123');

      expect(mockRepository.findByIdAndUserId).toHaveBeenCalledWith('cred-123', 'user-123');
      expect(mockRepository.delete).toHaveBeenCalledWith('cred-123', 'user-123');
      expect(result).toBe(true);
    });

    it('should handle credential not found', async () => {
      mockRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.deleteCredential('cred-not-found', 'user-123')
      ).rejects.toThrow(NotFoundError);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('#validateCredential', () => {
    it('should validate credential successfully', async () => {
      mockRepository.findByIdAndUserId.mockResolvedValue(mockCredential);

      const mockCarrierService = {
        validateCredentials: jest.fn().mockResolvedValue({ valid: true }),
      };
      CarrierRouter.getCarrierService = jest.fn().mockReturnValue(mockCarrierService);

      const result = await service.validateCredential('cred-123', 'user-123');

      expect(mockRepository.findByIdAndUserId).toHaveBeenCalledWith('cred-123', 'user-123');
      expect(CryptoHelper.decrypt).toHaveBeenCalled();
      expect(CarrierRouter.getCarrierService).toHaveBeenCalledWith('fedex', mockCredential);
      expect(mockCarrierService.validateCredentials).toHaveBeenCalled();
      expect(mockRepository.updateValidationStatus).toHaveBeenCalledWith(
        'cred-123',
        'user-123',
        'valid',
        expect.any(Date)
      );
      expect(result.valid).toBe(true);
      expect(result.carrier).toBe('fedex');
      expect(result.validated_at).toBeDefined();
    });

    it('should handle validation failure', async () => {
      mockRepository.findByIdAndUserId.mockResolvedValue(mockCredential);

      const mockCarrierService = {
        validateCredentials: jest.fn().mockResolvedValue({
          valid: false,
          error: 'Invalid credentials',
        }),
      };
      CarrierRouter.getCarrierService = jest.fn().mockReturnValue(mockCarrierService);

      const result = await service.validateCredential('cred-123', 'user-123');

      expect(mockRepository.updateValidationStatus).toHaveBeenCalledWith(
        'cred-123',
        'user-123',
        'invalid',
        expect.any(Date)
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should handle validation errors', async () => {
      mockRepository.findByIdAndUserId.mockResolvedValue(mockCredential);

      const mockCarrierService = {
        validateCredentials: jest.fn().mockRejectedValue(new Error('API timeout')),
      };
      CarrierRouter.getCarrierService = jest.fn().mockReturnValue(mockCarrierService);

      const result = await service.validateCredential('cred-123', 'user-123');

      expect(mockRepository.updateValidationStatus).toHaveBeenCalledWith(
        'cred-123',
        'user-123',
        'invalid',
        expect.any(Date)
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API timeout');
      expect(global.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('credential validation failed'),
        expect.any(Object)
      );
    });
  });
});
