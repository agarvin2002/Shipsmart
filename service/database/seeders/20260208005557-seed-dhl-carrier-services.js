'use strict';

module.exports = {
  up: async function(queryInterface, Sequelize) {
    // DHL Services (carrier_id will be 4 assuming FedEx=1, UPS=2, USPS=3)
    const dhlServices = [
      { service_code: 'DHL_EXPRESS_DOMESTIC', service_name: 'DHL Express Domestic', description: 'US domestic express delivery', category: 'express' },
      { service_code: 'DHL_EXPRESS_WORLDWIDE', service_name: 'DHL Express Worldwide', description: 'International express delivery', category: 'international' },
      { service_code: 'DHL_EXPRESS_WORLDWIDE_DOC', service_name: 'DHL Express Worldwide (Documents)', description: 'International document express', category: 'international' },
      { service_code: 'DHL_EXPRESS_12_00', service_name: 'DHL Express 12:00', description: 'Express delivery by noon', category: 'express' },
      { service_code: 'DHL_EXPRESS_9_00', service_name: 'DHL Express 9:00', description: 'Express delivery by 9 AM', category: 'overnight' },
      { service_code: 'DHL_EXPRESS_10_30', service_name: 'DHL Express 10:30', description: 'Express delivery by 10:30 AM', category: 'overnight' },
      { service_code: 'DHL_EXPRESS_EASY', service_name: 'DHL Express Easy', description: 'Retail international express', category: 'international' },
      { service_code: 'DHL_ECONOMY_SELECT', service_name: 'DHL Economy Select', description: 'Economy international shipping', category: 'international' },
      { service_code: 'DHL_EXPRESS_WORLDWIDE_EU', service_name: 'DHL Express Worldwide (EU)', description: 'International express within EU', category: 'international' },
      { service_code: 'DHL_EXPRESS_9_00_DOC', service_name: 'DHL Express 9:00 (Documents)', description: 'Document express by 9 AM', category: 'overnight' },
      { service_code: 'DHL_MEDICAL_EXPRESS', service_name: 'DHL Medical Express', description: 'Medical shipment express service', category: 'international' },
      { service_code: 'DHL_DOMESTIC_ECONOMY_SELECT', service_name: 'DHL Domestic Economy Select', description: 'Domestic economy shipping', category: 'ground' },
      { service_code: 'DHL_ECONOMY_SELECT_DOMESTIC', service_name: 'DHL Economy Select Domestic', description: 'Domestic economy service', category: 'ground' }
    ];

    // Insert DHL services
    await queryInterface.bulkInsert('carrier_services',
      dhlServices.map(service => ({
        carrier_id: 4,
        service_code: service.service_code,
        service_name: service.service_name,
        description: service.description,
        category: service.category,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      })), {}
    );
  },

  down: async function(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('carrier_services', {
      carrier_id: 4
    }, {});
  }
};
