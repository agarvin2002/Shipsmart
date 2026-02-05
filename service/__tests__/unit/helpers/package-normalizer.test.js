/**
 * PackageNormalizer Unit Tests
 */

const PackageNormalizer = require('../../../helpers/package-normalizer');

describe('PackageNormalizer', () => {
  describe('.normalize', () => {
    it('should normalize array of packages', () => {
      const packages = [
        { weight: 5, length: 10, width: 5, height: 3 },
        { weight: 10, dimensions: { length: 20, width: 10, height: 5 } },
      ];

      const result = PackageNormalizer.normalize(packages);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('dimensions');
      expect(result[0].dimensions).toEqual({ length: 10, width: 5, height: 3 });
      expect(result[1]).toHaveProperty('length', 20);
      expect(result[1]).toHaveProperty('width', 10);
    });

    it('should return empty array for null input', () => {
      expect(PackageNormalizer.normalize(null)).toEqual([]);
    });

    it('should return empty array for non-array input', () => {
      expect(PackageNormalizer.normalize('not an array')).toEqual([]);
    });
  });

  describe('.normalizePackage', () => {
    it('should convert flat format to nested format', () => {
      const pkg = {
        weight: 5,
        length: 10,
        width: 5,
        height: 3,
      };

      const result = PackageNormalizer.normalizePackage(pkg);

      expect(result.dimensions).toEqual({
        length: 10,
        width: 5,
        height: 3,
      });
      expect(result.weight).toBe(5);
    });

    it('should convert nested format to flat format', () => {
      const pkg = {
        weight: 10,
        dimensions: {
          length: 20,
          width: 10,
          height: 5,
        },
      };

      const result = PackageNormalizer.normalizePackage(pkg);

      expect(result.length).toBe(20);
      expect(result.width).toBe(10);
      expect(result.height).toBe(5);
      expect(result.weight).toBe(10);
    });

    it('should not mutate original package object', () => {
      const pkg = {
        weight: 5,
        length: 10,
        width: 5,
        height: 3,
      };

      const result = PackageNormalizer.normalizePackage(pkg);

      expect(result).not.toBe(pkg);
      expect(pkg.dimensions).toBeUndefined();
    });

    it('should handle package that already has both formats', () => {
      const pkg = {
        weight: 5,
        length: 10,
        width: 5,
        height: 3,
        dimensions: { length: 10, width: 5, height: 3 },
      };

      const result = PackageNormalizer.normalizePackage(pkg);

      expect(result.length).toBe(10);
      expect(result.dimensions).toBeDefined();
    });

    it('should return null for null input', () => {
      expect(PackageNormalizer.normalizePackage(null)).toBeNull();
    });
  });

  describe('.toArray', () => {
    it('should convert single package to normalized array', () => {
      const pkg = {
        weight: 5,
        length: 10,
        width: 5,
        height: 3,
      };

      const result = PackageNormalizer.toArray(pkg);

      expect(result).toHaveLength(1);
      expect(result[0].dimensions).toEqual({ length: 10, width: 5, height: 3 });
    });

    it('should normalize array of packages', () => {
      const packages = [
        { weight: 5, length: 10, width: 5, height: 3 },
        { weight: 10, dimensions: { length: 20, width: 10, height: 5 } },
      ];

      const result = PackageNormalizer.toArray(packages);

      expect(result).toHaveLength(2);
    });

    it('should return empty array for null input', () => {
      expect(PackageNormalizer.toArray(null)).toEqual([]);
    });
  });
});
