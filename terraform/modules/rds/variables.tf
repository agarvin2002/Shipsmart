# ShipSmart AI API - RDS Module Variables

variable "environment" {
  type        = string
  description = "Environment name (development, staging, production)"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where RDS will be deployed"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs for RDS subnet group"
}

variable "ecs_security_group_id" {
  type        = string
  description = "Security group ID of ECS tasks (to allow access)"
}

variable "db_name" {
  type        = string
  description = "Database name"
  default     = "shipsmart_db"
}

variable "db_username" {
  type        = string
  description = "Database master username"
  default     = "shipsmart_admin"
}

variable "db_password" {
  type        = string
  description = "Database master password"
  sensitive   = true
}

variable "instance_class" {
  type        = string
  description = "RDS instance class (e.g., db.t3.small, db.t3.medium)"
}

variable "multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment for high availability"
  default     = false
}
