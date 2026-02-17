/* global logger */
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command, CreateBucketCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('@shipsmart/env');
const { S3Error } = require('@shipsmart/errors');

/**
 * S3Wrapper - Singleton AWS S3 client wrapper
 *
 * Provides promisified S3 operations with consistent error handling
 *
 * Note: Uses global.logger which is wrapped by logger-initializer
 * to automatically inject request IDs from CLS namespace
 *
 * Migrated to AWS SDK v3 for better async/await and CLS context support
 */
class S3Wrapper {
  constructor() {
    this.initialize();
  }

  /**
   * Initialize S3 client with configuration
   */
  initialize() {
    try {
      const awsConfig = config.get('aws');

      const clientConfig = {
        region: awsConfig.region,
        credentials: {
          accessKeyId: awsConfig.access_key,
          secretAccessKey: awsConfig.secret_access_key,
        },
        forcePathStyle: true,
      };

      // Add custom endpoint if specified (for local development with LocalStack)
      if (awsConfig.s3 && awsConfig.s3.endpoint) {
        clientConfig.endpoint = awsConfig.s3.endpoint;
      }

      this.S3Client = new S3Client(clientConfig);

      // Generate bucket name: {prefix}-{environment}
      this.S3BucketName = `${awsConfig.s3.bucket_prefix}-${config.get('environment')}`;

      logger.info(`[s3] S3 client initialized for bucket: ${this.S3BucketName}`);

      // Ensure bucket exists (async, don't block initialization)
      this.ensureBucketExists().catch((error) => {
        logger.error(`[s3] Failed to ensure bucket exists: ${error.message}`);
      });
    } catch (error) {
      logger.error(`[s3] Failed to initialize S3 client: ${error.message}`, { stack: error.stack });
      throw new S3Error('Failed to initialize S3 client');
    }
  }

  /**
   * Ensure S3 bucket exists, create if it doesn't
   * @returns {Promise<void>}
   */
  async ensureBucketExists() {
    try {
      // Check if bucket exists
      const headCommand = new HeadBucketCommand({
        Bucket: this.S3BucketName,
      });

      await this.S3Client.send(headCommand);
      logger.info(`[s3] Bucket exists: ${this.S3BucketName}`);
    } catch (error) {
      // If bucket doesn't exist (404), create it
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        try {
          logger.info(`[s3] Bucket does not exist, creating: ${this.S3BucketName}`);

          const createCommand = new CreateBucketCommand({
            Bucket: this.S3BucketName,
          });

          await this.S3Client.send(createCommand);
          logger.info(`[s3] Bucket created successfully: ${this.S3BucketName}`);
        } catch (createError) {
          logger.error(`[s3] Failed to create bucket ${this.S3BucketName}: ${createError.message}`, { stack: createError.stack });
          throw new S3Error(`Failed to create bucket: ${this.S3BucketName}`);
        }
      } else {
        // Other errors (permissions, network, etc.)
        logger.error(`[s3] Error checking bucket ${this.S3BucketName}: ${error.message}`, { stack: error.stack });
        throw new S3Error(`Failed to check bucket: ${this.S3BucketName}`);
      }
    }
  }

  /**
   * Upload file to S3
   * @param {Buffer} body - File buffer
   * @param {String} fileName - S3 key/path
   * @param {Object} options - Additional upload options
   * @returns {Promise<Object>} S3 upload response
   */
  async uploadToAWS(body, fileName, options = {}) {
    try {
      const command = new PutObjectCommand({
        Bucket: this.S3BucketName,
        Key: fileName,
        Body: body,
        ServerSideEncryption: 'AES256',
        ...options,
      });

      const response = await this.S3Client.send(command);
      logger.info(`[s3] File uploaded successfully: ${fileName}`);
      return response;
    } catch (error) {
      logger.error(`[s3] Upload failed for ${fileName}: ${error.message}`, { stack: error.stack });
      throw new S3Error(`Failed to upload file: ${fileName}`);
    }
  }

  /**
   * Get signed URL for S3 object
   * @param {String} bucketName - S3 bucket name
   * @param {String} key - S3 object key
   * @param {Boolean} includeContentDisposition - Add Content-Disposition header for downloads
   * @param {Number} expiry - URL expiry in seconds (default: 172800 = 48 hours)
   * @returns {Promise<String>} Signed URL
   */
  async getPublicUrl(bucketName, key, includeContentDisposition = false, expiry = 172800) {
    try {
      const commandParams = {
        Bucket: bucketName,
        Key: key,
      };

      if (includeContentDisposition) {
        commandParams.ResponseContentDisposition = 'attachment';
      }

      const command = new GetObjectCommand(commandParams);
      const url = await getSignedUrl(this.S3Client, command, { expiresIn: expiry });

      logger.info(`[s3] Generated signed URL for ${key} (expires in ${expiry}s)`);
      return url;
    } catch (error) {
      logger.error(`[s3] Failed to generate signed URL for ${key}: ${error.message}`, { stack: error.stack });
      throw new S3Error(`Failed to generate signed URL: ${key}`);
    }
  }

  /**
   * Download file from S3
   * @param {String} bucketName - S3 bucket name
   * @param {String} key - S3 object key
   * @returns {Promise<Buffer>} File buffer
   */
  async downloadFromAWS(bucketName, key) {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const response = await this.S3Client.send(command);
      logger.info(`[s3] File downloaded successfully: ${key}`);

      // Convert stream to buffer for AWS SDK v3
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      logger.error(`[s3] Download failed for ${key}: ${error.message}`, { stack: error.stack });
      throw new S3Error(`Failed to download file: ${key}`);
    }
  }

  /**
   * Delete file from S3
   * @param {String} bucketName - S3 bucket name
   * @param {String} key - S3 object key
   * @returns {Promise<Object>} Delete response
   */
  async deleteFromAWS(bucketName, key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const response = await this.S3Client.send(command);
      logger.info(`[s3] File deleted successfully: ${key}`);
      return response;
    } catch (error) {
      logger.error(`[s3] Delete failed for ${key}: ${error.message}`, { stack: error.stack });
      throw new S3Error(`Failed to delete file: ${key}`);
    }
  }

  /**
   * Check if object exists in S3
   * @param {String} bucketName - S3 bucket name
   * @param {String} key - S3 object key
   * @returns {Promise<Boolean>} True if exists
   */
  async objectExists(bucketName, key) {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await this.S3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      logger.error(`[s3] Error checking existence of ${key}: ${error.message}`, { stack: error.stack });
      throw new S3Error(`Failed to check object existence: ${key}`);
    }
  }

  /**
   * List objects in S3 bucket with prefix
   * @param {String} bucketName - S3 bucket name
   * @param {String} prefix - Key prefix to filter
   * @returns {Promise<Array>} Array of S3 objects
   */
  async listObjects(bucketName, prefix = '') {
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
      });

      const response = await this.S3Client.send(command);
      logger.info(`[s3] Listed ${response.Contents?.length || 0} objects with prefix: ${prefix}`);
      return response.Contents || [];
    } catch (error) {
      logger.error(`[s3] List objects failed for prefix ${prefix}: ${error.message}`, { stack: error.stack });
      throw new S3Error(`Failed to list objects with prefix: ${prefix}`);
    }
  }

  /**
   * Get S3 bucket name
   * @returns {String} Current bucket name
   */
  getS3BucketName() {
    return this.S3BucketName;
  }

  /**
   * Get S3 client instance (for advanced operations)
   * @returns {Object} S3 client
   */
  getClient() {
    return this.S3Client;
  }
}

// Export singleton instance
const s3Wrapper = new S3Wrapper();
module.exports = s3Wrapper;
