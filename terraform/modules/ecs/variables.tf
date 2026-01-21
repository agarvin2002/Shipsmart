# ShipSmart AI API - ECS Module Variables

variable "environment" {
  type        = string
  description = "Environment name (development, staging, production)"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where ECS will be deployed"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs for ECS tasks"
}

variable "alb_security_group_id" {
  type        = string
  description = "Security group ID of the ALB"
}

variable "target_group_arn" {
  type        = string
  description = "ARN of the ALB target group"
}

variable "ecr_repository_url" {
  type        = string
  description = "ECR repository URL for Docker images"
}

variable "image_tag" {
  type        = string
  description = "Docker image tag to deploy"
  default     = "latest"
}

variable "db_endpoint" {
  type        = string
  description = "RDS endpoint (format: host:port)"
}

variable "db_name" {
  type        = string
  description = "Database name"
}

variable "db_username" {
  type        = string
  description = "Database username"
  sensitive   = true
}

variable "db_password" {
  type        = string
  description = "Database password"
  sensitive   = true
}

variable "redis_endpoint" {
  type        = string
  description = "Redis endpoint address"
}

variable "redis_port" {
  type        = number
  description = "Redis port"
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

variable "desired_count" {
  type        = number
  description = "Number of ECS tasks to run"
  default     = 1
}

variable "cpu" {
  type        = string
  description = "CPU units for ECS task (256, 512, 1024, 2048, 4096)"
  default     = "512"
}

variable "memory" {
  type        = string
  description = "Memory for ECS task in MB (512, 1024, 2048, 4096, 8192)"
  default     = "1024"
}
