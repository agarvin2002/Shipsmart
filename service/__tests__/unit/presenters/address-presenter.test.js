/**
 * AddressPresenter Unit Tests
 */

const AddressPresenter = require('../../../presenters/address-presenter');

describe('AddressPresenter', () => {
  describe('.present', () => {
    it('should format address with all fields', () => {
      const address = {
        id: 'addr-123',
        address_label: 'Home',
        address_type: 'origin',
        is_default: true,
        company_name: 'Acme Corp',
        street_address_1: '123 Main St',
        street_address_2: 'Apt 4B',
        city: 'New York',
        state_province: 'NY',
        postal_code: '10001',
        country: 'US',
        phone: '+1234567890',
        created_at: '2024-01-01T00:00:00.000Z',
      };

      const result = AddressPresenter.present(address);

      expect(result).toEqual({
        id: 'addr-123',
        label: 'Home',
        address_type: 'origin',
        is_default: true,
        company_name: 'Acme Corp',
        address: {
          street_1: '123 Main St',
          street_2: 'Apt 4B',
          city: 'New York',
          state: 'NY',
          postal_code: '10001',
          country: 'US',
        },
        phone: '+1234567890',
        created_at: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should handle optional fields with defaults', () => {
      const address = {
        id: 'addr-123',
        address_label: 'Office',
        street_address_1: '456 Oak Ave',
        city: 'Los Angeles',
        state_province: 'CA',
        postal_code: '90210',
      };

      const result = AddressPresenter.present(address);

      expect(result.address_type).toBe('source');
      expect(result.is_default).toBe(false);
      expect(result.company_name).toBeNull();
      expect(result.address.street_2).toBeNull();
      expect(result.address.country).toBe('US');
      expect(result.phone).toBeNull();
    });

    it('should return null for null input', () => {
      expect(AddressPresenter.present(null)).toBeNull();
    });
  });

  describe('.presentCompact', () => {
    it('should format compact address with full_address string', () => {
      const address = {
        id: 'addr-123',
        address_label: 'Home',
        address_type: 'destination',
        is_default: true,
        street_address_1: '123 Main St',
        street_address_2: 'Apt 4B',
        city: 'New York',
        state_province: 'NY',
        postal_code: '10001',
        country: 'US',
      };

      const result = AddressPresenter.presentCompact(address);

      expect(result).toEqual({
        id: 'addr-123',
        label: 'Home',
        address_type: 'destination',
        is_default: true,
        full_address: '123 Main St, Apt 4B, New York, NY, 10001, US',
      });
    });

    it('should return null for null input', () => {
      expect(AddressPresenter.presentCompact(null)).toBeNull();
    });
  });

  describe('.formatFullAddress', () => {
    it('should format full address string with all parts', () => {
      const data = {
        street_address_1: '123 Main St',
        street_address_2: 'Suite 100',
        city: 'New York',
        state_province: 'NY',
        postal_code: '10001',
        country: 'US',
      };

      const result = AddressPresenter.formatFullAddress(data);

      expect(result).toBe('123 Main St, Suite 100, New York, NY, 10001, US');
    });

    it('should filter out missing address parts', () => {
      const data = {
        street_address_1: '123 Main St',
        street_address_2: null,
        city: 'New York',
        state_province: 'NY',
        postal_code: '10001',
      };

      const result = AddressPresenter.formatFullAddress(data);

      expect(result).toBe('123 Main St, New York, NY, 10001, US');
    });
  });
});
