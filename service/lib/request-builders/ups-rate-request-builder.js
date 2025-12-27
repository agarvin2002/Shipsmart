class UpsRateRequestBuilder {
  
  static buildRateRequest(shipmentData, credentials) {
    const { origin, destination, package: pkg } = shipmentData;

    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 1);
    const formattedDate = pickupDate.toISOString().split('T')[0].replace(/-/g, '');

    return {
      RateRequest: {
        Shipment: {
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
          Package: [this.buildPackage(pkg)],
        },
      },
    };
  }

  
  static buildAddress(address) {
    return {
      StateProvinceCode: address.state_province || address.state || address.StateProvinceCode || "IL",
      PostalCode: address.postal_code || address.PostalCode,
      CountryCode: address.country || address.CountryCode || 'US',
    };
  }

  
  static buildPackage(pkg) {
    const weightUnit = pkg.weight_unit === 'kg' ? 'KGS' : 'LBS';
    const dimensionUnit = pkg.dimension_unit === 'cm' ? 'CM' : 'IN';

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
