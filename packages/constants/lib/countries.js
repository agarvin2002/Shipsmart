const COUNTRIES = {
  US: 'US',
  CA: 'CA',
  MX: 'MX',
  GB: 'GB',
  // Add more as needed
};

const COUNTRY_DEFAULTS = {
  DEFAULT: COUNTRIES.US,
  SUPPORTED: [COUNTRIES.US, COUNTRIES.CA, COUNTRIES.MX],
};

module.exports = {
  COUNTRIES,
  COUNTRY_DEFAULTS,
};
