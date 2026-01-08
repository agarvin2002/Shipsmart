class FedexRateRequestBuilder {

  static buildRateRequest(shipmentData, credentials) {
    const { origin, destination, package: pkg, packages, customs } = shipmentData;

    // Normalize to array: support both single package and multiple packages
    const packageList = packages || (pkg ? [pkg] : []);

    if (packageList.length === 0) {
      throw new Error('At least one package is required');
    }

    const isInternational = this.isInternationalShipment(origin, destination);

    // Calculate total weight
    const totalWeight = packageList.reduce((sum, p) => sum + p.weight, 0);

    const requestedShipment = {
      shipTimestamp: new Date().toISOString(),
      shipper: this.buildAddress(origin),
      recipient: this.buildAddress(destination),
      pickupType: 'CONTACT_FEDEX_TO_SCHEDULE',
      rateRequestType: ['ACCOUNT'],
      requestedPackageLineItems: packageList.map((p, index) =>
        this.buildPackage(p, index + 1)
      ),
    };

    if (isInternational) {
      requestedShipment.customsClearanceDetail = this.buildCustomsClearanceDetail(packageList, customs);
    }

    // Add totalWeight as a simple number (required by FedEx API)
    requestedShipment.totalWeight = totalWeight;

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


  static buildCustomsClearanceDetail(packageList, customs) {
    // Build commodities array from all packages
    const commodities = packageList.map((pkg) => {
      const weightUnit = (pkg.weight_unit === 'kg' || pkg.weight_unit === 'KG') ? 'KG' : 'LB';

      return {
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
      };
    });

    return {
      dutiesPayment: {
        paymentType: customs?.duties_payment_type || 'SENDER',
      },
      commodities,
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
