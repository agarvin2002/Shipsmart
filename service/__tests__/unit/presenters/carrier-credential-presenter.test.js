/**
 * CarrierCredentialPresenter Unit Tests
 */

const CarrierCredentialPresenter = require('../../../presenters/carrier-credential-presenter');

describe('CarrierCredentialPresenter', () => {
  describe('.present', () => {
    it('should format credential with masked secrets', () => {
      const credential = {
        id: 'cred-123',
        carrier: 'fedex',
        client_id: 'abcdefghijklmnop',
        client_secret: 'secretkey123456789',
        account_numbers: ['123456', '789012'],
        is_active: true,
        validation_status: 'valid',
        last_validated_at: '2024-02-05T12:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
      };

      const result = CarrierCredentialPresenter.present(credential);

      expect(result).toEqual({
        id: 'cred-123',
        carrier: 'fedex',
        client_id: 'abcd****mnop',
        client_secret: 'secr****6789',
        account_numbers: ['123456', '789012'],
        is_active: true,
        validation_status: 'valid',
        last_validated_at: '2024-02-05T12:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should handle defaults for optional fields', () => {
      const credential = {
        id: 'cred-123',
        carrier: 'ups',
      };

      const result = CarrierCredentialPresenter.present(credential);

      expect(result.account_numbers).toEqual([]);
      expect(result.is_active).toBe(false);
      expect(result.validation_status).toBe('pending');
    });

    it('should return null for null input', () => {
      expect(CarrierCredentialPresenter.present(null)).toBeNull();
    });
  });

  describe('.presentBasic', () => {
    it('should format basic credential info', () => {
      const credential = {
        id: 'cred-123',
        carrier: 'fedex',
        is_active: true,
        validation_status: 'valid',
      };

      const result = CarrierCredentialPresenter.presentBasic(credential);

      expect(result).toEqual({
        id: 'cred-123',
        carrier: 'fedex',
        is_active: true,
        validation_status: 'valid',
      });
    });

    it('should return null for null input', () => {
      expect(CarrierCredentialPresenter.presentBasic(null)).toBeNull();
    });
  });

  describe('.maskCredential', () => {
    it('should mask long credentials showing first and last 4 chars', () => {
      const value = 'abcdefghijklmnop';
      const result = CarrierCredentialPresenter.maskCredential(value);
      expect(result).toBe('abcd****mnop');
    });

    it('should mask short credentials with ****', () => {
      expect(CarrierCredentialPresenter.maskCredential('short')).toBe('****');
      expect(CarrierCredentialPresenter.maskCredential('12345678')).toBe('****');
    });

    it('should return null for null/undefined input', () => {
      expect(CarrierCredentialPresenter.maskCredential(null)).toBeNull();
      expect(CarrierCredentialPresenter.maskCredential(undefined)).toBeNull();
    });
  });
});
