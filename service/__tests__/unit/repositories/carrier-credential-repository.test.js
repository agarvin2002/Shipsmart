/**
 * CarrierCredentialRepository Unit Tests
 */

// Mock uuid before anything else
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

jest.mock('../../../models');

const CarrierCredentialRepository = require('../../../repositories/carrier-credential-repository');
const { CarrierCredential } = require('../../../models');

describe('CarrierCredentialRepository', () => {
  let repository;
  let mockCredential;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCredential = {
      id: 'cred-123',
      user_id: 'user-123',
      carrier: 'fedex',
      update: jest.fn(),
      destroy: jest.fn(),
    };

    repository = new CarrierCredentialRepository();
  });

  describe('#findById', () => {
    it('should find credential by ID and user ID', async () => {
      CarrierCredential.findOne = jest.fn().mockResolvedValue(mockCredential);

      const result = await repository.findById('cred-123', 'user-123');

      expect(CarrierCredential.findOne).toHaveBeenCalledWith({
        where: { id: 'cred-123', user_id: 'user-123' },
      });
      expect(result).toBe(mockCredential);
    });
  });

  describe('#findByUserId', () => {
    it('should find credentials by user ID with default options', async () => {
      CarrierCredential.findAll = jest.fn().mockResolvedValue([mockCredential]);

      const result = await repository.findByUserId('user-123');

      expect(CarrierCredential.findAll).toHaveBeenCalledWith({
        where: { user_id: 'user-123', is_active: true },
        order: [['carrier', 'ASC']],
        limit: undefined,
        offset: undefined,
      });
      expect(result).toEqual([mockCredential]);
    });

    it('should filter by carrier when option provided', async () => {
      CarrierCredential.findAll = jest.fn().mockResolvedValue([mockCredential]);

      await repository.findByUserId('user-123', { carrier: 'fedex' });

      expect(CarrierCredential.findAll).toHaveBeenCalledWith({
        where: { user_id: 'user-123', carrier: 'fedex', is_active: true },
        order: [['carrier', 'ASC']],
        limit: undefined,
        offset: undefined,
      });
    });

    it('should include inactive credentials when active_only is false', async () => {
      CarrierCredential.findAll = jest.fn().mockResolvedValue([mockCredential]);

      await repository.findByUserId('user-123', { active_only: false });

      expect(CarrierCredential.findAll).toHaveBeenCalledWith({
        where: { user_id: 'user-123' },
        order: [['carrier', 'ASC']],
        limit: undefined,
        offset: undefined,
      });
    });
  });

  describe('#findByIdAndUserId', () => {
    it('should find credential by ID and user ID', async () => {
      CarrierCredential.findOne = jest.fn().mockResolvedValue(mockCredential);

      const result = await repository.findByIdAndUserId('cred-123', 'user-123');

      expect(CarrierCredential.findOne).toHaveBeenCalledWith({
        where: { id: 'cred-123', user_id: 'user-123' },
      });
      expect(result).toBe(mockCredential);
    });
  });

  describe('#findByUserIdAndCarrier', () => {
    it('should find credential by user ID and carrier', async () => {
      CarrierCredential.findOne = jest.fn().mockResolvedValue(mockCredential);

      const result = await repository.findByUserIdAndCarrier('user-123', 'fedex');

      expect(CarrierCredential.findOne).toHaveBeenCalledWith({
        where: { user_id: 'user-123', carrier: 'fedex' },
      });
      expect(result).toBe(mockCredential);
    });
  });

  describe('#create', () => {
    it('should create carrier credential', async () => {
      const credentialData = {
        user_id: 'user-123',
        carrier: 'ups',
        client_id_encrypted: 'encrypted_id',
        client_secret_encrypted: 'encrypted_secret',
      };
      CarrierCredential.create = jest.fn().mockResolvedValue(mockCredential);

      const result = await repository.create(credentialData);

      expect(CarrierCredential.create).toHaveBeenCalledWith(credentialData);
      expect(result).toBe(mockCredential);
    });
  });

  describe('#update', () => {
    it('should update carrier credential', async () => {
      CarrierCredential.findOne = jest.fn().mockResolvedValue(mockCredential);
      mockCredential.update.mockResolvedValue(mockCredential);

      const updateData = { is_active: false };
      const result = await repository.update('cred-123', 'user-123', updateData);

      expect(CarrierCredential.findOne).toHaveBeenCalledWith({
        where: { id: 'cred-123', user_id: 'user-123' },
      });
      expect(mockCredential.update).toHaveBeenCalledWith(updateData);
      expect(result).toBe(mockCredential);
    });

    it('should return null if credential not found', async () => {
      CarrierCredential.findOne = jest.fn().mockResolvedValue(null);

      const result = await repository.update('cred-not-found', 'user-123', {});

      expect(result).toBeNull();
    });
  });

  describe('#delete', () => {
    it('should delete carrier credential', async () => {
      CarrierCredential.findOne = jest.fn().mockResolvedValue(mockCredential);
      mockCredential.destroy.mockResolvedValue(undefined);

      const result = await repository.delete('cred-123', 'user-123');

      expect(CarrierCredential.findOne).toHaveBeenCalledWith({
        where: { id: 'cred-123', user_id: 'user-123' },
      });
      expect(mockCredential.destroy).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Carrier credential deleted successfully' });
    });

    it('should return null if credential not found', async () => {
      CarrierCredential.findOne = jest.fn().mockResolvedValue(null);

      const result = await repository.delete('cred-not-found', 'user-123');

      expect(result).toBeNull();
    });
  });

  describe('#updateValidationStatus', () => {
    it('should update validation status and timestamp', async () => {
      CarrierCredential.update = jest.fn().mockResolvedValue([1]);

      const timestamp = new Date();
      const result = await repository.updateValidationStatus('cred-123', 'user-123', 'valid', timestamp);

      expect(CarrierCredential.update).toHaveBeenCalledWith(
        { validation_status: 'valid', last_validated_at: timestamp },
        { where: { id: 'cred-123', user_id: 'user-123' } }
      );
      expect(result).toEqual([1]);
    });
  });
});
