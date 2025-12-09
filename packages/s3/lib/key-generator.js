const { v4: uuidv4 } = require('uuid');

/**
 * S3 Key Generator
 *
 * Utilities for generating S3 keys with consistent patterns
 * Based on doc-gen-service-berlin_base_branch architecture
 */

class S3KeyGenerator {
  /**
   * Generate unique S3 key with UUID
   * @param {String} originalFilename - Original file name with extension
   * @param {String} folder - S3 folder/prefix (default: 'uploads')
   * @returns {String} S3 key (e.g., "uploads/abc123.pdf")
   */
  static generateUniqueKey(originalFilename, folder = 'uploads') {
    const fileExtension = originalFilename.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    return `${folder}/${uniqueFileName}`;
  }

  /**
   * Generate S3 key with timestamp
   * @param {String} originalFilename - Original file name
   * @param {String} folder - S3 folder/prefix
   * @returns {String} S3 key with timestamp
   */
  static generateTimestampKey(originalFilename, folder = 'uploads') {
    const timestamp = Date.now();
    const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${folder}/${timestamp}_${sanitizedFilename}`;
  }

  /**
   * Generate S3 key for user-specific uploads
   * @param {String} userId - User ID
   * @param {String} originalFilename - Original file name
   * @param {String} folder - Base folder
   * @returns {String} S3 key (e.g., "uploads/user_123/abc.pdf")
   */
  static generateUserKey(userId, originalFilename, folder = 'uploads') {
    const fileExtension = originalFilename.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    return `${folder}/user_${userId}/${uniqueFileName}`;
  }

  /**
   * Generate S3 key with date-based partitioning
   * @param {String} originalFilename - Original file name
   * @param {String} folder - Base folder
   * @returns {String} S3 key (e.g., "uploads/2025/12/07/abc.pdf")
   */
  static generateDatePartitionedKey(originalFilename, folder = 'uploads') {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const fileExtension = originalFilename.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;

    return `${folder}/${year}/${month}/${day}/${uniqueFileName}`;
  }

  /**
   * Extract file extension from filename
   * @param {String} filename - File name
   * @returns {String} File extension (lowercase)
   */
  static getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  /**
   * Sanitize filename for S3
   * @param {String} filename - Original filename
   * @returns {String} Sanitized filename
   */
  static sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  }
}

module.exports = S3KeyGenerator;
