/* global logger */
const CarrierRouter = require('../../lib/carrier-router');
const { RedisWrapper } = require('@shipsmart/redis');
const AddressRepository = require('../../repositories/address-repository');
const PackageNormalizer = require('../../helpers/package-normalizer');
const { Rate, RateHistory } = require('../../models');
const cls = require('cls-hooked');

// Get the existing CLS namespace
const namespace = cls.getNamespace('shipsmart_sequel_trans');

class CarrierRateOrchestrator {
  constructor() {
    this.cacheKeyPrefix = 'RATE';
    this.defaultCacheTTL = 300; // 5 minutes
    this.addressRepository = new AddressRepository();
  }

  
  async getRatesForShipment(userId, shipmentData, options = {}) {
    try {
      logger.info('[CarrierRateOrchestrator] Getting rates for shipment', { userId });

      // CRITICAL: Set userId and shipmentId in CLS context for carrier logging
      if (namespace) {
        namespace.set('userId', userId);

        // Extract shipment_id from shipmentData if available
        const shipmentId = shipmentData?.shipment_id || shipmentData?.id;
        if (shipmentId) {
          namespace.set('shipmentId', shipmentId);
          logger.debug('[CarrierRateOrchestrator] Set shipmentId in CLS context', { shipmentId });
        }
      }

      // 1. Build cache key
      const cacheKey = this.buildCacheKey(shipmentData);

      // 2. Check cache first (unless force refresh)
      if (!options.forceRefresh) {
        const cachedRates = await this.getCachedRates(cacheKey);
        if (cachedRates) {
          logger.info('[CarrierRateOrchestrator] Returning cached rates', { cacheKey });
          return { ...cachedRates, cached: true };
        }
      }

      // 3. Enrich shipment data with full address details
      const enrichedData = await this.enrichShipmentData(userId, shipmentData);

      // 4. Get available carriers for this user
      const carriers = await CarrierRouter.getAvailableCarriers(userId, enrichedData);

      if (carriers.length === 0) {
        throw new Error('No active carriers found. Please add and validate carrier credentials.');
      }

      // 5. Fetch rates from all carriers in parallel
      const rates = await this.fetchRatesFromCarriers(carriers, enrichedData);

      // 6. Sort and analyze rates
      const rateComparison = this.analyzeRates(rates, enrichedData);

      // 7. Cache the results
      await this.cacheRates(cacheKey, rateComparison);

      // 8. Save to rate history (async - don't wait)
      this.saveRateHistory(userId, rates, enrichedData).catch(err => {
        logger.error('[CarrierRateOrchestrator] Failed to save rate history', { error: err.message });
      });

      logger.info('[CarrierRateOrchestrator] Successfully fetched rates', {
        userId,
        totalCarriers: carriers.length,
        successfulRates: rates.length,
      });

      return { ...rateComparison, cached: false };
    } catch (error) {
      logger.error('[CarrierRateOrchestrator] Failed to get rates', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  
  async fetchRatesFromCarriers(carriers, shipmentData) {
    logger.info('[CarrierRateOrchestrator] Fetching rates from carriers', {
      carrierCount: carriers.length,
      carriers: carriers.map(c => c.carrier),
    });

    // Fetch rates in parallel using Promise.allSettled (graceful failure)
    const ratePromises = carriers.map(carrier =>
      CarrierRouter.routeRateRequest(carrier.carrier, carrier, shipmentData)
    );

    const results = await Promise.allSettled(ratePromises);

    // Process results
    const rates = [];
    const errors = [];

    results.forEach((result, index) => {
      const carrier = carriers[index].carrier;

      if (result.status === 'fulfilled') {
        rates.push(...result.value);
        logger.info('[CarrierRateOrchestrator] Carrier success', {
          carrier,
          rateCount: result.value.length,
        });
      } else {
        errors.push({ carrier, error: result.reason.message });
        logger.warn('[CarrierRateOrchestrator] Carrier failed', {
          carrier,
          error: result.reason.message,
        });
      }
    });

    if (rates.length === 0) {
      throw new Error(`Failed to fetch rates from all carriers. Errors: ${JSON.stringify(errors)}`);
    }

    return rates;
  }

  
  analyzeRates(rates, shipmentData = {}) {
    if (rates.length === 0) {
      return {
        total_carriers: 0,
        cheapest: null,
        fastest: null,
        all_rates: [],
        potential_savings: 0,
      };
    }

    // Check if international shipment
    const isInternational = this.isInternationalShipment(shipmentData.origin, shipmentData.destination);

    // Sort by price (cheapest first)
    const sortedByPrice = [...rates].sort((a, b) => a.rate_amount - b.rate_amount);

    // Sort by delivery time (fastest first) - only for domestic shipments
    const sortedBySpeed = [...rates]
      .filter(r => r.delivery_days !== null)
      .sort((a, b) => a.delivery_days - b.delivery_days);

    const cheapest = sortedByPrice[0];
    const fastest = isInternational ? null : (sortedBySpeed[0] || null);
    const mostExpensive = sortedByPrice[sortedByPrice.length - 1];

    return {
      total_carriers: new Set(rates.map(r => r.carrier)).size,
      total_rates: rates.length,
      cheapest,
      fastest,
      all_rates: sortedByPrice,
      potential_savings: mostExpensive.rate_amount - cheapest.rate_amount,
    };
  }


  isInternationalShipment(origin, destination) {
    if (!origin || !destination) return false;
    const originCountry = origin.country || 'US';
    const destinationCountry = destination.country || 'US';
    return originCountry !== destinationCountry;
  }


  async enrichShipmentData(userId, shipmentData) {
    try {
      const { origin_address_id, destination_address_id, package: pkg, packages } = shipmentData;

      // Fetch full address details if only IDs provided - CRITICAL: Validate user ownership
      if (origin_address_id && !shipmentData.origin) {
        const origin = await this.addressRepository.findById(origin_address_id, userId);
        if (!origin) {
          throw new Error(`Origin address not found: ${origin_address_id}`);
        }
        shipmentData.origin = origin.dataValues;
      }

      if (destination_address_id && !shipmentData.destination) {
        const destination = await this.addressRepository.findById(destination_address_id, userId);
        if (!destination) {
          throw new Error(`Destination address not found: ${destination_address_id}`);
        }
        shipmentData.destination = destination.dataValues;
      }

      // Normalize package dimensions - support both single package and multiple packages
      const packageList = packages || (pkg ? [pkg] : []);
      const normalizedPackages = PackageNormalizer.normalize(packageList);

      // Update shipmentData with normalized packages
      if (packages) {
        shipmentData.packages = normalizedPackages;
      } else if (pkg) {
        shipmentData.package = normalizedPackages[0];
      }

      return shipmentData;
    } catch (error) {
      logger.error('[CarrierRateOrchestrator] Failed to enrich shipment data', {
        error: error.message,
      });
      throw error;
    }
  }

  
  buildCacheKey(shipmentData) {
    const { origin_address_id, destination_address_id, origin, destination, package: pkg, packages, service_type } = shipmentData;

    // Use address IDs if available, otherwise use postal codes
    const originKey = origin_address_id || origin?.postal_code || 'unknown';
    const destKey = destination_address_id || destination?.postal_code || 'unknown';

    // Calculate total weight for cache key (support both single and multi-package)
    const packageList = packages || (pkg ? [pkg] : []);
    const totalWeight = packageList.reduce((sum, p) => sum + (p?.weight || 0), 0);

    const key = `${this.cacheKeyPrefix}:${originKey}:${destKey}:${totalWeight}:${packageList.length}:${service_type || 'ground'}`;
    return key;
  }

  
  async getCachedRates(cacheKey) {
    try {
      const cached = await RedisWrapper.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      logger.error('[CarrierRateOrchestrator] Failed to get cached rates', {
        error: error.message,
        cacheKey,
      });
      return null;
    }
  }

  
  async cacheRates(cacheKey, rateComparison) {
    try {
      await RedisWrapper.setWithExpiry(
        cacheKey,
        JSON.stringify(rateComparison),
        this.defaultCacheTTL
      );
      logger.info('[CarrierRateOrchestrator] Cached rates', { cacheKey, ttl: this.defaultCacheTTL });
    } catch (error) {
      logger.error('[CarrierRateOrchestrator] Failed to cache rates', {
        error: error.message,
        cacheKey,
      });
    }
  }

  
  async saveRateHistory(userId, rates, shipmentData) {
    try {
      const { origin, destination, package: pkg, packages, service_type } = shipmentData;

      // Calculate total weight for history (support both single and multi-package)
      const packageList = packages || (pkg ? [pkg] : []);
      const totalWeight = packageList.reduce((sum, p) => sum + (p?.weight || 0), 0);

      const historyRecords = rates.map(rate => ({
        user_id: userId,
        carrier: rate.carrier,
        service_name: rate.service_name,
        rate_amount: rate.rate_amount,
        currency: rate.currency,
        package_weight: totalWeight,
        origin_zip: origin.postal_code,
        destination_zip: destination.postal_code,
        origin_country: origin.country || 'US',
        destination_country: destination.country || 'US',
        service_type: service_type || 'ground',
        fetched_at: new Date(),
      }));

      await RateHistory.bulkCreate(historyRecords);

      logger.info('[CarrierRateOrchestrator] Saved rate history', {
        userId,
        recordCount: historyRecords.length,
      });
    } catch (error) {
      logger.error('[CarrierRateOrchestrator] Failed to save rate history', {
        error: error.message,
      });
      // Don't throw - this is async background operation
    }
  }

  
  async invalidateCache(shipmentData) {
    try {
      const cacheKey = this.buildCacheKey(shipmentData);
      await RedisWrapper.del(cacheKey);
      logger.info('[CarrierRateOrchestrator] Invalidated cache', { cacheKey });
    } catch (error) {
      logger.error('[CarrierRateOrchestrator] Failed to invalidate cache', {
        error: error.message,
      });
    }
  }
}

module.exports = CarrierRateOrchestrator;
