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
          Service: {
            Code: this.mapServiceType(service_type || 'ground'),
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
    // UPS expects AddressLine as a single string, not an array
    const addressLine = address.street_address_1 || address.AddressLine || '';

    return {
      AddressLine: addressLine,
      City: address.city || address.City,
      StateProvinceCode: address.state_province || address.state || address.StateProvinceCode || "IL",
      PostalCode: address.postal_code || address.PostalCode,
      CountryCode: address.country || address.CountryCode || 'US',
    };
  }

  /**
   * Build package object
   * @param {Object} pkg - Package data
   * @returns {Object} UPS package format
   */
  static buildPackage(pkg) {
    const weightUnit = pkg.weight_unit === 'kg' ? 'KGS' : 'LBS';
    const dimensionUnit = pkg.dimension_unit === 'cm' ? 'CM' : 'IN';

    // Handle different dimension formats
    const dimensions = pkg.dimensions || {
      length: pkg.length,
      width: pkg.width,
      height: pkg.height,
    };

    const packageData = {
      PackagingType: {
        Code: '02', // 02 = Package/Customer Supplied
      },
      Dimensions: {
        UnitOfMeasurement: {
          Code: dimensionUnit,
        },
        Length: (dimensions.length || 1).toString(),
        Width: (dimensions.width || 1).toString(),
        Height: (dimensions.height || 1).toString(),
      },
      PackageWeight: {
        UnitOfMeasurement: {
          Code: weightUnit,
        },
        Weight: pkg.weight.toString(),
      },
    };

    // Add declared value if provided
    if (pkg.value) {
      packageData.PackageServiceOptions = {
        DeclaredValue: {
          CurrencyCode: 'USD',
          MonetaryValue: pkg.value.toString(),
        },
      };
    }

    return packageData;
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
}

module.exports = UpsRateRequestBuilder;
