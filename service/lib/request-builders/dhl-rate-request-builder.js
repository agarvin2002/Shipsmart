class DhlRateRequestBuilder {
  /**
   * Builds a DHL Express rate request payload
   * @param {Object} shipmentData - Shipment details from rate service
   * @param {Object} credentials - Carrier credentials with account_number
   * @returns {Object} DHL API rate request payload
   */
  static buildRateRequest(shipmentData, credentials) {
    const { origin, destination, package: pkg, packages, customs } = shipmentData;

    // Normalize to array: support both single package and multiple packages
    const packageList = packages || (pkg ? [pkg] : []);

    if (packageList.length === 0) {
      throw new Error('At least one package is required');
    }

    const isInternational = this.isInternationalShipment(origin, destination);

    // Determine unit of measurement from first package
    const firstPackage = packageList[0];
    const weightUnit = (firstPackage.weight_unit === 'kg' || firstPackage.weight_unit === 'KG') ? 'metric' : 'imperial';

    // Build DHL request
    const request = {
      unitOfMeasurement: weightUnit,
      nextBusinessDay: false,
      packages: packageList.map(p => this.buildPackage(p)),
      isCustomsDeclarable: isInternational,
      returnStandardProductsOnly: true, // Exclude specialty products like Medical Express
      plannedShippingDateAndTime: this.getPlannedShippingDate(),
      accounts: [{
        number: credentials.account_number || credentials.account_numbers?.[0] || '123456789',
        typeCode: 'shipper'
      }],
      payerCountryCode: isInternational ? (destination.country || 'US') : (origin.country || 'US'),
      customerDetails: {
        shipperDetails: this.buildCustomerDetails(origin),
        receiverDetails: this.buildCustomerDetails(destination)
      },
      requestAllValueAddedServices: false,
      productTypeCode: 'all' // Get all available products
    };

    return request;
  }

  /**
   * Determines if shipment is international
   * @param {Object} origin - Origin address
   * @param {Object} destination - Destination address
   * @returns {boolean} True if international
   */
  static isInternationalShipment(origin, destination) {
    const originCountry = origin.country || 'US';
    const destinationCountry = destination.country || 'US';
    return originCountry !== destinationCountry;
  }

  /**
   * Builds customer details for shipper or receiver
   * @param {Object} address - Address object
   * @returns {Object} DHL customer details format
   */
  static buildCustomerDetails(address) {
    return {
      cityName: address.city || 'Unknown',
      countryCode: address.country || 'US',
      postalCode: address.postal_code || address.zip_code || '00000'
    };
  }

  /**
   * Builds DHL package object
   * @param {Object} pkg - Package data
   * @returns {Object} DHL package format
   */
  static buildPackage(pkg) {
    const dimensions = pkg.dimensions || {
      length: pkg.length,
      width: pkg.width,
      height: pkg.height,
    };

    return {
      weight: pkg.weight || 1,
      dimensions: {
        length: dimensions.length || 1,
        width: dimensions.width || 1,
        height: dimensions.height || 1
      }
    };
  }

  /**
   * Gets planned shipping date (tomorrow) in DHL format
   * @returns {string} ISO timestamp with GMT offset
   */
  static getPlannedShippingDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(15, 0, 0, 0); // 3 PM

    // DHL expects format: "2026-02-10T15:00:00 GMT-06:00"
    const offset = -tomorrow.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offset) / 60);
    const offsetMinutes = Math.abs(offset) % 60;
    const offsetSign = offset >= 0 ? '+' : '-';
    const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

    const isoDate = tomorrow.toISOString().replace(/\.\d{3}Z$/, '');
    return `${isoDate} GMT${offsetString}`;
  }
}

module.exports = DhlRateRequestBuilder;
