const crypto = require('crypto');
const config = require('@shipsmart/env');

class CryptoHelper {
  static getEncryptionKey() {
    const key = config.get('encryption:key');
    if (!key || key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 characters for AES-256');
    }
    return key;
  }

  static encrypt(text) {
    if (!text) return text;

    const algorithm = 'aes-256-cbc';
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  static decrypt(encryptedText) {
    if (!encryptedText) return encryptedText;

    const algorithm = 'aes-256-cbc';
    const key = this.getEncryptionKey();

    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

module.exports = CryptoHelper;
