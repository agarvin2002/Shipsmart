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
    return {
      AddressLine: address.address_line1 || address.street_lines?.[0] || '123 Main St',
      City: address.city || 'Unknown',
      StateProvinceCode: address.state_province || address.state || address.StateProvinceCode || 'IL',
      PostalCode: address.postal_code || address.PostalCode,
      CountryCode: address.country || address.CountryCode || 'US',
    };
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
