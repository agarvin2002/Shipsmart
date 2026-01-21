# ShipSmart AI API - RDS Module Outputs

output "db_endpoint" {
  value       = aws_db_instance.main.endpoint
  description = "RDS endpoint (format: host:port)"
}

output "db_address" {
  value       = aws_db_instance.main.address
  description = "RDS hostname"
}

output "db_port" {
  value       = aws_db_instance.main.port
  description = "RDS port"
}

output "db_name" {
  value       = aws_db_instance.main.db_name
  description = "Database name"
}

output "db_username" {
  value       = aws_db_instance.main.username
  description = "Database master username"
  sensitive   = true
}

output "db_arn" {
  value       = aws_db_instance.main.arn
  description = "RDS instance ARN"
}
