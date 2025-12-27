class FedexRateRequestBuilder {
  
  static buildRateRequest(shipmentData, credentials) {
    const { origin, destination, package: pkg } = shipmentData;

    return {
      accountNumber: {
        value: credentials.account_number || credentials.account_numbers?.[0],
      },
      rateRequestControlParameters: {
        returnTransitTimes: true,
      },
      requestedShipment: {
        shipTimestamp: new Date().toISOString(),
        shipper: this.buildAddress(origin),
        recipient: this.buildAddress(destination),
        pickupType: 'CONTACT_FEDEX_TO_SCHEDULE',
        rateRequestType: ['ACCOUNT'],
        requestedPackageLineItems: [
          this.buildPackage(pkg, 1),
        ],
      },
    };
  }

  
  static buildAddress(address) {
    return {
      address: {
        postalCode: address.postal_code,
        countryCode: address.country || 'US',
      },
    };
  }

  
  static buildPackage(pkg, sequenceNumber = 1) {
    const dimensions = pkg.dimensions || {
      length: pkg.length,
      width: pkg.width,
      height: pkg.height,
    };

    return {
      sequenceNumber,
      weight: {
        units: pkg.weight_unit === 'kg' ? 'KG' : 'LB',
        value: pkg.weight,
      },
      dimensions: {
        length: dimensions.length || 1,
        width: dimensions.width || 1,
        height: dimensions.height || 1,
        units: pkg.dimension_unit === 'cm' ? 'CM' : 'IN',
      },
    };
  }

  
}

module.exports = FedexRateRequestBuilder;
