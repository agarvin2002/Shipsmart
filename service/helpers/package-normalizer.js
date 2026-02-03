/**
 * PackageNormalizer - Utility class for normalizing package dimension formats
 *
 * Handles conversion between flat and nested dimension formats:
 * - Flat format: { length: 10, width: 5, height: 3 }
 * - Nested format: { dimensions: { length: 10, width: 5, height: 3 } }
 */
class PackageNormalizer {
  /**
   * Normalizes an array of packages to support both flat and nested dimension formats
   * @param {Array} packages - Array of package objects
   * @returns {Array} Normalized package array
   */
  static normalize(packages) {
    if (!packages || !Array.isArray(packages)) {
      return [];
    }

    return packages.map(pkg => this.normalizePackage(pkg));
  }

  /**
   * Normalizes a single package object
   * @param {Object} pkg - Package object
   * @returns {Object} Normalized package object
   */
  static normalizePackage(pkg) {
    if (!pkg) {
      return pkg;
    }

    // Create a copy to avoid mutating the original
    const normalized = { ...pkg };

    if (pkg.length && pkg.width && pkg.height && !pkg.dimensions) {
      // Flat format: move dimensions into nested object
      normalized.dimensions = {
        length: pkg.length,
        width: pkg.width,
        height: pkg.height,
      };
    } else if (pkg.dimensions && !pkg.length) {
      // Nested format: flatten dimensions
      normalized.length = pkg.dimensions.length;
      normalized.width = pkg.dimensions.width;
      normalized.height = pkg.dimensions.height;
    }

    return normalized;
  }

  /**
   * Converts a single package or array to normalized array
   * @param {Object|Array} packageData - Single package object or array of packages
   * @returns {Array} Normalized package array
   */
  static toArray(packageData) {
    if (!packageData) {
      return [];
    }

    if (Array.isArray(packageData)) {
      return this.normalize(packageData);
    }

    return this.normalize([packageData]);
  }
}

module.exports = PackageNormalizer;
