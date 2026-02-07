/**
 * RatePresenter Unit Tests
 *
 * Tests rate presenter for formatting rate comparison data.
 */

const RatePresenter = require('../../../presenters/rate-presenter');

describe('RatePresenter', () => {
  describe('.present', () => {
    it('should format rate with all fields', () => {
      const rate = {
        id: 'rate-123',
        carrier: 'fedex',
        service_name: 'FedEx Ground',
        service_code: 'FEDEX_GROUND',
        rate_amount: '15.50',
        currency: 'USD',
        delivery_days: 3,
        estimated_delivery_date: '2024-02-10T00:00:00.000Z',
        fetched_at: '2024-02-05T12:00:00.000Z',
      };

      const result = RatePresenter.present(rate);

      expect(result).toEqual({
        id: 'rate-123',
        carrier: 'fedex',
        service: {
          name: 'FedEx Ground',
          code: 'FEDEX_GROUND',
        },
        price: {
          amount: 15.50,
          currency: 'USD',
        },
        delivery: {
          days: 3,
          estimated_date: '2024-02-10T00:00:00.000Z',
        },
        fetched_at: '2024-02-05T12:00:00.000Z',
      });
    });

    it('should default currency to USD when not provided', () => {
      const rate = {
        id: 'rate-123',
        carrier: 'ups',
        service_name: 'UPS Ground',
        rate_amount: '16.00',
      };

      const result = RatePresenter.present(rate);

      expect(result.price.currency).toBe('USD');
    });

    it('should return null for null input', () => {
      const result = RatePresenter.present(null);
      expect(result).toBeNull();
    });
  });

  describe('.presentComparison', () => {
    it('should format comparison with cheapest and fastest', () => {
      const rateComparison = {
        total_carriers: 3,
        total_rates: 5,
        potential_savings: 5.50,
        cached: false,
        cheapest: {
          id: 'rate-1',
          carrier: 'usps',
          service_name: 'USPS Ground',
          service_code: 'USPS_GROUND',
          rate_amount: '14.00',
          currency: 'USD',
          delivery_days: 5,
        },
        fastest: {
          id: 'rate-2',
          carrier: 'fedex',
          service_name: 'FedEx Express',
          service_code: 'FEDEX_EXPRESS',
          rate_amount: '25.00',
          currency: 'USD',
          delivery_days: 1,
        },
        all_rates: [
          {
            id: 'rate-1',
            carrier: 'usps',
            service_name: 'USPS Ground',
            rate_amount: '14.00',
            delivery_days: 5,
          },
          {
            id: 'rate-2',
            carrier: 'fedex',
            service_name: 'FedEx Express',
            rate_amount: '25.00',
            delivery_days: 1,
          },
        ],
      };

      const result = RatePresenter.presentComparison(rateComparison);

      expect(result.summary).toEqual({
        total_carriers: 3,
        total_rates: 5,
        potential_savings: 5.50,
        cached: false,
      });
      expect(result.recommended.cheapest.carrier).toBe('usps');
      expect(result.recommended.fastest.carrier).toBe('fedex');
      expect(result.all_rates).toHaveLength(2);
      expect(result.all_rates[0].carrier).toBe('usps');
    });

    it('should handle missing recommended rates', () => {
      const rateComparison = {
        total_carriers: 1,
        total_rates: 1,
        potential_savings: 0,
        cheapest: null,
        fastest: null,
        all_rates: [],
      };

      const result = RatePresenter.presentComparison(rateComparison);

      expect(result.recommended.cheapest).toBeNull();
      expect(result.recommended.fastest).toBeNull();
      expect(result.all_rates).toEqual([]);
    });

    it('should calculate potential savings correctly', () => {
      const rateComparison = {
        total_carriers: 2,
        total_rates: 2,
        potential_savings: 10.755, // Should be rounded to 2 decimals
        cheapest: null,
        fastest: null,
        all_rates: [],
      };

      const result = RatePresenter.presentComparison(rateComparison);

      expect(result.summary.potential_savings).toBe(10.76);
    });

    it('should default cached to false when not provided', () => {
      const rateComparison = {
        total_carriers: 1,
        total_rates: 1,
        cheapest: null,
        fastest: null,
        all_rates: [],
      };

      const result = RatePresenter.presentComparison(rateComparison);

      expect(result.summary.cached).toBe(false);
    });
  });

  describe('.presentMinimal', () => {
    it('should format minimal rate', () => {
      const rate = {
        carrier: 'fedex',
        service_name: 'FedEx Ground',
        rate_amount: '15.50',
        delivery_days: 3,
      };

      const result = RatePresenter.presentMinimal(rate);

      expect(result).toEqual({
        carrier: 'fedex',
        service: 'FedEx Ground',
        price: 15.50,
        delivery_days: 3,
      });
    });

    it('should return null for null input', () => {
      const result = RatePresenter.presentMinimal(null);
      expect(result).toBeNull();
    });
  });

  describe('.presentHistory', () => {
    it('should format history records array', () => {
      const historyRecords = [
        {
          carrier: 'fedex',
          service_name: 'FedEx Ground',
          rate_amount: '15.50',
          currency: 'USD',
          origin_zip: '10001',
          destination_zip: '90210',
          package_weight: '5.5',
          fetched_at: '2024-02-05T12:00:00.000Z',
        },
        {
          carrier: 'ups',
          service_name: 'UPS Ground',
          rate_amount: '16.00',
          currency: 'USD',
          origin_zip: '10001',
          destination_zip: '90210',
          package_weight: '5.5',
          fetched_at: '2024-02-04T12:00:00.000Z',
        },
      ];

      const result = RatePresenter.presentHistory(historyRecords);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        carrier: 'fedex',
        service: 'FedEx Ground',
        rate: 15.50,
        currency: 'USD',
        route: {
          origin: '10001',
          destination: '90210',
        },
        weight: 5.5,
        fetched_at: '2024-02-05T12:00:00.000Z',
      });
      expect(result[1].carrier).toBe('ups');
    });

    it('should handle empty array', () => {
      const result = RatePresenter.presentHistory([]);
      expect(result).toEqual([]);
    });
  });
});
