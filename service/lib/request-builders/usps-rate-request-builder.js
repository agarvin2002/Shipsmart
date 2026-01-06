class UspsRateRequestBuilder {

  static buildRateRequest(shipmentData) {
    const { origin, destination, package: pkg, packages } = shipmentData;

    // Normalize to array: support both single package and multiple packages
    const packageList = packages || (pkg ? [pkg] : []);

    if (packageList.length === 0) {
      throw new Error('At least one package is required');
    }

    const isInternational = this.isInternationalShipment(origin, destination);

    // For USPS multi-package: sum weights and use max dimensions
    const totalWeight = packageList.reduce((sum, p) => sum + p.weight, 0);

    // Get max dimensions across all packages
    const maxDimensions = packageList.reduce((max, p) => {
      const dims = p.dimensions || { length: p.length, width: p.width, height: p.height };
      return {
        length: Math.max(max.length, dims.length || 1),
        width: Math.max(max.width, dims.width || 1),
        height: Math.max(max.height, dims.height || 1),
      };
    }, { length: 1, width: 1, height: 1 });

    const mailingDate = new Date();
    mailingDate.setDate(mailingDate.getDate() + 1);
    const formattedDate = mailingDate.toISOString().split('T')[0];

    // International shipments use different payload structure
    if (isInternational) {
      return {
        originZIPCode: origin.postal_code,
        foreignPostalCode: destination.postal_code,
        destinationCountryCode: destination.country,
        weight: totalWeight,
        length: maxDimensions.length,
        width: maxDimensions.width,
        height: maxDimensions.height,
        mailingDate: formattedDate,
      };
    }

    // Domestic shipments
    return {
      originZIPCode: origin.postal_code,
      destinationZIPCode: destination.postal_code,
      weight: totalWeight,
      length: maxDimensions.length,
      width: maxDimensions.width,
      height: maxDimensions.height,
      mailingDate: formattedDate,
    };
  }

  static isInternationalShipment(origin, destination) {
    const originCountry = origin.country || 'US';
    const destinationCountry = destination.country || 'US';
    return originCountry !== destinationCountry;
  }

  static buildTransitTimeRequest(shipmentData) {
    const { origin, destination } = shipmentData;

    return {
      originZIPCode: origin.postal_code,
      destinationZIPCode: destination.postal_code,
    };
  }


  static getServiceName(mailClass) {
    const serviceNames = {
      'PRIORITY_MAIL': 'USPS Priority Mail',
      'PRIORITY_MAIL_EXPRESS': 'USPS Priority Mail Express',
      'PRIORITY_MAIL_INTERNATIONAL': 'USPS Priority Mail International',
      'PRIORITY_MAIL_EXPRESS_INTERNATIONAL': 'USPS Priority Mail Express International',
      'USPS_GROUND_ADVANTAGE': 'USPS Ground Advantage',
      'FIRST_CLASS_MAIL_LETTERS': 'USPS First-Class Mail Letters',
      'FIRST_CLASS_MAIL_FLATS': 'USPS First-Class Mail Flats',
      'FIRST-CLASS_MAIL_LETTERS': 'USPS First-Class Mail Letters',
      'FIRST-CLASS_MAIL_FLATS': 'USPS First-Class Mail Flats',
      'FIRST-CLASS_MAIL_CARDS': 'USPS First-Class Mail Cards',
      'PARCEL_SELECT': 'USPS Parcel Select',
      'MEDIA_MAIL': 'USPS Media Mail',
      'LIBRARY_MAIL': 'USPS Library Mail',
      'BOUND_PRINTED_MATTER': 'USPS Bound Printed Matter',
      'PRIORITY_MAIL_EXPRESS_FOR_LIVES': 'USPS Priority Mail Express for Lives',
    };

    return serviceNames[mailClass] || mailClass;
  }
}

module.exports = UspsRateRequestBuilder;
