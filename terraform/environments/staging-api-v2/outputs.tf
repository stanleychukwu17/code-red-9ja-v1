output "vpc_id" {
  value       = module.vpc.vpc_id
  description = "The ID of the VPC"
}

output "ec2_public_ip" {
  value       = module.ec2_instance.public_ip
  description = "The static Elastic IP address of the staging-api-v2 EC2 instance"
}

output "ec2_instance_id" {
  value       = module.ec2_instance.instance_id
  description = "The instance ID of the EC2 instance"
}

output "ecr_api_repo_url" {
  value       = aws_ecr_repository.api.repository_url
  description = "The URL of the API ECR repository"
}

output "ecr_ip_repo_url" {
  value       = aws_ecr_repository.ip_service.repository_url
  description = "The URL of the IP Service ECR repository"
}

output "github_actions_role_arn" {
  value       = module.oidc.role_arn
  description = "The ARN of the IAM role to use in GitHub Actions for deployments"
}
