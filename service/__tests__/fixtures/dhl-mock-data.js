/**
 * DHL API Mock Data
 *
 * Mock responses for DHL Express (MyDHL) API endpoints
 * Based on live API testing with DHL Express MyDHL API
 */

const AUTH_SUCCESS = 'aGFjaFVTOkYkN3VIIzVlSSM1bQ=='; // Base64 encoded Basic Auth string

const AUTH_FAILURE = {
  error: 'invalid_client',
  error_description: 'Invalid DHL credentials',
};

const RATE_SUCCESS_DOMESTIC = {
  products: [
    {
      productName: 'EXPRESS DOMESTIC',
      productCode: 'N',
      localProductCode: 'N',
      localProductCountryCode: 'US',
      networkTypeCode: 'TD',
      isCustomerAgreement: false,
      weight: {
        volumetric: 6.96,
        provided: 7,
        unitOfMeasurement: 'imperial'
      },
      totalPrice: [
        {
          currencyType: 'BILLC',
          priceCurrency: 'USD',
          price: 78.48
        },
        {
          currencyType: 'PULCL',
          priceCurrency: 'USD',
          price: 78.48
        }
      ],
      totalPriceBreakdown: [
        {
          currencyType: 'BILLC',
          priceCurrency: 'USD',
          priceBreakdown: [
            {
              typeCode: 'SPRQT',
              price: 64.11
            }
          ]
        }
      ],
      detailedPriceBreakdown: [
        {
          currencyType: 'BILLC',
          priceCurrency: 'USD',
          breakdown: [
            {
              name: 'EXPRESS DOMESTIC',
              price: 64.11
            },
            {
              name: 'FUEL SURCHARGE',
              serviceCode: 'FF',
              price: 14.02
            }
          ]
        }
      ],
      pickupCapabilities: {
        nextBusinessDay: false,
        localCutoffDateAndTime: '2026-02-10T19:00:00',
        originServiceAreaCode: 'ORD',
        pickupAdditionalDays: 0,
        pickupDayOfWeek: 2
      },
      deliveryCapabilities: {
        deliveryTypeCode: 'QDDF',
        estimatedDeliveryDateAndTime: '2026-02-11T23:59:00',
        totalTransitDays: 1,
        deliveryDayOfWeek: 3
      },
      pricingDate: '2026-02-07'
    }
  ],
  exchangeRates: [
    {
      currentExchangeRate: 0.838715,
      currency: 'USD',
      baseCurrency: 'EUR'
    }
  ]
};

const RATE_SUCCESS_INTERNATIONAL = {
  products: [
    {
      productName: 'EXPRESS WORLDWIDE',
      productCode: 'P',
      localProductCode: 'P',
      localProductCountryCode: 'US',
      networkTypeCode: 'TD',
      isCustomerAgreement: false,
      weight: {
        volumetric: 4.3,
        provided: 5,
        unitOfMeasurement: 'imperial'
      },
      totalPrice: [
        {
          currencyType: 'BILLC',
          priceCurrency: 'USD',
          price: 33.32
        },
        {
          currencyType: 'PULCL',
          priceCurrency: 'USD',
          price: 33.32
        }
      ],
      totalPriceBreakdown: [
        {
          currencyType: 'BILLC',
          priceCurrency: 'USD',
          priceBreakdown: [
            {
              typeCode: 'SPRQT',
              price: 29.92
            }
          ]
        }
      ],
      detailedPriceBreakdown: [
        {
          currencyType: 'BILLC',
          priceCurrency: 'USD',
          breakdown: [
            {
              name: 'EXPRESS WORLDWIDE',
              price: 29.92
            },
            {
              name: 'FUEL SURCHARGE',
              serviceCode: 'FF',
              price: 3.4
            }
          ]
        }
      ],
      pickupCapabilities: {
        nextBusinessDay: false,
        localCutoffDateAndTime: '2026-01-13T19:00:00',
        originServiceAreaCode: 'ORD',
        pickupAdditionalDays: 0,
        pickupDayOfWeek: 2
      },
      deliveryCapabilities: {
        deliveryTypeCode: 'QDDF',
        estimatedDeliveryDateAndTime: '2026-01-19T23:59:00',
        totalTransitDays: 3,
        deliveryDayOfWeek: 1
      },
      pricingDate: '2026-02-07'
    },
    {
      productName: 'EXPRESS EASY',
      productCode: '8',
      localProductCode: '8',
      localProductCountryCode: 'US',
      networkTypeCode: 'TD',
      isCustomerAgreement: true,
      weight: {
        volumetric: 4.3,
        provided: 5,
        unitOfMeasurement: 'imperial'
      },
      totalPrice: [
        {
          currencyType: 'BILLC',
          priceCurrency: 'USD',
          price: 306.73
        },
        {
          currencyType: 'PULCL',
          priceCurrency: 'USD',
          price: 306.73
        }
      ],
      totalPriceBreakdown: [
        {
          currencyType: 'BILLC',
          priceCurrency: 'USD',
          priceBreakdown: [
            {
              typeCode: 'SPRQT',
              price: 306.73
            }
          ]
        }
      ],
      detailedPriceBreakdown: [
        {
          currencyType: 'BILLC',
          priceCurrency: 'USD',
          breakdown: [
            {
              name: 'EXPRESS EASY',
              price: 306.73
            }
          ]
        }
      ],
      pickupCapabilities: {
        nextBusinessDay: false,
        localCutoffDateAndTime: '2026-02-10T19:00:00',
        originServiceAreaCode: 'ORD',
        pickupAdditionalDays: 0,
        pickupDayOfWeek: 2
      },
      deliveryCapabilities: {
        deliveryTypeCode: 'QDDF',
        estimatedDeliveryDateAndTime: '2026-02-13T23:59:00',
        totalTransitDays: 3,
        deliveryDayOfWeek: 5
      },
      pricingDate: '2026-02-07'
    }
  ],
  exchangeRates: [
    {
      currentExchangeRate: 0.838715,
      currency: 'USD',
      baseCurrency: 'EUR'
    }
  ]
};

const RATE_EMPTY = {
  products: [],
  exchangeRates: []
};

const RATE_ERROR = {
  status: 400,
  title: 'Bad Request',
  detail: 'Invalid request parameters',
  instance: '/rates',
  additionalDetails: []
};

module.exports = {
  // Authentication
  AUTH_SUCCESS,
  AUTH_FAILURE,

  // Rates
  RATE_SUCCESS_DOMESTIC,
  RATE_SUCCESS_INTERNATIONAL,
  RATE_EMPTY,
  RATE_ERROR,
};
