class CarrierPresenter {
  /**
   * Present a single carrier
   * @param {Object} carrier - Carrier object
   * @returns {Object} Formatted carrier
   */
  static presentCarrier(carrier) {
    return {
      id: carrier.id,
      name: carrier.name,
      code: carrier.code,
      logo_url: carrier.logo_url,
      auth_type: carrier.auth_type,
      required_credentials: carrier.required_credentials
    };
  }

  /**
   * Present a collection of carriers
   * @param {Array} carriers - Array of carrier objects
   * @returns {Object} Formatted response
   */
  static presentCollection(carriers) {
    return {
      carriers: carriers.map(c => this.presentCarrier(c)),
      total: carriers.length
    };
  }

  /**
   * Present a single carrier service
   * @param {Object} service - Service object
   * @returns {Object} Formatted service
   */
  static presentService(service) {
    return {
      id: service.id,
      service_code: service.service_code,
      service_name: service.service_name,
      description: service.description,
      category: service.category
    };
  }

  /**
   * Present carrier with its services
   * @param {Object} data - Object containing carrier and services
   * @returns {Object} Formatted response
   */
  static presentCarrierWithServices(data) {
    return {
      carrier: {
        id: data.carrier.id,
        name: data.carrier.name,
        code: data.carrier.code
      },
      services: data.services.map(s => this.presentService(s)),
      total: data.total
    };
  }
}

module.exports = CarrierPresenter;
