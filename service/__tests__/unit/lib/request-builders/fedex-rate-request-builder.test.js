/**
 * FedEx Rate Request Builder Unit Tests
 *
 * CRITICAL: Tests API payload construction for FedEx rate requests
 * - Domestic vs International shipments
 * - Single vs Multiple packages
 * - Address formatting
 * - Customs clearance details
 * - Weight/dimension unit conversions
 */

const FedexRateRequestBuilder = require('../../../../lib/request-builders/fedex-rate-request-builder');

describe('FedexRateRequestBuilder', () => {
  describe('buildRateRequest', () => {
    it('should build request for domestic single package shipment', () => {
      const shipmentData = {
        origin: {
          postal_code: '10001',
          city: 'New York',
          state: 'NY',
          country: 'US'
        },
        destination: {
          postal_code: '90210',
          city: 'Beverly Hills',
          state: 'CA',
          country: 'US'
        },
        package: {
          weight: 5,
          length: 12,
          width: 8,
          height: 6,
          weight_unit: 'lb',
          dimension_unit: 'in'
        }
      };

      const credentials = {
        account_number: 'FEDEX123456'
      };

      const result = FedexRateRequestBuilder.buildRateRequest(shipmentData, credentials);

      expect(result).toHaveProperty('accountNumber');
      expect(result.accountNumber.value).toBe('FEDEX123456');
      expect(result).toHaveProperty('rateRequestControlParameters');
      expect(result.rateRequestControlParameters.returnTransitTimes).toBe(true);
      expect(result).toHaveProperty('requestedShipment');
      expect(result.requestedShipment.shipper.address.postalCode).toBe('10001');
      expect(result.requestedShipment.recipient.address.postalCode).toBe('90210');
      expect(result.requestedShipment.requestedPackageLineItems).toHaveLength(1);
      expect(result.requestedShipment.totalWeight).toBe(5);
      expect(result.requestedShipment).not.toHaveProperty('customsClearanceDetail'); // Domestic
    });

    it('should build request for multiple packages', () => {
      const shipmentData = {
        origin: {
          postal_code: '10001',
          country: 'US'
        },
        destination: {
          postal_code: '90210',
          country: 'US'
        },
        packages: [
          { weight: 5, length: 10, width: 8, height: 6 },
          { weight: 3, length: 8, width: 6, height: 4 },
          { weight: 7, length: 12, width: 10, height: 8 }
        ]
      };

      const credentials = { account_number: 'FEDEX123' };

      const result = FedexRateRequestBuilder.buildRateRequest(shipmentData, credentials);

      expect(result.requestedShipment.requestedPackageLineItems).toHaveLength(3);
      expect(result.requestedShipment.totalWeight).toBe(15); // 5 + 3 + 7
      expect(result.requestedShipment.requestedPackageLineItems[0].sequenceNumber).toBe(1);
      expect(result.requestedShipment.requestedPackageLineItems[1].sequenceNumber).toBe(2);
      expect(result.requestedShipment.requestedPackageLineItems[2].sequenceNumber).toBe(3);
    });

    it('should build request for international shipment with customs', () => {
      const shipmentData = {
        origin: {
          postal_code: '10001',
          country: 'US'
        },
        destination: {
          postal_code: 'M5H 2N2',
          country: 'CA'
        },
        package: {
          weight: 5,
          length: 10,
          width: 8,
          height: 6
        },
        customs: {
          commodity_description: 'Electronics',
          customs_value: 500,
          currency: 'USD',
          duties_payment_type: 'RECIPIENT'
        }
      };

      const credentials = { account_number: 'FEDEX123' };

      const result = FedexRateRequestBuilder.buildRateRequest(shipmentData, credentials);

      expect(result.requestedShipment).toHaveProperty('customsClearanceDetail');
      expect(result.requestedShipment.customsClearanceDetail.dutiesPayment.paymentType).toBe('RECIPIENT');
      expect(result.requestedShipment.customsClearanceDetail.commodities).toHaveLength(1);
      expect(result.requestedShipment.customsClearanceDetail.commodities[0].description).toBe('Electronics');
      expect(result.requestedShipment.customsClearanceDetail.commodities[0].customsValue.amount).toBe(500);
    });

    it('should throw error when no packages provided', () => {
      const shipmentData = {
        origin: { postal_code: '10001', country: 'US' },
        destination: { postal_code: '90210', country: 'US' }
        // No package or packages
      };

      const credentials = { account_number: 'FEDEX123' };

      expect(() => {
        FedexRateRequestBuilder.buildRateRequest(shipmentData, credentials);
      }).toThrow('At least one package is required');
    });

    it('should support account_numbers array format', () => {
      const shipmentData = {
        origin: { postal_code: '10001', country: 'US' },
        destination: { postal_code: '90210', country: 'US' },
        package: { weight: 5, length: 10, width: 8, height: 6 }
      };

      const credentials = {
        account_numbers: ['FEDEX123', 'FEDEX456'] // Array format
      };

      const result = FedexRateRequestBuilder.buildRateRequest(shipmentData, credentials);

      expect(result.accountNumber.value).toBe('FEDEX123'); // First account number
    });

    it('should include shipTimestamp', () => {
      const shipmentData = {
        origin: { postal_code: '10001', country: 'US' },
        destination: { postal_code: '90210', country: 'US' },
        package: { weight: 5, length: 10, width: 8, height: 6 }
      };

      const credentials = { account_number: 'FEDEX123' };

      const result = FedexRateRequestBuilder.buildRateRequest(shipmentData, credentials);

      expect(result.requestedShipment).toHaveProperty('shipTimestamp');
      expect(typeof result.requestedShipment.shipTimestamp).toBe('string');
      expect(result.requestedShipment.shipTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
    });

    it('should set pickupType to CONTACT_FEDEX_TO_SCHEDULE', () => {
      const shipmentData = {
        origin: { postal_code: '10001', country: 'US' },
        destination: { postal_code: '90210', country: 'US' },
        package: { weight: 5, length: 10, width: 8, height: 6 }
      };

      const credentials = { account_number: 'FEDEX123' };

      const result = FedexRateRequestBuilder.buildRateRequest(shipmentData, credentials);

      expect(result.requestedShipment.pickupType).toBe('CONTACT_FEDEX_TO_SCHEDULE');
    });

    it('should set rateRequestType to ACCOUNT', () => {
      const shipmentData = {
        origin: { postal_code: '10001', country: 'US' },
        destination: { postal_code: '90210', country: 'US' },
        package: { weight: 5, length: 10, width: 8, height: 6 }
      };

      const credentials = { account_number: 'FEDEX123' };

      const result = FedexRateRequestBuilder.buildRateRequest(shipmentData, credentials);

      expect(result.requestedShipment.rateRequestType).toEqual(['ACCOUNT']);
    });
  });

  describe('isInternationalShipment', () => {
    it('should return false for US to US shipment', () => {
      const origin = { country: 'US' };
      const destination = { country: 'US' };

      const result = FedexRateRequestBuilder.isInternationalShipment(origin, destination);

      expect(result).toBe(false);
    });

    it('should return true for US to CA shipment', () => {
      const origin = { country: 'US' };
      const destination = { country: 'CA' };

      const result = FedexRateRequestBuilder.isInternationalShipment(origin, destination);

      expect(result).toBe(true);
    });

    it('should return true for CA to US shipment', () => {
      const origin = { country: 'CA' };
      const destination = { country: 'US' };

      const result = FedexRateRequestBuilder.isInternationalShipment(origin, destination);

      expect(result).toBe(true);
    });

    it('should default to US when origin country is missing', () => {
      const origin = {}; // No country
      const destination = { country: 'US' };

      const result = FedexRateRequestBuilder.isInternationalShipment(origin, destination);

      expect(result).toBe(false); // Treated as US to US
    });

    it('should default to US when destination country is missing', () => {
      const origin = { country: 'US' };
      const destination = {}; // No country

      const result = FedexRateRequestBuilder.isInternationalShipment(origin, destination);

      expect(result).toBe(false); // Treated as US to US
    });

    it('should return true when origin missing and destination is international', () => {
      const origin = {}; // Defaults to US
      const destination = { country: 'CA' };

      const result = FedexRateRequestBuilder.isInternationalShipment(origin, destination);

      expect(result).toBe(true); // US (default) to CA
    });
  });

  describe('buildAddress', () => {
    it('should build address with all fields', () => {
      const address = {
        address_line1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postal_code: '10001',
        country: 'US'
      };

      const result = FedexRateRequestBuilder.buildAddress(address);

      expect(result.address.streetLines).toEqual(['123 Main St']);
      expect(result.address.city).toBe('New York');
      expect(result.address.stateOrProvinceCode).toBe('NY');
      expect(result.address.postalCode).toBe('10001');
      expect(result.address.countryCode).toBe('US');
    });

    it('should use street_lines array if provided', () => {
      const address = {
        street_lines: ['456 Oak Ave', 'Apt 2B'],
        city: 'Boston',
        postal_code: '02101',
        country: 'US'
      };

      const result = FedexRateRequestBuilder.buildAddress(address);

      expect(result.address.streetLines).toEqual(['456 Oak Ave', 'Apt 2B']);
    });

    it('should use default street line if none provided', () => {
      const address = {
        city: 'Dallas',
        postal_code: '75201',
        country: 'US'
      };

      const result = FedexRateRequestBuilder.buildAddress(address);

      expect(result.address.streetLines).toEqual(['123 Main Street']); // Default
    });

    it('should use default city if none provided', () => {
      const address = {
        postal_code: '10001',
        country: 'US'
      };

      const result = FedexRateRequestBuilder.buildAddress(address);

      expect(result.address.city).toBe('Unknown'); // Default
    });

    it('should default country to US', () => {
      const address = {
        postal_code: '10001',
        city: 'New York'
      };

      const result = FedexRateRequestBuilder.buildAddress(address);

      expect(result.address.countryCode).toBe('US'); // Default
    });

    it('should support state_province field', () => {
      const address = {
        postal_code: '10001',
        city: 'New York',
        state_province: 'NY',
        country: 'US'
      };

      const result = FedexRateRequestBuilder.buildAddress(address);

      expect(result.address.stateOrProvinceCode).toBe('NY');
    });

    it('should support stateOrProvinceCode field', () => {
      const address = {
        postal_code: '10001',
        city: 'New York',
        stateOrProvinceCode: 'NY',
        country: 'US'
      };

      const result = FedexRateRequestBuilder.buildAddress(address);

      expect(result.address.stateOrProvinceCode).toBe('NY');
    });

    it('should omit stateOrProvinceCode if not provided', () => {
      const address = {
        postal_code: 'M5H 2N2',
        city: 'Toronto',
        country: 'CA'
        // No state/province
      };

      const result = FedexRateRequestBuilder.buildAddress(address);

      expect(result.address).not.toHaveProperty('stateOrProvinceCode');
    });
  });

  describe('buildCustomsClearanceDetail', () => {
    it('should build customs details for single package', () => {
      const packageList = [{
        weight: 5,
        weight_unit: 'lb',
        declared_value: 100
      }];

      const customs = {
        commodity_description: 'Electronics',
        customs_value: 150,
        currency: 'USD',
        duties_payment_type: 'SENDER'
      };

      const result = FedexRateRequestBuilder.buildCustomsClearanceDetail(packageList, customs);

      expect(result.dutiesPayment.paymentType).toBe('SENDER');
      expect(result.commodities).toHaveLength(1);
      expect(result.commodities[0].description).toBe('Electronics');
      expect(result.commodities[0].customsValue.amount).toBe(150);
      expect(result.commodities[0].customsValue.currency).toBe('USD');
      expect(result.commodities[0].weight.value).toBe(5);
      expect(result.commodities[0].weight.units).toBe('LB');
    });

    it('should build customs details for multiple packages', () => {
      const packageList = [
        { weight: 5, weight_unit: 'lb' },
        { weight: 3, weight_unit: 'kg' },
        { weight: 7, weight_unit: 'lb' }
      ];

      const customs = {
        commodity_description: 'Mixed Goods',
        customs_value: 500
      };

      const result = FedexRateRequestBuilder.buildCustomsClearanceDetail(packageList, customs);

      expect(result.commodities).toHaveLength(3);
      expect(result.commodities[0].weight.units).toBe('LB');
      expect(result.commodities[1].weight.units).toBe('KG'); // Converted to uppercase
      expect(result.commodities[2].weight.units).toBe('LB');
    });

    it('should use defaults when customs data is missing', () => {
      const packageList = [{ weight: 5 }];
      const customs = null;

      const result = FedexRateRequestBuilder.buildCustomsClearanceDetail(packageList, customs);

      expect(result.dutiesPayment.paymentType).toBe('SENDER'); // Default
      expect(result.commodities[0].description).toBe('Sample Goods'); // Default
      expect(result.commodities[0].customsValue.amount).toBe(100.0); // Default
      expect(result.commodities[0].customsValue.currency).toBe('USD'); // Default
      expect(result.commodities[0].quantity).toBe(1); // Default
      expect(result.commodities[0].quantityUnits).toBe('PCS'); // Default
    });

    it('should use package description if provided', () => {
      const packageList = [{
        weight: 5,
        description: 'Package Description'
      }];

      const customs = {};

      const result = FedexRateRequestBuilder.buildCustomsClearanceDetail(packageList, customs);

      expect(result.commodities[0].description).toBe('Package Description');
    });

    it('should use package declared_value if customs_value not provided', () => {
      const packageList = [{
        weight: 5,
        declared_value: 250
      }];

      const customs = {}; // No customs_value

      const result = FedexRateRequestBuilder.buildCustomsClearanceDetail(packageList, customs);

      expect(result.commodities[0].customsValue.amount).toBe(250);
    });

    it('should handle uppercase KG weight unit', () => {
      const packageList = [{ weight: 10, weight_unit: 'KG' }];
      const customs = {};

      const result = FedexRateRequestBuilder.buildCustomsClearanceDetail(packageList, customs);

      expect(result.commodities[0].weight.units).toBe('KG');
    });
  });

  describe('buildPackage', () => {
    it('should build package with all fields', () => {
      const pkg = {
        weight: 10,
        length: 12,
        width: 8,
        height: 6,
        weight_unit: 'lb',
        dimension_unit: 'in'
      };

      const result = FedexRateRequestBuilder.buildPackage(pkg, 1);

      expect(result.sequenceNumber).toBe(1);
      expect(result.weight.value).toBe(10);
      expect(result.weight.units).toBe('LB');
      expect(result.dimensions.length).toBe(12);
      expect(result.dimensions.width).toBe(8);
      expect(result.dimensions.height).toBe(6);
      expect(result.dimensions.units).toBe('IN');
    });

    it('should support dimensions object', () => {
      const pkg = {
        weight: 5,
        dimensions: {
          length: 10,
          width: 8,
          height: 6
        },
        weight_unit: 'kg',
        dimension_unit: 'cm'
      };

      const result = FedexRateRequestBuilder.buildPackage(pkg, 2);

      expect(result.sequenceNumber).toBe(2);
      expect(result.dimensions.length).toBe(10);
      expect(result.dimensions.width).toBe(8);
      expect(result.dimensions.height).toBe(6);
      expect(result.dimensions.units).toBe('CM');
      expect(result.weight.units).toBe('KG');
    });

    it('should default to LB for weight unit', () => {
      const pkg = {
        weight: 5,
        length: 10,
        width: 8,
        height: 6
        // No weight_unit
      };

      const result = FedexRateRequestBuilder.buildPackage(pkg);

      expect(result.weight.units).toBe('LB'); // Default
    });

    it('should default to IN for dimension unit', () => {
      const pkg = {
        weight: 5,
        length: 10,
        width: 8,
        height: 6
        // No dimension_unit
      };

      const result = FedexRateRequestBuilder.buildPackage(pkg);

      expect(result.dimensions.units).toBe('IN'); // Default
    });

    it('should convert kg to KG (uppercase)', () => {
      const pkg = {
        weight: 10,
        length: 10,
        width: 8,
        height: 6,
        weight_unit: 'kg'
      };

      const result = FedexRateRequestBuilder.buildPackage(pkg);

      expect(result.weight.units).toBe('KG');
    });

    it('should convert cm to CM (uppercase)', () => {
      const pkg = {
        weight: 5,
        length: 25,
        width: 20,
        height: 15,
        dimension_unit: 'cm'
      };

      const result = FedexRateRequestBuilder.buildPackage(pkg);

      expect(result.dimensions.units).toBe('CM');
    });

    it('should use default dimensions if missing', () => {
      const pkg = {
        weight: 5
        // No dimensions
      };

      const result = FedexRateRequestBuilder.buildPackage(pkg);

      expect(result.dimensions.length).toBe(1); // Default
      expect(result.dimensions.width).toBe(1); // Default
      expect(result.dimensions.height).toBe(1); // Default
    });

    it('should default sequence number to 1', () => {
      const pkg = {
        weight: 5,
        length: 10,
        width: 8,
        height: 6
      };

      const result = FedexRateRequestBuilder.buildPackage(pkg); // No sequence number

      expect(result.sequenceNumber).toBe(1); // Default
    });
  });
});
