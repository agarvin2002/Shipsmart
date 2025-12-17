class UpsRateRequestBuilder {
  /**
   * Build UPS rate request payload
   * @param {Object} shipmentData - Shipment details
   * @param {Object} credentials - UPS credentials
   * @returns {Object} UPS API request payload
   */
  static buildRateRequest(shipmentData, credentials) {
    const { origin, destination, package: pkg, service_type } = shipmentData;

    return {
      RateRequest: {
        Request: {
          SubVersion: '1807',
          RequestOption: 'Rate',
          TransactionReference: {
            CustomerContext: 'ShipSmart AI Rate Request',
          },
        },
        Shipment: {
          ShipmentRatingOptions: {
            UserLevelDiscountIndicator: 'true',
            NegotiatedRatesIndicator: 'true',
          },
          Shipper: {
            Name: origin.company_name || 'Shipper',
            ShipperNumber: credentials.account_number || credentials.account_numbers?.[0],
            Address: this.buildAddress(origin),
          },
          ShipTo: {
            Name: destination.company_name || 'Recipient',
            Address: this.buildAddress(destination),
          },
          ShipFrom: {
            Name: origin.company_name || 'Shipper',
            Address: this.buildAddress(origin),
          },
          Service: {
            Code: this.mapServiceType(service_type || 'ground'),
            Description: this.getServiceDescription(service_type || 'ground'),
          },
          Package: [this.buildPackage(pkg)],
        },
      },
    };
  }

  /**
   * Build address object
   * @param {Object} address - Address data
   * @returns {Object} UPS address format
   */
  static buildAddress(address) {
    return {
      AddressLine: [
        address.street_address_1,
        ...(address.street_address_2 ? [address.street_address_2] : []),
      ].filter(Boolean),
      City: address.city,
      StateProvinceCode: address.state_province || address.state,
      PostalCode: address.postal_code,
      CountryCode: address.country || 'US',
    };
  }

  /**
   * Build package object
   * @param {Object} pkg - Package data
   * @returns {Object} UPS package format
   */
  static buildPackage(pkg) {
    return {
      PackagingType: {
        Code: '02', // Package
        Description: 'Package',
      },
      Dimensions: {
        UnitOfMeasurement: {
          Code: 'IN',
          Description: 'Inches',
        },
        Length: pkg.dimensions.length.toString(),
        Width: pkg.dimensions.width.toString(),
        Height: pkg.dimensions.height.toString(),
      },
      PackageWeight: {
        UnitOfMeasurement: {
          Code: 'LBS',
          Description: 'Pounds',
        },
        Weight: pkg.weight.toString(),
      },
      ...(pkg.value && {
        PackageServiceOptions: {
          DeclaredValue: {
            CurrencyCode: 'USD',
            MonetaryValue: pkg.value.toString(),
          },
        },
      }),
    };
  }

  /**
   * Map service type to UPS service codes
   * @param {string} serviceType - Generic service type
   * @returns {string} UPS service code
   */
  static mapServiceType(serviceType) {
    const mapping = {
      ground: '03', // UPS Ground
      express: '02', // UPS 2nd Day Air
      overnight: '01', // UPS Next Day Air
      international: '08', // UPS Worldwide Expedited
    };

    return mapping[serviceType] || '03';
  }

  /**
   * Get service description for UPS service type
   * @param {string} serviceType - Generic service type
   * @returns {string} Service description
   */
  static getServiceDescription(serviceType) {
    const mapping = {
      ground: 'UPS Ground',
      express: 'UPS 2nd Day Air',
      overnight: 'UPS Next Day Air',
      international: 'UPS Worldwide Expedited',
    };

    return mapping[serviceType] || 'UPS Ground';
  }
}

module.exports = UpsRateRequestBuilder;
