/**
 * CarrierPresenter Unit Tests
 */

const CarrierPresenter = require('../../../presenters/carrier-presenter');

describe('CarrierPresenter', () => {
  describe('.presentCarrier', () => {
    it('should format carrier data', () => {
      const carrier = {
        id: 'carrier-1',
        name: 'FedEx',
        code: 'fedex',
        logo_url: 'https://example.com/fedex.png',
        auth_type: 'oauth2',
        required_credentials: ['client_id', 'client_secret'],
      };

      const result = CarrierPresenter.presentCarrier(carrier);

      expect(result).toEqual({
        id: 'carrier-1',
        name: 'FedEx',
        code: 'fedex',
        logo_url: 'https://example.com/fedex.png',
        auth_type: 'oauth2',
        required_credentials: ['client_id', 'client_secret'],
      });
    });
  });

  describe('.presentCollection', () => {
    it('should format carrier collection', () => {
      const carriers = [
        { id: 'carrier-1', name: 'FedEx', code: 'fedex' },
        { id: 'carrier-2', name: 'UPS', code: 'ups' },
      ];

      const result = CarrierPresenter.presentCollection(carriers);

      expect(result.carriers).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.carriers[0].code).toBe('fedex');
    });
  });

  describe('.presentService', () => {
    it('should format carrier service', () => {
      const service = {
        id: 'service-1',
        service_code: 'FEDEX_GROUND',
        service_name: 'FedEx Ground',
        description: 'Economy ground shipping',
        category: 'ground',
      };

      const result = CarrierPresenter.presentService(service);

      expect(result).toEqual({
        id: 'service-1',
        service_code: 'FEDEX_GROUND',
        service_name: 'FedEx Ground',
        description: 'Economy ground shipping',
        category: 'ground',
      });
    });
  });

  describe('.presentCarrierWithServices', () => {
    it('should format carrier with its services', () => {
      const data = {
        carrier: {
          id: 'carrier-1',
          name: 'FedEx',
          code: 'fedex',
        },
        services: [
          { id: 'svc-1', service_code: 'FEDEX_GROUND', service_name: 'FedEx Ground' },
          { id: 'svc-2', service_code: 'FEDEX_EXPRESS', service_name: 'FedEx Express' },
        ],
        total: 2,
      };

      const result = CarrierPresenter.presentCarrierWithServices(data);

      expect(result.carrier.code).toBe('fedex');
      expect(result.services).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });
});
