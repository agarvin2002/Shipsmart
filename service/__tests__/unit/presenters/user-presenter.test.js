/**
 * UserPresenter Unit Tests
 */

const UserPresenter = require('../../../presenters/user-presenter');

describe('UserPresenter', () => {
  describe('.present', () => {
    it('should format user with all fields', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        company_name: 'Acme Corp',
        phone: '+1234567890',
        status: 'active',
        email_verified: true,
        last_login_at: '2024-02-05T12:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
      };

      const result = UserPresenter.present(user);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        full_name: 'John Doe',
        company_name: 'Acme Corp',
        phone: '+1234567890',
        status: 'active',
        email_verified: true,
        last_login_at: '2024-02-05T12:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should handle optional fields with defaults', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        status: 'active',
      };

      const result = UserPresenter.present(user);

      expect(result.company_name).toBeNull();
      expect(result.phone).toBeNull();
      expect(result.email_verified).toBe(false);
    });

    it('should return null for null input', () => {
      expect(UserPresenter.present(null)).toBeNull();
    });
  });

  describe('.presentBasic', () => {
    it('should format basic user info', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        status: 'active',
      };

      const result = UserPresenter.presentBasic(user);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'John Doe',
        status: 'active',
      });
    });

    it('should return null for null input', () => {
      expect(UserPresenter.presentBasic(null)).toBeNull();
    });
  });
});
