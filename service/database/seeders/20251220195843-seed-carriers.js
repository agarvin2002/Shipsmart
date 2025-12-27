'use strict';

module.exports = {
  up: async function(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('carriers', [
      {
        name: 'FedEx',
        code: 'fedex',
        logo_url: null,
        base_url: 'https://apis-sandbox.fedex.com',
        endpoints: JSON.stringify({
          authenticate: { path: '/oauth/token', method: 'POST' },
          get_rates: { path: '/rate/v1/rates/quotes', method: 'POST' },
          create_shipment: { path: '/ship/v1/shipments', method: 'POST' },
          track: { path: '/track/v1/trackingnumbers', method: 'POST' },
          validate_address: { path: '/address/v1/addresses/resolve', method: 'POST' },
          cancel_shipment: { path: '/ship/v1/shipments/cancel', method: 'PUT' }
        }),
        headers: JSON.stringify({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {{access_token}}',
          'x-customer-transaction-id': '{{transaction_id}}',
          'x-locale': 'en_US'
        }),
        auth_type: 'oauth',
        required_credentials: JSON.stringify(['client_id', 'client_secret', 'account_number']),
        timeout_ms: 30000,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'UPS',
        code: 'ups',
        logo_url: null,
        base_url: 'https://wwwcie.ups.com',
        endpoints: JSON.stringify({
          authenticate: { path: '/security/v1/oauth/token', method: 'POST' },
          get_rates: { path: '/api/rating/v2/Shoptimeintransit', method: 'POST' },
          create_shipment: { path: '/api/shipments/v1/ship', method: 'POST' },
          track: { path: '/api/track/v1/details/{trackingNumber}', method: 'GET' },
          validate_address: { path: '/api/addressvalidation/v1/1', method: 'POST' },
          cancel_shipment: { path: '/api/shipments/v1/cancel/{shipmentId}', method: 'DELETE' }
        }),
        headers: JSON.stringify({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {{access_token}}',
          'transId': '{{transaction_id}}',
          'transactionSrc': 'ShipSmartAI',
          'x-merchant-id': '{{account_number}}'
        }),
        auth_type: 'oauth',
        required_credentials: JSON.stringify(['client_id', 'client_secret', 'account_number']),
        timeout_ms: 30000,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'USPS',
        code: 'usps',
        logo_url: null,
        base_url: 'https://apis-tem.usps.com',
        endpoints: JSON.stringify({
          authenticate: { path: '/oauth2/v3/token', method: 'POST' },
          get_rates: { path: '/prices/v3/base-rates-list/search', method: 'POST' },
          get_transit_time: { path: '/service-standards/v3/estimates', method: 'GET' },
          create_shipment: { path: '/labels/v3/label', method: 'POST' },
          track: { path: '/tracking/v3/tracking/{trackingNumber}', method: 'GET' },
          validate_address: { path: '/addresses/v3/address', method: 'POST' }
        }),
        headers: JSON.stringify({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {{access_token}}'
        }),
        auth_type: 'oauth',
        required_credentials: JSON.stringify(['client_id', 'client_secret']),
        timeout_ms: 30000,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async function(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('carriers', {
      code: ['fedex', 'ups', 'usps']
    }, {});
  }
};
