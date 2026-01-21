# ShipSmart AI API - Staging Environment Variables

variable "aws_region" {
  type        = string
  description = "AWS region for resources"
  default     = "us-east-1"
}

variable "image_tag" {
  type        = string
  description = "Docker image tag to deploy"
  default     = "staging"
}

variable "db_username" {
  type        = string
  description = "Database master username"
  sensitive   = true
}

variable "db_password" {
  type        = string
  description = "Database master password"
  sensitive   = true
}

variable "jwt_secret" {
  type        = string
  description = "JWT secret key (32+ characters)"
  sensitive   = true
}

variable "encryption_key" {
  type        = string
  description = "Encryption key for carrier credentials (exactly 32 characters)"
  sensitive   = true
}

variable "certificate_arn" {
  type        = string
  description = "ACM certificate ARN for staging.shipsmart.com"
}

variable "route53_zone_id" {
  type        = string
  description = "Route53 hosted zone ID for shipsmart.com"
}
