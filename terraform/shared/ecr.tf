# ShipSmart AI API - ECR Repository Configuration
# Purpose: Docker image repository shared across all environments

# ECR Repository for Docker images
resource "aws_ecr_repository" "shipsmart_api" {
  name                 = "shipsmart-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name        = "ShipSmart API"
    Environment = "shared"
    Purpose     = "Docker images for all environments"
  }
}

# ECR Lifecycle Policy (keep last 10 images)
resource "aws_ecr_lifecycle_policy" "shipsmart_api" {
  repository = aws_ecr_repository.shipsmart_api.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus     = "any"
        countType     = "imageCountMoreThan"
        countNumber   = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}

# Outputs
output "ecr_repository_url" {
  value       = aws_ecr_repository.shipsmart_api.repository_url
  description = "ECR repository URL for Docker images"
}

output "ecr_repository_arn" {
  value       = aws_ecr_repository.shipsmart_api.arn
  description = "ECR repository ARN"
}

output "ecr_repository_name" {
  value       = aws_ecr_repository.shipsmart_api.name
  description = "ECR repository name"
}
