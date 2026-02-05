/**
 * BasePresenter Unit Tests
 *
 * Tests base presenter class for data sanitization and formatting.
 */

const BasePresenter = require('../../../presenters/base-presenter');

describe('BasePresenter', () => {
  describe('.sanitize', () => {
    it('should remove sensitive fields from object', () => {
      const data = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        password_reset_token: 'reset_token',
        password_reset_expires: new Date(),
        email_verification_token: 'verify_token',
        deleted_at: new Date(),
        first_name: 'John',
      };

      const result = BasePresenter.sanitize(data);

      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(result.first_name).toBe('John');
      expect(result.password_hash).toBeUndefined();
      expect(result.password_reset_token).toBeUndefined();
      expect(result.password_reset_expires).toBeUndefined();
      expect(result.email_verification_token).toBeUndefined();
      expect(result.deleted_at).toBeUndefined();
    });

    it('should handle arrays recursively', () => {
      const data = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          password_hash: 'hash1',
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          password_hash: 'hash2',
        },
      ];

      const result = BasePresenter.sanitize(data);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('user-1');
      expect(result[0].password_hash).toBeUndefined();
      expect(result[1].id).toBe('user-2');
      expect(result[1].password_hash).toBeUndefined();
    });

    it('should handle Sequelize models with dataValues', () => {
      const sequelizeModel = {
        dataValues: {
          id: 'user-123',
          email: 'test@example.com',
          password_hash: 'hashed_password',
        },
        save: jest.fn(),
        update: jest.fn(),
      };

      const result = BasePresenter.sanitize(sequelizeModel);

      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(result.password_hash).toBeUndefined();
      expect(result.save).toBeUndefined();
      expect(result.update).toBeUndefined();
    });

    it('should return null for null input', () => {
      const result = BasePresenter.sanitize(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = BasePresenter.sanitize(undefined);
      expect(result).toBeNull();
    });
  });

  describe('.formatTimestamp', () => {
    it('should format valid Date objects to ISO 8601', () => {
      const date = new Date('2024-02-05T12:00:00.000Z');
      const result = BasePresenter.formatTimestamp(date);

      expect(result).toBe('2024-02-05T12:00:00.000Z');
    });

    it('should format valid date strings to ISO 8601', () => {
      const dateString = '2024-02-05';
      const result = BasePresenter.formatTimestamp(dateString);

      expect(result).toMatch(/2024-02-05T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });

    it('should handle YYYYMMDD string format', () => {
      const yyyymmdd = '20240205';
      const result = BasePresenter.formatTimestamp(yyyymmdd);

      expect(result).toMatch(/2024-02-05T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });

    it('should return null for invalid dates', () => {
      expect(BasePresenter.formatTimestamp('invalid-date')).toBeNull();
      expect(BasePresenter.formatTimestamp('not a date')).toBeNull();
      expect(BasePresenter.formatTimestamp({})).toBeNull();
    });

    it('should return null for null input', () => {
      expect(BasePresenter.formatTimestamp(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(BasePresenter.formatTimestamp(undefined)).toBeNull();
    });
  });

  describe('.present', () => {
    it('should call sanitize and return sanitized data', () => {
      const data = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed_password',
      };

      const result = BasePresenter.present(data);

      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(result.password_hash).toBeUndefined();
    });
  });

  describe('.presentCollection', () => {
    it('should present array of items', () => {
      const items = [
        { id: 'user-1', email: 'user1@example.com', password_hash: 'hash1' },
        { id: 'user-2', email: 'user2@example.com', password_hash: 'hash2' },
      ];

      const result = BasePresenter.presentCollection(items);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('user-1');
      expect(result[0].password_hash).toBeUndefined();
      expect(result[1].id).toBe('user-2');
      expect(result[1].password_hash).toBeUndefined();
    });

    it('should return empty array for non-arrays', () => {
      expect(BasePresenter.presentCollection(null)).toEqual([]);
      expect(BasePresenter.presentCollection(undefined)).toEqual([]);
      expect(BasePresenter.presentCollection({})).toEqual([]);
      expect(BasePresenter.presentCollection('not an array')).toEqual([]);
    });
  });
});
