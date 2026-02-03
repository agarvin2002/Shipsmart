/**
 * Redis Mock for Testing
 * Provides in-memory Redis-like functionality without requiring a Redis server
 */
class RedisMock {
  constructor() {
    this.store = new Map();
    this.expiryTimers = new Map();
  }

  /**
   * Get a value from the mock store
   * @param {string} key - The key to retrieve
   * @returns {Promise<string|null>} The value or null if not found
   */
  async get(key) {
    return this.store.get(key) || null;
  }

  /**
   * Set a value in the mock store
   * @param {string} key - The key to set
   * @param {string} value - The value to store
   * @returns {Promise<string>} 'OK'
   */
  async set(key, value) {
    // Clear any existing expiry timer
    if (this.expiryTimers.has(key)) {
      clearTimeout(this.expiryTimers.get(key));
      this.expiryTimers.delete(key);
    }

    this.store.set(key, value);
    return 'OK';
  }

  /**
   * Set a value with expiry (TTL)
   * @param {string} key - The key to set
   * @param {string} value - The value to store
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<string>} 'OK'
   */
  async setWithExpiry(key, value, ttl) {
    this.store.set(key, value);

    // Clear any existing timer
    if (this.expiryTimers.has(key)) {
      clearTimeout(this.expiryTimers.get(key));
    }

    // Set expiry timer
    const timer = setTimeout(() => {
      this.store.delete(key);
      this.expiryTimers.delete(key);
    }, ttl * 1000);

    this.expiryTimers.set(key, timer);
    return 'OK';
  }

  /**
   * Set expiry on existing key
   * @param {string} key - The key
   * @param {number} seconds - Seconds until expiry
   * @returns {Promise<number>} 1 if successful, 0 if key doesn't exist
   */
  async expire(key, seconds) {
    if (!this.store.has(key)) {
      return 0;
    }

    // Clear existing timer
    if (this.expiryTimers.has(key)) {
      clearTimeout(this.expiryTimers.get(key));
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.store.delete(key);
      this.expiryTimers.delete(key);
    }, seconds * 1000);

    this.expiryTimers.set(key, timer);
    return 1;
  }

  /**
   * Delete a key from the store
   * @param {string} key - The key to delete
   * @returns {Promise<number>} Number of keys deleted (0 or 1)
   */
  async del(key) {
    const existed = this.store.has(key);

    if (this.expiryTimers.has(key)) {
      clearTimeout(this.expiryTimers.get(key));
      this.expiryTimers.delete(key);
    }

    this.store.delete(key);
    return existed ? 1 : 0;
  }

  /**
   * Check if a key exists
   * @param {string} key - The key to check
   * @returns {Promise<number>} 1 if exists, 0 if not
   */
  async exists(key) {
    return this.store.has(key) ? 1 : 0;
  }

  /**
   * Get all keys matching a pattern (simplified - only supports * wildcard at end)
   * @param {string} pattern - Pattern to match (e.g., 'user:*')
   * @returns {Promise<Array<string>>} Array of matching keys
   */
  async keys(pattern) {
    const keys = Array.from(this.store.keys());

    if (pattern === '*') {
      return keys;
    }

    // Simple pattern matching (only supports * at end)
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return keys.filter(key => key.startsWith(prefix));
    }

    return keys.filter(key => key === pattern);
  }

  /**
   * Delete all keys from the store
   * @returns {Promise<string>} 'OK'
   */
  async flushall() {
    // Clear all timers
    for (const timer of this.expiryTimers.values()) {
      clearTimeout(timer);
    }

    this.store.clear();
    this.expiryTimers.clear();
    return 'OK';
  }

  /**
   * Get the number of keys in the store
   * @returns {Promise<number>} Number of keys
   */
  async dbsize() {
    return this.store.size;
  }

  /**
   * Get time to live for a key
   * @param {string} key - The key
   * @returns {Promise<number>} TTL in seconds, -1 if no expiry, -2 if doesn't exist
   */
  async ttl(key) {
    if (!this.store.has(key)) {
      return -2;
    }

    if (!this.expiryTimers.has(key)) {
      return -1; // No expiry set
    }

    // This is a simplified implementation
    // In real Redis, we'd track the actual expiry time
    return 300; // Return default 5 min for mock
  }
}

// Export singleton instance
module.exports = new RedisMock();
