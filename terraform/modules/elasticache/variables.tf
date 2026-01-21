# ShipSmart AI API - ElastiCache Module Variables

variable "environment" {
  type        = string
  description = "Environment name (development, staging, production)"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where ElastiCache will be deployed"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs for ElastiCache subnet group"
}

variable "ecs_security_group_id" {
  type        = string
  description = "Security group ID of ECS tasks (to allow access)"
}

variable "node_type" {
  type        = string
  description = "ElastiCache node type (e.g., cache.t3.micro, cache.t3.small)"
}

variable "num_cache_nodes" {
  type        = number
  description = "Number of cache nodes (1 for staging, 2+ for production)"
  default     = 1
}
