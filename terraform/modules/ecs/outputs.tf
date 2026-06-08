output "ecr_repository_url" {
  value       = aws_ecr_repository.api.repository_url
  description = "The URL of the ECR repository"
}

output "ecr_repository_arn" {
  value       = aws_ecr_repository.api.arn
  description = "The ARN of the ECR repository"
}

output "ecs_cluster_name" {
  value       = aws_ecs_cluster.main.name
  description = "The name of the ECS cluster"
}

output "ecs_service_name" {
  value       = aws_ecs_service.api.name
  description = "The name of the ECS service"
}

output "ecs_service_arn" {
  value       = aws_ecs_service.api.id
  description = "The ARN of the ECS service"
}
