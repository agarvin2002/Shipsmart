class UpsRateRequestBuilder {

  static buildRateRequest(shipmentData, credentials) {
    const { origin, destination, package: pkg, packages, customs } = shipmentData;

    // Normalize to array: support both single package and multiple packages
    const packageList = packages || (pkg ? [pkg] : []);

    if (packageList.length === 0) {
      throw new Error('At least one package is required');
    }

    const isInternational = this.isInternationalShipment(origin, destination);

    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 1);
    const formattedDate = pickupDate.toISOString().split('T')[0].replace(/-/g, '');

    // Use first package's weight unit for total weight (all packages should use same unit)
    const weightUnit = (packageList[0].weight_unit === 'kg' || packageList[0].weight_unit === 'KG') ? 'KGS' : 'LBS';

    // Calculate total weight
    const totalWeight = packageList.reduce((sum, p) => sum + p.weight, 0);

    // Calculate total declared value for international shipments
    const totalDeclaredValue = packageList.reduce((sum, p) => sum + (p.declared_value || 0), 0);

    const shipment = {
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
      DeliveryTimeInformation: {
        PackageBillType: '03',
        Pickup: {
          Date: formattedDate,
          Time: '1000',
        },
      },
      Package: packageList.map(p => this.buildPackage(p)),
      ShipmentTotalWeight: {
        UnitOfMeasurement: {
          Code: weightUnit,
        },
        Weight: totalWeight.toString(),
      },
    };

    if (isInternational) {
      shipment.ShipFrom = {
        Name: origin.company_name || 'Shipper',
        Address: this.buildAddress(origin),
      };
      shipment.InvoiceLineTotal = {
        CurrencyCode: customs?.currency || 'USD',
        MonetaryValue: (customs?.customs_value || totalDeclaredValue || 100.0).toString(),
      };
    }

    return {
      RateRequest: {
        Shipment: shipment,
      },
    };
  }


  static isInternationalShipment(origin, destination) {
    const originCountry = origin.country || 'US';
    const destinationCountry = destination.country || 'US';
    return originCountry !== destinationCountry;
  }


  static buildAddress(address) {
    // Get state from address or derive from postal code for US addresses
    let stateCode = address.state_province || address.state || address.StateProvinceCode;

    if (!stateCode && address.postal_code && (address.country === 'US' || !address.country)) {
      stateCode = this.getStateFromPostalCode(address.postal_code);
    }

    return {
      AddressLine: address.address_line1 || address.street_lines?.[0] || '123 Main St',
      City: address.city || 'Unknown',
      StateProvinceCode: stateCode || 'CA', // Default to CA if unable to determine
      PostalCode: address.postal_code || address.PostalCode,
      CountryCode: address.country || address.CountryCode || 'US',
    };
  }

  /**
   * Derive US state code from postal code
   * Based on USPS ZIP code ranges
   */
  static getStateFromPostalCode(postalCode) {
    if (!postalCode) return null;

    const zip = parseInt(postalCode.toString().substring(0, 5));
    if (isNaN(zip)) return null;

    // US ZIP code to state mapping (major ranges)
    if (zip >= 35000 && zip <= 36999) return 'AL';
    if (zip >= 99500 && zip <= 99999) return 'AK';
    if (zip >= 85000 && zip <= 86999) return 'AZ';
    if (zip >= 71600 && zip <= 72999) return 'AR';
    if (zip >= 90000 && zip <= 96199) return 'CA';
    if (zip >= 80000 && zip <= 81999) return 'CO';
    if (zip >= 6000 && zip <= 6999) return 'CT';
    if (zip >= 19700 && zip <= 19999) return 'DE';
    if (zip >= 32000 && zip <= 34999) return 'FL';
    if (zip >= 30000 && zip <= 31999) return 'GA';
    if (zip >= 96700 && zip <= 96999) return 'HI';
    if (zip >= 83200 && zip <= 83999) return 'ID';
    if (zip >= 60000 && zip <= 62999) return 'IL';
    if (zip >= 46000 && zip <= 47999) return 'IN';
    if (zip >= 50000 && zip <= 52999) return 'IA';
    if (zip >= 66000 && zip <= 67999) return 'KS';
    if (zip >= 40000 && zip <= 42999) return 'KY';
    if (zip >= 70000 && zip <= 71599) return 'LA';
    if (zip >= 3900 && zip <= 4999) return 'ME';
    if (zip >= 20600 && zip <= 21999) return 'MD';
    if (zip >= 1000 && zip <= 2799) return 'MA';
    if (zip >= 48000 && zip <= 49999) return 'MI';
    if (zip >= 55000 && zip <= 56999) return 'MN';
    if (zip >= 38600 && zip <= 39999) return 'MS';
    if (zip >= 63000 && zip <= 65999) return 'MO';
    if (zip >= 59000 && zip <= 59999) return 'MT';
    if (zip >= 27000 && zip <= 28999) return 'NC';
    if (zip >= 58000 && zip <= 58999) return 'ND';
    if (zip >= 68000 && zip <= 69999) return 'NE';
    if (zip >= 88900 && zip <= 89999) return 'NV';
    if (zip >= 3000 && zip <= 3899) return 'NH';
    if (zip >= 7000 && zip <= 8999) return 'NJ';
    if (zip >= 87000 && zip <= 88499) return 'NM';
    if (zip >= 10000 && zip <= 14999) return 'NY';
    if (zip >= 43000 && zip <= 45999) return 'OH';
    if (zip >= 73000 && zip <= 74999) return 'OK';
    if (zip >= 97000 && zip <= 97999) return 'OR';
    if (zip >= 15000 && zip <= 19699) return 'PA';
    if (zip >= 2800 && zip <= 2999) return 'RI';
    if (zip >= 29000 && zip <= 29999) return 'SC';
    if (zip >= 57000 && zip <= 57999) return 'SD';
    if (zip >= 37000 && zip <= 38599) return 'TN';
    if (zip >= 75000 && zip <= 79999 || zip >= 88500 && zip <= 88599) return 'TX';
    if (zip >= 84000 && zip <= 84999) return 'UT';
    if (zip >= 5000 && zip <= 5999) return 'VT';
    if (zip >= 22000 && zip <= 24699) return 'VA';
    if (zip >= 98000 && zip <= 99499) return 'WA';
    if (zip >= 24700 && zip <= 26999) return 'WV';
    if (zip >= 53000 && zip <= 54999) return 'WI';
    if (zip >= 82000 && zip <= 83199) return 'WY';
    if (zip >= 20000 && zip <= 20599) return 'DC';

    return null;
  }

  
  static buildPackage(pkg) {
    const weightUnit = (pkg.weight_unit === 'kg' || pkg.weight_unit === 'KG') ? 'KGS' : 'LBS';
    const dimensionUnit = (pkg.dimension_unit === 'cm' || pkg.dimension_unit === 'CM') ? 'CM' : 'IN';

    const dimensions = pkg.dimensions || {
      length: pkg.length,
      width: pkg.width,
      height: pkg.height,
    };

    return {
      PackagingType: {
        Code: '02',
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
  }

}

module.exports = UpsRateRequestBuilder;
