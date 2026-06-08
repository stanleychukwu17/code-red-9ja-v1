output "vpc_id" {
  value       = module.vpc.vpc_id
  description = "The ID of the VPC"
}

output "alb_dns_name" {
  value       = module.alb.alb_dns_name
  description = "The DNS name of the ALB"
}

output "acm_certificate_arn" {
  value       = module.acm.certificate_arn
  description = "The ARN of the validated ACM certificate"
}

output "frontend_url" {
  value       = module.cloudflare.frontend_url
  description = "The custom domain URL for the frontend"
}

output "backend_url" {
  value       = module.cloudflare.backend_url
  description = "The custom domain URL for the backend API"
}

# output "ecr_repository_url" {
#   value       = module.ecs.ecr_repository_url
#   description = "The URL of the ECR repository"
# }

# output "ecs_cluster_name" {
#   value       = module.ecs.ecs_cluster_name
#   description = "The name of the ECS cluster"
# }

# output "ecs_service_name" {
#   value       = module.ecs.ecs_service_name
#   description = "The name of the ECS service"
# }

# output "github_actions_role_arn" {
#   value       = module.oidc.role_arn
#   description = "The ARN of the IAM role to use in GitHub Actions for deployments"
# }
