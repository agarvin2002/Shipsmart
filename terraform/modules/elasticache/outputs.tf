# ShipSmart AI API - ElastiCache Module Outputs

output "redis_endpoint" {
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
  description = "Redis endpoint address"
}

output "redis_port" {
  value       = aws_elasticache_cluster.main.cache_nodes[0].port
  description = "Redis port"
}

output "redis_cluster_id" {
  value       = aws_elasticache_cluster.main.id
  description = "Redis cluster ID"
}

output "redis_arn" {
  value       = aws_elasticache_cluster.main.arn
  description = "Redis cluster ARN"
}
