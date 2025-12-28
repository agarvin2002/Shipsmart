class FedexRateRequestBuilder {

  static buildRateRequest(shipmentData, credentials) {
    const { origin, destination, package: pkg, customs } = shipmentData;

    const isInternational = this.isInternationalShipment(origin, destination);

    const requestedShipment = {
      shipTimestamp: new Date().toISOString(),
      shipper: this.buildAddress(origin),
      recipient: this.buildAddress(destination),
      pickupType: 'CONTACT_FEDEX_TO_SCHEDULE',
      rateRequestType: ['ACCOUNT'],
      requestedPackageLineItems: [
        this.buildPackage(pkg, 1),
      ],
    };

    if (isInternational) {
      requestedShipment.customsClearanceDetail = this.buildCustomsClearanceDetail(pkg, customs);
    }

    // Add totalWeight as a simple number (required by FedEx API)
    requestedShipment.totalWeight = pkg.weight;

    return {
      accountNumber: {
        value: credentials.account_number || credentials.account_numbers?.[0],
      },
      rateRequestControlParameters: {
        returnTransitTimes: true,
      },
      requestedShipment,
    };
  }


  static isInternationalShipment(origin, destination) {
    const originCountry = origin.country || 'US';
    const destinationCountry = destination.country || 'US';
    return originCountry !== destinationCountry;
  }


  static buildAddress(address) {
    const addressData = {
      streetLines: address.street_lines || (address.address_line1 ? [address.address_line1] : ['123 Main Street']),
      city: address.city || 'Unknown',
      postalCode: address.postal_code,
      countryCode: address.country || 'US',
    };

    // Only add stateOrProvinceCode if it exists (not all countries require it)
    const stateCode = address.state_province || address.state || address.stateOrProvinceCode;
    if (stateCode) {
      addressData.stateOrProvinceCode = stateCode;
    }

    return {
      address: addressData,
    };
  }


  static buildCustomsClearanceDetail(pkg, customs) {
    const weightUnit = (pkg.weight_unit === 'kg' || pkg.weight_unit === 'KG') ? 'KG' : 'LB';

    return {
      dutiesPayment: {
        paymentType: customs?.duties_payment_type || 'SENDER',
      },
      commodities: [
        {
          description: customs?.commodity_description || pkg.description || 'Sample Goods',
          quantity: customs?.quantity || 1,
          quantityUnits: customs?.quantity_units || 'PCS',
          weight: {
            units: weightUnit,
            value: pkg.weight,
          },
          customsValue: {
            amount: customs?.customs_value || pkg.declared_value || 100.0,
            currency: customs?.currency || 'USD',
          },
        },
      ],
    };
  }

  
  static buildPackage(pkg, sequenceNumber = 1) {
    const dimensions = pkg.dimensions || {
      length: pkg.length,
      width: pkg.width,
      height: pkg.height,
    };

    const weightUnit = (pkg.weight_unit === 'kg' || pkg.weight_unit === 'KG') ? 'KG' : 'LB';
    const dimensionUnit = (pkg.dimension_unit === 'cm' || pkg.dimension_unit === 'CM') ? 'CM' : 'IN';

    return {
      sequenceNumber,
      weight: {
        units: weightUnit,
        value: pkg.weight,
      },
      dimensions: {
        length: dimensions.length || 1,
        width: dimensions.width || 1,
        height: dimensions.height || 1,
        units: dimensionUnit,
      },
    };
  }

  
}

module.exports = FedexRateRequestBuilder;
