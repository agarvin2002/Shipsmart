# ShipSmart AI API - ALB Module Outputs

output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "DNS name of the load balancer"
}

output "alb_zone_id" {
  value       = aws_lb.main.zone_id
  description = "Zone ID of the load balancer (for Route53 alias records)"
}

output "alb_arn" {
  value       = aws_lb.main.arn
  description = "ARN of the load balancer"
}

output "alb_security_group_id" {
  value       = aws_security_group.alb.id
  description = "Security group ID of the ALB"
}

output "target_group_arn" {
  value       = aws_lb_target_group.api.arn
  description = "ARN of the target group"
}

output "target_group_name" {
  value       = aws_lb_target_group.api.name
  description = "Name of the target group"
}
