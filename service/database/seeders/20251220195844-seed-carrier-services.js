'use strict';

module.exports = {
  up: async function(queryInterface, Sequelize) {
    // FedEx Services (carrier_id will be 1)
    const fedexServices = [
      { service_code: 'FEDEX_GROUND', service_name: 'FedEx Ground', description: 'Cost-effective ground shipping', category: 'ground' },
      { service_code: 'FEDEX_HOME_DELIVERY', service_name: 'FedEx Home Delivery', description: 'Residential ground delivery', category: 'ground' },
      { service_code: 'FEDEX_EXPRESS_SAVER', service_name: 'FedEx Express Saver', description: '3 business days', category: 'express' },
      { service_code: 'FEDEX_2_DAY', service_name: 'FedEx 2Day', description: '2 business days', category: 'express' },
      { service_code: 'FEDEX_2_DAY_AM', service_name: 'FedEx 2Day A.M.', description: '2 business days by 10:30 AM', category: 'express' },
      { service_code: 'STANDARD_OVERNIGHT', service_name: 'FedEx Standard Overnight', description: 'Next business day afternoon', category: 'overnight' },
      { service_code: 'PRIORITY_OVERNIGHT', service_name: 'FedEx Priority Overnight', description: 'Next business day by 10:30 AM', category: 'overnight' },
      { service_code: 'FIRST_OVERNIGHT', service_name: 'FedEx First Overnight', description: 'Next business day by 8:00 AM', category: 'overnight' },
      { service_code: 'FEDEX_FREIGHT_PRIORITY', service_name: 'FedEx Freight Priority', description: 'Fast freight service', category: 'freight' },
      { service_code: 'FEDEX_FREIGHT_ECONOMY', service_name: 'FedEx Freight Economy', description: 'Cost-effective freight', category: 'freight' },
      { service_code: 'FEDEX_INTERNATIONAL_PRIORITY', service_name: 'FedEx International Priority', description: 'International express delivery', category: 'international' },
      { service_code: 'INTERNATIONAL_ECONOMY', service_name: 'FedEx International Economy', description: 'Cost-effective international', category: 'international' },
      { service_code: 'FEDEX_INTERNATIONAL_CONNECT_PLUS', service_name: 'FedEx International Connect Plus', description: 'International economy service', category: 'international' },
      { service_code: 'INTERNATIONAL_FIRST', service_name: 'FedEx International First', description: 'Next business day international', category: 'international' },
      { service_code: 'INTERNATIONAL_GROUND', service_name: 'FedEx International Ground', description: 'Ground international shipping', category: 'international' },
      { service_code: 'FEDEX_1_DAY_FREIGHT', service_name: 'FedEx 1Day Freight', description: 'Next business day freight', category: 'freight' },
      { service_code: 'FEDEX_2_DAY_FREIGHT', service_name: 'FedEx 2Day Freight', description: '2 business days freight', category: 'freight' },
      { service_code: 'FEDEX_3_DAY_FREIGHT', service_name: 'FedEx 3Day Freight', description: '3 business days freight', category: 'freight' },
      { service_code: 'INTERNATIONAL_PRIORITY_FREIGHT', service_name: 'FedEx International Priority Freight', description: 'Fast international freight', category: 'international' },
      { service_code: 'INTERNATIONAL_ECONOMY_FREIGHT', service_name: 'FedEx International Economy Freight', description: 'Cost-effective international freight', category: 'international' },
      { service_code: 'SMART_POST', service_name: 'FedEx SmartPost', description: 'Cost-effective residential delivery', category: 'ground' }
    ];

    // UPS Services (carrier_id will be 2)
    const upsServices = [
      { service_code: '01', service_name: 'UPS Next Day Air', description: 'Next business day by end of day', category: 'overnight' },
      { service_code: '02', service_name: 'UPS 2nd Day Air', description: '2 business days by end of day', category: 'express' },
      { service_code: '03', service_name: 'UPS Ground', description: 'Cost-effective ground shipping', category: 'ground' },
      { service_code: '07', service_name: 'UPS Worldwide Express', description: 'International express', category: 'international' },
      { service_code: '08', service_name: 'UPS Worldwide Expedited', description: 'International expedited', category: 'international' },
      { service_code: '11', service_name: 'UPS Standard', description: 'Standard international', category: 'international' },
      { service_code: '12', service_name: 'UPS 3 Day Select', description: '3 business days', category: 'express' },
      { service_code: '13', service_name: 'UPS Next Day Air Saver', description: 'Next business day by 3:00 PM', category: 'overnight' },
      { service_code: '14', service_name: 'UPS Next Day Air Early', description: 'Next business day by 8:00 AM', category: 'overnight' },
      { service_code: '54', service_name: 'UPS Worldwide Express Plus', description: 'Fastest international', category: 'international' },
      { service_code: '59', service_name: 'UPS 2nd Day Air A.M.', description: '2 business days by 10:30 AM', category: 'express' },
      { service_code: '65', service_name: 'UPS Worldwide Saver', description: 'International by end of day', category: 'international' },
      { service_code: '70', service_name: 'UPS Access Point Economy', description: 'Economy delivery to access point', category: 'ground' },
      { service_code: '71', service_name: 'UPS Worldwide Express Freight Midday', description: 'International freight by midday', category: 'freight' },
      { service_code: '72', service_name: 'UPS Worldwide Economy DDU', description: 'International economy DDU', category: 'international' },
      { service_code: '74', service_name: 'UPS Express 12:00', description: 'Delivery by noon', category: 'express' },
      { service_code: '75', service_name: 'UPS Heavy Goods', description: 'Heavy goods service', category: 'freight' },
      { service_code: '82', service_name: 'UPS Today Standard', description: 'Same day standard', category: 'same_day' },
      { service_code: '83', service_name: 'UPS Today Dedicated Courier', description: 'Same day dedicated', category: 'same_day' },
      { service_code: '84', service_name: 'UPS Today Express', description: 'Same day express', category: 'same_day' },
      { service_code: '85', service_name: 'UPS Today Express Saver', description: 'Same day express saver', category: 'same_day' },
      { service_code: '86', service_name: 'UPS Worldwide Express Freight', description: 'International express freight', category: 'freight' },
      { service_code: '96', service_name: 'UPS Worldwide Express Freight Midday', description: 'Freight by midday', category: 'freight' }
    ];

    // USPS Services (carrier_id will be 3)
    const uspsServices = [
      { service_code: 'PRIORITY_MAIL_EXPRESS', service_name: 'USPS Priority Mail Express', description: '1-2 day guaranteed delivery', category: 'express' },
      { service_code: 'PRIORITY_MAIL_EXPRESS_FOR_LIVES', service_name: 'USPS Priority Mail Express for Lives', description: '3-day guaranteed delivery for critical shipments', category: 'express' },
      { service_code: 'PRIORITY_MAIL', service_name: 'USPS Priority Mail', description: '1-3 day specific delivery', category: 'priority' },
      { service_code: 'USPS_GROUND_ADVANTAGE', service_name: 'USPS Ground Advantage', description: '2-5 day specific delivery', category: 'ground' },
      { service_code: 'FIRST-CLASS_MAIL_LETTERS', service_name: 'USPS First-Class Mail Letters', description: '1-3 business days', category: 'first_class' },
      { service_code: 'FIRST-CLASS_MAIL_FLATS', service_name: 'USPS First-Class Mail Flats', description: '1-3 business days', category: 'first_class' },
      { service_code: 'FIRST-CLASS_MAIL_CARDS', service_name: 'USPS First-Class Mail Cards', description: '1-3 business days', category: 'first_class' },
      { service_code: 'PARCEL_SELECT', service_name: 'USPS Parcel Select', description: '2-8 business days', category: 'ground' },
      { service_code: 'MEDIA_MAIL', service_name: 'USPS Media Mail', description: '2-8 business days for media', category: 'ground' },
      { service_code: 'LIBRARY_MAIL', service_name: 'USPS Library Mail', description: 'For library materials', category: 'ground' },
      { service_code: 'BOUND_PRINTED_MATTER', service_name: 'USPS Bound Printed Matter', description: 'For bound printed materials', category: 'ground' },
      { service_code: 'PRIORITY_MAIL_INTERNATIONAL', service_name: 'USPS Priority Mail International', description: '6-10 business days', category: 'international' },
      { service_code: 'PRIORITY_MAIL_EXPRESS_INTERNATIONAL', service_name: 'USPS Priority Mail Express International', description: 'International express delivery', category: 'international' }
    ];

    // Insert FedEx services
    await queryInterface.bulkInsert('carrier_services',
      fedexServices.map(service => ({
        carrier_id: 1,
        service_code: service.service_code,
        service_name: service.service_name,
        description: service.description,
        category: service.category,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      })), {}
    );

    // Insert UPS services
    await queryInterface.bulkInsert('carrier_services',
      upsServices.map(service => ({
        carrier_id: 2,
        service_code: service.service_code,
        service_name: service.service_name,
        description: service.description,
        category: service.category,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      })), {}
    );

    // Insert USPS services
    await queryInterface.bulkInsert('carrier_services',
      uspsServices.map(service => ({
        carrier_id: 3,
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
      carrier_id: [1, 2, 3]
    }, {});
  }
};
