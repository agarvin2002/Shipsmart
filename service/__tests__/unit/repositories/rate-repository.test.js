/**
 * RateRepository Unit Tests
 */

// Mock uuid before anything else
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

jest.mock('../../../models');

const RateRepository = require('../../../repositories/rate-repository');
const { Rate } = require('../../../models');
const { Op } = require('sequelize');

describe('RateRepository', () => {
  let repository;
  let mockRate;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRate = {
      id: 'rate-123',
      user_id: 'user-123',
      carrier: 'fedex',
      service_name: 'FedEx Ground',
      rate_amount: '15.50',
    };

    repository = new RateRepository();
  });

  describe('#create', () => {
    it('should create rate', async () => {
      const rateData = {
        user_id: 'user-123',
        carrier: 'fedex',
        service_name: 'FedEx Ground',
        rate_amount: '15.50',
      };
      Rate.create = jest.fn().mockResolvedValue(mockRate);

      const result = await repository.create(rateData);

      expect(Rate.create).toHaveBeenCalledWith(rateData);
      expect(result).toBe(mockRate);
    });
  });

  describe('#bulkCreate', () => {
    it('should bulk create rates', async () => {
      const ratesData = [
        { carrier: 'fedex', rate_amount: '15.50' },
        { carrier: 'ups', rate_amount: '16.00' },
      ];
      Rate.bulkCreate = jest.fn().mockResolvedValue(ratesData);

      const result = await repository.bulkCreate(ratesData);

      expect(Rate.bulkCreate).toHaveBeenCalledWith(ratesData);
      expect(result).toBe(ratesData);
    });
  });

  describe('#findById', () => {
    it('should find rate by ID with user ID filter', async () => {
      Rate.findOne = jest.fn().mockResolvedValue(mockRate);

      const result = await repository.findById('rate-123', 'user-123');

      expect(Rate.findOne).toHaveBeenCalledWith({
        where: { id: 'rate-123', user_id: 'user-123' },
      });
      expect(result).toBe(mockRate);
    });
  });

  describe('#findByShipmentId', () => {
    it('should find rates by shipment ID ordered by amount', async () => {
      Rate.findAll = jest.fn().mockResolvedValue([mockRate]);

      const result = await repository.findByShipmentId('shipment-123');

      expect(Rate.findAll).toHaveBeenCalledWith({
        where: { shipment_id: 'shipment-123' },
        order: [['rate_amount', 'ASC']],
      });
      expect(result).toEqual([mockRate]);
    });
  });

  describe('#findByUserId', () => {
    it('should find rates by user ID with default options', async () => {
      Rate.findAll = jest.fn().mockResolvedValue([mockRate]);

      const result = await repository.findByUserId('user-123');

      expect(Rate.findAll).toHaveBeenCalledWith({
        where: { user_id: 'user-123' },
        order: [['fetched_at', 'DESC']],
        limit: 50,
        offset: 0,
      });
      expect(result).toEqual([mockRate]);
    });

    it('should filter by carrier when option provided', async () => {
      Rate.findAll = jest.fn().mockResolvedValue([mockRate]);

      await repository.findByUserId('user-123', { carrier: 'fedex', limit: 10, offset: 5 });

      expect(Rate.findAll).toHaveBeenCalledWith({
        where: { user_id: 'user-123', carrier: 'fedex' },
        order: [['fetched_at', 'DESC']],
        limit: 10,
        offset: 5,
      });
    });
  });

  describe('#findRecentRates', () => {
    it('should find recent rates within specified days', async () => {
      Rate.findAll = jest.fn().mockResolvedValue([mockRate]);

      const result = await repository.findRecentRates('user-123', 7);

      expect(Rate.findAll).toHaveBeenCalledWith({
        where: {
          user_id: 'user-123',
          fetched_at: { [Op.gte]: expect.any(Date) },
        },
        order: [['fetched_at', 'DESC']],
      });
      expect(result).toEqual([mockRate]);
    });
  });

  describe('#delete', () => {
    it('should delete rate by ID with user ID filter', async () => {
      Rate.destroy = jest.fn().mockResolvedValue(1);

      const result = await repository.delete('rate-123', 'user-123');

      expect(Rate.destroy).toHaveBeenCalledWith({
        where: { id: 'rate-123', user_id: 'user-123' },
      });
      expect(result).toBe(1);
    });

    it('should return null when no rows deleted', async () => {
      Rate.destroy = jest.fn().mockResolvedValue(0);

      const result = await repository.delete('rate-not-found', 'user-123');

      expect(result).toBeNull();
    });
  });
});
