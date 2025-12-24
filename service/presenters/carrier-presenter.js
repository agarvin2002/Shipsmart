class CarrierPresenter {
  
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

  
  static presentCollection(carriers) {
    return {
      carriers: carriers.map(c => this.presentCarrier(c)),
      total: carriers.length
    };
  }

  
  static presentService(service) {
    return {
      id: service.id,
      service_code: service.service_code,
      service_name: service.service_name,
      description: service.description,
      category: service.category
    };
  }

  
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
