const CryptoHelper = require('../../../helpers/crypto-helper');

// Mock the config module
jest.mock('@shipsmart/env', () => ({
  get: jest.fn((key) => {
    if (key === 'encryption:key') {
      return process.env.ENCRYPTION_KEY;
    }
    return null;
  })
}));

const config = require('@shipsmart/env');

describe('CryptoHelper', () => {
  // Store original encryption key
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    // Ensure encryption key is set for tests
    process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
    // Reset mock to use the default implementation
    config.get.mockImplementation((key) => {
      if (key === 'encryption:key') {
        return process.env.ENCRYPTION_KEY;
      }
      return null;
    });
  });

  afterAll(() => {
    // Restore original key
    process.env.ENCRYPTION_KEY = originalKey;
  });

  describe('#encrypt', () => {
    it('should encrypt plaintext to ciphertext', () => {
      // Arrange
      const plaintext = 'my-secret-api-key';

      // Act
      const encrypted = CryptoHelper.encrypt(plaintext);

      // Assert
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(':'); // IV:encrypted format
      expect(encrypted.split(':').length).toBe(2);
    });

    it('should produce different ciphertext for same plaintext (due to unique IV)', () => {
      // Arrange
      const plaintext = 'my-secret-api-key';

      // Act
      const encrypted1 = CryptoHelper.encrypt(plaintext);
      const encrypted2 = CryptoHelper.encrypt(plaintext);

      // Assert - Different IVs should produce different ciphertexts
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should return null for null input', () => {
      // Act
      const result = CryptoHelper.encrypt(null);

      // Assert
      expect(result).toBeNull();
    });

    it('should return undefined for undefined input', () => {
      // Act
      const result = CryptoHelper.encrypt(undefined);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return empty string for empty string input', () => {
      // Act
      const result = CryptoHelper.encrypt('');

      // Assert
      expect(result).toBe('');
    });

    it('should encrypt long strings', () => {
      // Arrange
      const plaintext = 'a'.repeat(1000);

      // Act
      const encrypted = CryptoHelper.encrypt(plaintext);

      // Assert
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(':');
    });

    it('should encrypt special characters', () => {
      // Arrange
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';

      // Act
      const encrypted = CryptoHelper.encrypt(plaintext);

      // Assert
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(':');
    });

    it('should encrypt JSON strings', () => {
      // Arrange
      const plaintext = JSON.stringify({
        clientId: '12345',
        clientSecret: 'secret',
        nested: { key: 'value' }
      });

      // Act
      const encrypted = CryptoHelper.encrypt(plaintext);

      // Assert
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(':');
    });

    it('should throw error if encryption key is missing', () => {
      // Arrange
      delete process.env.ENCRYPTION_KEY;

      // Act & Assert
      expect(() => CryptoHelper.encrypt('test')).toThrow('ENCRYPTION_KEY must be 32 characters for AES-256');

      // Restore key
      process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
    });

    it('should throw error if encryption key is wrong length', () => {
      // Arrange
      process.env.ENCRYPTION_KEY = 'too-short';

      // Act & Assert
      expect(() => CryptoHelper.encrypt('test')).toThrow('ENCRYPTION_KEY must be 32 characters for AES-256');

      // Restore key
      process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
    });
  });

  describe('#decrypt', () => {
    it('should decrypt ciphertext to original plaintext', () => {
      // Arrange
      const plaintext = 'my-secret-api-key';
      const encrypted = CryptoHelper.encrypt(plaintext);

      // Act
      const decrypted = CryptoHelper.decrypt(encrypted);

      // Assert
      expect(decrypted).toBe(plaintext);
    });

    it('should return null for null input', () => {
      // Act
      const result = CryptoHelper.decrypt(null);

      // Assert
      expect(result).toBeNull();
    });

    it('should return undefined for undefined input', () => {
      // Act
      const result = CryptoHelper.decrypt(undefined);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return empty string for empty string input', () => {
      // Act
      const result = CryptoHelper.decrypt('');

      // Assert
      expect(result).toBe('');
    });

    it('should handle malformed encrypted data gracefully', () => {
      // Arrange
      const malformed = 'invalid-format-no-colon';

      // Act & Assert
      expect(() => CryptoHelper.decrypt(malformed)).toThrow();
    });

    it('should handle encrypted data with invalid IV', () => {
      // Arrange
      const malformed = 'invalid-iv:encrypteddata';

      // Act & Assert
      expect(() => CryptoHelper.decrypt(malformed)).toThrow();
    });

    it('should throw error if encryption key is missing', () => {
      // Arrange
      const plaintext = 'test';
      const encrypted = CryptoHelper.encrypt(plaintext);
      delete process.env.ENCRYPTION_KEY;

      // Act & Assert
      expect(() => CryptoHelper.decrypt(encrypted)).toThrow('ENCRYPTION_KEY must be 32 characters for AES-256');

      // Restore key
      process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
    });

    it('should fail to decrypt with wrong encryption key', () => {
      // Arrange
      const plaintext = 'my-secret-api-key';
      const encrypted = CryptoHelper.encrypt(plaintext);

      // Change encryption key
      process.env.ENCRYPTION_KEY = 'different-key-0123456789012345';

      // Act & Assert
      expect(() => CryptoHelper.decrypt(encrypted)).toThrow();

      // Restore key
      process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
    });
  });

  describe('roundtrip encryption/decryption', () => {
    it('should encrypt and decrypt simple strings', () => {
      // Arrange
      const plaintext = 'hello world';

      // Act
      const encrypted = CryptoHelper.encrypt(plaintext);
      const decrypted = CryptoHelper.decrypt(encrypted);

      // Assert
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt long strings', () => {
      // Arrange
      const plaintext = 'Lorem ipsum dolor sit amet, '.repeat(50);

      // Act
      const encrypted = CryptoHelper.encrypt(plaintext);
      const decrypted = CryptoHelper.decrypt(encrypted);

      // Assert
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt special characters', () => {
      // Arrange
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`\'"\\';

      // Act
      const encrypted = CryptoHelper.encrypt(plaintext);
      const decrypted = CryptoHelper.decrypt(encrypted);

      // Assert
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt Unicode characters', () => {
      // Arrange
      const plaintext = 'Hello 世界 🌍 Привет';

      // Act
      const encrypted = CryptoHelper.encrypt(plaintext);
      const decrypted = CryptoHelper.decrypt(encrypted);

      // Assert
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt JSON strings', () => {
      // Arrange
      const data = {
        clientId: '12345',
        clientSecret: 'super-secret-key',
        accountNumbers: ['123456789', '987654321'],
        nested: {
          deep: {
            value: 'test'
          }
        }
      };
      const plaintext = JSON.stringify(data);

      // Act
      const encrypted = CryptoHelper.encrypt(plaintext);
      const decrypted = CryptoHelper.decrypt(encrypted);

      // Assert
      expect(decrypted).toBe(plaintext);
      expect(JSON.parse(decrypted)).toEqual(data);
    });

    it('should encrypt and decrypt carrier credentials', () => {
      // Arrange - Simulate real carrier credentials
      const fedexClientId = 'l7abc123def456ghi789jkl012mno345';
      const fedexClientSecret = 'ABCDefgh1234567890';

      // Act
      const encryptedId = CryptoHelper.encrypt(fedexClientId);
      const encryptedSecret = CryptoHelper.encrypt(fedexClientSecret);

      const decryptedId = CryptoHelper.decrypt(encryptedId);
      const decryptedSecret = CryptoHelper.decrypt(encryptedSecret);

      // Assert
      expect(decryptedId).toBe(fedexClientId);
      expect(decryptedSecret).toBe(fedexClientSecret);
      expect(encryptedId).not.toContain(fedexClientId);
      expect(encryptedSecret).not.toContain(fedexClientSecret);
    });
  });

  describe('getEncryptionKey', () => {
    it('should return encryption key from environment', () => {
      // Arrange
      process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';

      // Act
      const key = CryptoHelper.getEncryptionKey();

      // Assert
      expect(key).toBe('12345678901234567890123456789012');
      expect(key.length).toBe(32);
    });

    it('should throw error if key is not 32 characters', () => {
      // Arrange
      process.env.ENCRYPTION_KEY = 'too-short';

      // Act & Assert
      expect(() => CryptoHelper.getEncryptionKey()).toThrow('ENCRYPTION_KEY must be 32 characters for AES-256');

      // Restore key
      process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
    });

    it('should throw error if key is missing', () => {
      // Arrange
      delete process.env.ENCRYPTION_KEY;

      // Act & Assert
      expect(() => CryptoHelper.getEncryptionKey()).toThrow('ENCRYPTION_KEY must be 32 characters for AES-256');

      // Restore key
      process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
    });
  });

  describe('security properties', () => {
    it('should use AES-256-CBC algorithm (verified by key length requirement)', () => {
      // AES-256 requires 32-byte (256-bit) key
      expect(() => {
        process.env.ENCRYPTION_KEY = '1234567890123456'; // 16 bytes (AES-128)
        CryptoHelper.encrypt('test');
      }).toThrow('ENCRYPTION_KEY must be 32 characters for AES-256');

      // Restore key
      process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
    });

    it('should use unique IV for each encryption (different ciphertexts)', () => {
      // Arrange
      const plaintext = 'test-data';

      // Act
      const encrypted1 = CryptoHelper.encrypt(plaintext);
      const encrypted2 = CryptoHelper.encrypt(plaintext);
      const encrypted3 = CryptoHelper.encrypt(plaintext);

      // Assert - All should be different due to unique IVs
      expect(encrypted1).not.toBe(encrypted2);
      expect(encrypted2).not.toBe(encrypted3);
      expect(encrypted1).not.toBe(encrypted3);

      // But all should decrypt to same plaintext
      expect(CryptoHelper.decrypt(encrypted1)).toBe(plaintext);
      expect(CryptoHelper.decrypt(encrypted2)).toBe(plaintext);
      expect(CryptoHelper.decrypt(encrypted3)).toBe(plaintext);
    });

    it('should produce ciphertext that does not contain plaintext', () => {
      // Arrange
      const plaintext = 'my-secret-api-key';

      // Act
      const encrypted = CryptoHelper.encrypt(plaintext);

      // Assert
      expect(encrypted).not.toContain(plaintext);
      expect(encrypted.toLowerCase()).not.toContain(plaintext.toLowerCase());
    });
  });
});
