# ShipSmart AI API - VPC Module Variables

variable "environment" {
  type        = string
  description = "Environment name (development, staging, production)"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for VPC"
  default     = "10.0.0.0/16"
}
