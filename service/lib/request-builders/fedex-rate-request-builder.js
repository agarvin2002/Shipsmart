class FedexRateRequestBuilder {
  /**
   * Build FedEx rate request payload
   * @param {Object} shipmentData - Shipment details
   * @param {Object} credentials - FedEx credentials
   * @returns {Object} FedEx API request payload
   */
  static buildRateRequest(shipmentData, credentials) {
    const { origin, destination, package: pkg, service_type } = shipmentData;

    return {
      accountNumber: {
        value: credentials.account_number || credentials.account_numbers?.[0],
      },
      requestedShipment: {
        shipTimestamp: new Date().toISOString(),
        shipper: this.buildAddress(origin),
        recipient: this.buildAddress(destination),
        pickupType: 'CONTACT_FEDEX_TO_SCHEDULE',
        serviceType: this.mapServiceType(service_type || 'ground'),
        rateRequestType: ['LIST', 'ACCOUNT'],
        requestedPackageLineItems: [
          this.buildPackage(pkg, 1),
        ],
      },
    };
  }

  /**
   * Build address object
   * @param {Object} address - Address data
   * @returns {Object} FedEx address format
   */
  static buildAddress(address) {
    return {
      address: {
        streetLines: [
          address.street_address_1,
          ...(address.street_address_2 ? [address.street_address_2] : []),
        ].filter(Boolean),
        city: address.city,
        stateOrProvinceCode: address.state_province || address.state,
        postalCode: address.postal_code,
        countryCode: address.country || 'US',
      },
    };
  }

  /**
   * Build package object
   * @param {Object} pkg - Package data
   * @param {number} sequenceNumber - Package sequence number (starts at 1)
   * @returns {Object} FedEx package format
   */
  static buildPackage(pkg, sequenceNumber = 1) {
    return {
      sequenceNumber,
      weight: {
        units: 'LB',
        value: pkg.weight,
      },
      dimensions: {
        length: pkg.dimensions.length,
        width: pkg.dimensions.width,
        height: pkg.dimensions.height,
        units: 'IN',
      },
      customerReferences: [
        {
          customerReferenceType: 'CUSTOMER_REFERENCE',
        },
      ],
      ...(pkg.value && {
        declaredValue: {
          amount: pkg.value,
          currency: 'USD',
        },
      }),
    };
  }

  /**
   * Map service type to FedEx service codes
   * @param {string} serviceType - Generic service type
   * @returns {string} FedEx service code
   */
  static mapServiceType(serviceType) {
    const mapping = {
      ground: 'FEDEX_GROUND',
      express: 'FEDEX_EXPRESS_SAVER',
      overnight: 'STANDARD_OVERNIGHT',
      international: 'INTERNATIONAL_PRIORITY',
    };

    return mapping[serviceType] || 'FEDEX_GROUND';
  }
}

module.exports = FedexRateRequestBuilder;
