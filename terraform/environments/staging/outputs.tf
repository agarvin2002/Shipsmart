# ShipSmart AI API - Staging Environment Outputs

output "alb_dns_name" {
  value       = module.alb.alb_dns_name
  description = "ALB DNS name (use for testing before DNS setup)"
}

output "staging_url" {
  value       = "https://staging.shipsmart.com"
  description = "Staging environment URL"
}

output "ecs_cluster_name" {
  value       = module.ecs.ecs_cluster_name
  description = "ECS cluster name"
}

output "ecs_service_name" {
  value       = module.ecs.ecs_service_name
  description = "ECS service name"
}

output "db_endpoint" {
  value       = module.rds.db_endpoint
  description = "RDS endpoint"
  sensitive   = true
}

output "redis_endpoint" {
  value       = module.elasticache.redis_endpoint
  description = "Redis endpoint"
}

output "cloudwatch_log_group" {
  value       = module.ecs.cloudwatch_log_group_name
  description = "CloudWatch log group name"
}
