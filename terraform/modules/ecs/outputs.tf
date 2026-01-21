# ShipSmart AI API - ECS Module Outputs

output "ecs_cluster_name" {
  value       = aws_ecs_cluster.main.name
  description = "Name of the ECS cluster"
}

output "ecs_cluster_id" {
  value       = aws_ecs_cluster.main.id
  description = "ID of the ECS cluster"
}

output "ecs_cluster_arn" {
  value       = aws_ecs_cluster.main.arn
  description = "ARN of the ECS cluster"
}

output "ecs_service_name" {
  value       = aws_ecs_service.api.name
  description = "Name of the ECS service"
}

output "ecs_service_id" {
  value       = aws_ecs_service.api.id
  description = "ID of the ECS service"
}

output "ecs_task_family" {
  value       = aws_ecs_task_definition.api.family
  description = "Family name of the ECS task definition"
}

output "ecs_task_definition_arn" {
  value       = aws_ecs_task_definition.api.arn
  description = "ARN of the ECS task definition"
}

output "ecs_security_group_id" {
  value       = aws_security_group.ecs_tasks.id
  description = "Security group ID of ECS tasks"
}

output "cloudwatch_log_group_name" {
  value       = aws_cloudwatch_log_group.ecs.name
  description = "Name of the CloudWatch log group"
}
