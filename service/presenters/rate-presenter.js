const BasePresenter = require('./base-presenter');

class RatePresenter extends BasePresenter {
  /**
   * Present a single rate
   * @param {Object} rate - Rate object
   * @returns {Object} Formatted rate
   */
  static present(rate) {
    if (!rate) return null;

    const data = this.sanitize(rate);

    return {
      id: data.id,
      carrier: data.carrier,
      service: {
        name: data.service_name,
        code: data.service_code,
      },
      price: {
        amount: parseFloat(data.rate_amount),
        currency: data.currency || 'USD',
      },
      delivery: {
        days: data.delivery_days,
        estimated_date: this.formatTimestamp(data.estimated_delivery_date),
      },
      fetched_at: this.formatTimestamp(data.fetched_at),
    };
  }

  /**
   * Present rate comparison with analysis
   * @param {Object} rateComparison - Rate comparison object from orchestrator
   * @returns {Object} Formatted comparison
   */
  static presentComparison(rateComparison) {
    const { total_carriers, total_rates, cheapest, fastest, all_rates, potential_savings, cached } = rateComparison;

    return {
      summary: {
        total_carriers,
        total_rates,
        potential_savings: parseFloat(potential_savings?.toFixed(2) || 0),
        cached: cached || false,
      },
      recommended: {
        cheapest: cheapest ? this.present(cheapest) : null,
        fastest: fastest ? this.present(fastest) : null,
      },
      all_rates: all_rates.map(rate => this.present(rate)),
    };
  }

  /**
   * Present minimal rate info (for lists)
   * @param {Object} rate - Rate object
   * @returns {Object} Minimal rate info
   */
  static presentMinimal(rate) {
    if (!rate) return null;

    return {
      carrier: rate.carrier,
      service: rate.service_name,
      price: parseFloat(rate.rate_amount),
      delivery_days: rate.delivery_days,
    };
  }

  /**
   * Present rate history
   * @param {Array} historyRecords - Array of rate history records
   * @returns {Array} Formatted history
   */
  static presentHistory(historyRecords) {
    return historyRecords.map(record => ({
      carrier: record.carrier,
      service: record.service_name,
      rate: parseFloat(record.rate_amount),
      currency: record.currency,
      route: {
        origin: record.origin_zip,
        destination: record.destination_zip,
      },
      weight: parseFloat(record.package_weight),
      fetched_at: this.formatTimestamp(record.fetched_at),
    }));
  }
}

module.exports = RatePresenter;
