class UspsRateRequestBuilder {
  /**
   * Build USPS rate request payload for REST API v3
   * @param {Object} shipmentData - Shipment details
   * @param {Object} credentials - USPS credentials
   * @returns {Object} USPS API request payload
   */
  static buildRateRequest(shipmentData, credentials) {
    const { origin, destination, package: pkg, service_type } = shipmentData;

    const mailingDate = new Date();
    mailingDate.setDate(mailingDate.getDate() + 1); // Tomorrow's date
    const formattedDate = mailingDate.toISOString().split('T')[0];

    return {
      originZIPCode: origin.postal_code,
      destinationZIPCode: destination.postal_code,
      weight: pkg.weight,
      length: pkg.dimensions.length,
      width: pkg.dimensions.width,
      height: pkg.dimensions.height,
      mailClass: this.mapServiceType(service_type),
      processingCategory: this.getProcessingCategory(pkg),
      rateIndicator: 'SP', // Single Piece
      destinationEntryFacilityType: 'NONE',
      priceType: 'COMMERCIAL',
      mailingDate: formattedDate,
    };
  }

  /**
   * Get processing category based on package dimensions
   * @param {Object} pkg - Package data
   * @returns {string} Processing category
   */
  static getProcessingCategory(pkg) {
    const { length, width, height } = pkg.dimensions;
    const girth = 2 * (width + height);
    const lengthPlusGirth = length + girth;

    // USPS considers a package nonstandard if length + girth > 84 inches
    if (lengthPlusGirth > 84) {
      return 'NONSTANDARD';
    }

    // Check if it's machinable (under 27 inches length, under 17 inches width/height)
    if (length <= 27 && width <= 17 && height <= 17) {
      return 'MACHINABLE';
    }

    return 'NONSTANDARD';
  }

  /**
   * Map service type to USPS mail class
   * @param {string} serviceType - Generic service type
   * @returns {string} USPS mail class
   */
  static mapServiceType(serviceType) {
    const mapping = {
      ground: 'PRIORITY_MAIL',
      express: 'PRIORITY_MAIL_EXPRESS',
      overnight: 'PRIORITY_MAIL_EXPRESS',
      international: 'PRIORITY_MAIL_INTERNATIONAL',
    };

    return mapping[serviceType] || 'PRIORITY_MAIL';
  }

  /**
   * Get service name from mail class
   * @param {string} mailClass - USPS mail class
   * @returns {string} Service name
   */
  static getServiceName(mailClass) {
    const serviceNames = {
      'PRIORITY_MAIL': 'USPS Priority Mail',
      'PRIORITY_MAIL_EXPRESS': 'USPS Priority Mail Express',
      'PRIORITY_MAIL_INTERNATIONAL': 'USPS Priority Mail International',
      'FIRST_CLASS': 'USPS First-Class Mail',
      'PARCEL_SELECT': 'USPS Parcel Select',
    };

    return serviceNames[mailClass] || mailClass;
  }
}

module.exports = UspsRateRequestBuilder;
