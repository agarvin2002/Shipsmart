# ShipSmart AI API - Production Environment
# Purpose: Complete infrastructure configuration for production environment with HA

terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "shipsmart-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ShipSmart AI API"
      Environment = "production"
      ManagedBy   = "Terraform"
    }
  }
}

# ========================================
# DATA SOURCES
# ========================================

# ECR repository (created in shared)
data "aws_ecr_repository" "shipsmart_api" {
  name = "shipsmart-api"
}

# ========================================
# VPC MODULE
# ========================================

module "vpc" {
  source = "../../modules/vpc"

  environment = "production"
  vpc_cidr    = "10.0.0.0/16"
}

# ========================================
# RDS MODULE (Multi-AZ for HA)
# ========================================

module "rds" {
  source = "../../modules/rds"

  environment            = "production"
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnet_ids
  ecs_security_group_id  = module.ecs.ecs_security_group_id

  db_name     = "shipsmart_prod_db"
  db_username = var.db_username
  db_password = var.db_password

  instance_class = "db.t3.medium"  # Higher capacity for production
  multi_az       = true             # Enable Multi-AZ for high availability
}

# ========================================
# ELASTICACHE MODULE (Multi-node for HA)
# ========================================

module "elasticache" {
  source = "../../modules/elasticache"

  environment            = "production"
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnet_ids
  ecs_security_group_id  = module.ecs.ecs_security_group_id

  node_type       = "cache.t3.small"  # Higher capacity for production
  num_cache_nodes = 2                  # Multiple nodes for high availability
}

# ========================================
# ALB MODULE
# ========================================

module "alb" {
  source = "../../modules/alb"

  environment       = "production"
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  certificate_arn   = var.certificate_arn
}

# ========================================
# ECS MODULE (Multiple tasks for HA)
# ========================================

module "ecs" {
  source = "../../modules/ecs"

  environment            = "production"
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnet_ids
  alb_security_group_id  = module.alb.alb_security_group_id
  target_group_arn       = module.alb.target_group_arn

  ecr_repository_url = data.aws_ecr_repository.shipsmart_api.repository_url
  image_tag          = var.image_tag

  db_endpoint  = module.rds.db_endpoint
  db_name      = module.rds.db_name
  db_username  = module.rds.db_username
  db_password  = var.db_password

  redis_endpoint = module.elasticache.redis_endpoint
  redis_port     = module.elasticache.redis_port

  jwt_secret     = var.jwt_secret
  encryption_key = var.encryption_key

  desired_count = 2      # Multiple tasks for high availability
  cpu           = "1024" # Higher CPU for production
  memory        = "2048" # Higher memory for production
}

# ========================================
# ROUTE53 DNS RECORD
# ========================================

resource "aws_route53_record" "production" {
  zone_id = var.route53_zone_id
  name    = "api.shipsmart.com"
  type    = "A"

  alias {
    name                   = module.alb.alb_dns_name
    zone_id                = module.alb.alb_zone_id
    evaluate_target_health = true
  }
}
