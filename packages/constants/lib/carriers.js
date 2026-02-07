const CARRIERS = {
  FEDEX: 'fedex',
  UPS: 'ups',
  USPS: 'usps',
  DHL: 'dhl',
};

const CARRIER_NAMES = {
  [CARRIERS.FEDEX]: 'FedEx',
  [CARRIERS.UPS]: 'UPS',
  [CARRIERS.USPS]: 'USPS',
  [CARRIERS.DHL]: 'DHL',
};

const CARRIER_API_URLS = {
  SANDBOX: {
    [CARRIERS.FEDEX]: 'https://apis-sandbox.fedex.com',
    [CARRIERS.UPS]: 'https://wwwcie.ups.com',
    [CARRIERS.USPS]: 'https://apis-tem.usps.com',
    [CARRIERS.DHL]: 'https://express.api.dhl.com/mydhlapi/test',
  },
  PRODUCTION: {
    [CARRIERS.FEDEX]: 'https://apis.fedex.com',
    [CARRIERS.UPS]: 'https://onlinetools.ups.com',
    [CARRIERS.USPS]: 'https://secure.shippingapis.com',
    [CARRIERS.DHL]: 'https://express.api.dhl.com/mydhlapi',
  },
};

const CARRIER_DEFAULTS = {
  TIMEOUT: 15000, // 15 seconds default for all carriers
  MAX_RETRIES: 2,
  PRIORITY: 3,
};

module.exports = {
  CARRIERS,
  CARRIER_NAMES,
  CARRIER_API_URLS,
  CARRIER_DEFAULTS,
};
