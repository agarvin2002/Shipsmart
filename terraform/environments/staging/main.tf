# ShipSmart AI API - Staging Environment
# Purpose: Complete infrastructure configuration for staging environment

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
    key            = "staging/terraform.tfstate"
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
      Environment = "staging"
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

  environment = "staging"
  vpc_cidr    = "10.1.0.0/16"
}

# ========================================
# RDS MODULE
# ========================================

module "rds" {
  source = "../../modules/rds"

  environment            = "staging"
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnet_ids
  ecs_security_group_id  = module.ecs.ecs_security_group_id

  db_name     = "shipsmart_staging_db"
  db_username = var.db_username
  db_password = var.db_password

  instance_class = "db.t3.small"
  multi_az       = false
}

# ========================================
# ELASTICACHE MODULE
# ========================================

module "elasticache" {
  source = "../../modules/elasticache"

  environment            = "staging"
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnet_ids
  ecs_security_group_id  = module.ecs.ecs_security_group_id

  node_type       = "cache.t3.micro"
  num_cache_nodes = 1
}

# ========================================
# ALB MODULE
# ========================================

module "alb" {
  source = "../../modules/alb"

  environment       = "staging"
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  certificate_arn   = var.certificate_arn
}

# ========================================
# ECS MODULE
# ========================================

module "ecs" {
  source = "../../modules/ecs"

  environment            = "staging"
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

  desired_count = 1
  cpu           = "512"
  memory        = "1024"
}

# ========================================
# ROUTE53 DNS RECORD
# ========================================

resource "aws_route53_record" "staging" {
  zone_id = var.route53_zone_id
  name    = "staging.shipsmart.com"
  type    = "A"

  alias {
    name                   = module.alb.alb_dns_name
    zone_id                = module.alb.alb_zone_id
    evaluate_target_health = true
  }
}
