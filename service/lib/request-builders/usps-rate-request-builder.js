class UspsRateRequestBuilder {

  static buildRateRequest(shipmentData) {
    const { origin, destination, package: pkg } = shipmentData;

    const isInternational = this.isInternationalShipment(origin, destination);

    const dimensions = pkg.dimensions || {
      length: pkg.length,
      width: pkg.width,
      height: pkg.height,
    };

    const mailingDate = new Date();
    mailingDate.setDate(mailingDate.getDate() + 1);
    const formattedDate = mailingDate.toISOString().split('T')[0];

    // International shipments use different payload structure
    if (isInternational) {
      return {
        originZIPCode: origin.postal_code,
        foreignPostalCode: destination.postal_code,
        destinationCountryCode: destination.country,
        weight: pkg.weight,
        length: dimensions.length || 1,
        width: dimensions.width || 1,
        height: dimensions.height || 1,
        mailingDate: formattedDate,
      };
    }

    // Domestic shipments
    return {
      originZIPCode: origin.postal_code,
      destinationZIPCode: destination.postal_code,
      weight: pkg.weight,
      length: dimensions.length || 1,
      width: dimensions.width || 1,
      height: dimensions.height || 1,
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
