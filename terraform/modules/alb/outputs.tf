output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "The DNS name of the load balancer"
}

output "alb_zone_id" {
  value       = aws_lb.main.zone_id
  description = "The canonical hosted zone ID of the load balancer"
}

output "target_group_arn" {
  value       = aws_lb_target_group.api.arn
  description = "The ARN of the target group"
}
