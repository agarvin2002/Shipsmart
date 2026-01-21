# ShipSmart AI API - S3 Configuration Bucket
# Purpose: Store environment-specific configuration files

# S3 bucket for environment configurations
resource "aws_s3_bucket" "config" {
  bucket = "shipsmart-config"

  tags = {
    Name        = "ShipSmart Configuration Bucket"
    Environment = "shared"
    Purpose     = "Application configuration files"
  }
}

# Enable versioning for configuration history
resource "aws_s3_bucket_versioning" "config" {
  bucket = aws_s3_bucket.config.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable encryption at rest
resource "aws_s3_bucket_server_side_encryption_configuration" "config" {
  bucket = aws_s3_bucket.config.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "config" {
  bucket = aws_s3_bucket.config.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle policy to retain all versions for 30 days
resource "aws_s3_bucket_lifecycle_configuration" "config" {
  bucket = aws_s3_bucket.config.id

  rule {
    id     = "retain-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# Outputs
output "config_bucket_name" {
  value       = aws_s3_bucket.config.id
  description = "Name of the S3 bucket for configuration files"
}

output "config_bucket_arn" {
  value       = aws_s3_bucket.config.arn
  description = "ARN of the S3 bucket for configuration files"
}
