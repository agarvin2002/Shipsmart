'use strict';

module.exports = {
  up: async function(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('carriers', [
      {
        name: 'DHL',
        code: 'dhl',
        logo_url: null,
        base_url: 'https://express.api.dhl.com/mydhlapi/test',
        endpoints: JSON.stringify({
          get_rates: { path: '/rates', method: 'POST' }
        }),
        headers: JSON.stringify({
          'Content-Type': 'application/json',
          'Authorization': 'Basic {{credentials}}'
        }),
        auth_type: 'basic',
        required_credentials: JSON.stringify(['client_id', 'client_secret', 'account_number']),
        timeout_ms: 30000,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async function(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('carriers', {
      code: 'dhl'
    }, {});
  }
};
