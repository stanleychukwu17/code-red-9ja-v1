variable "environment" {
  type        = string
  description = "Environment name (e.g., staging, production)"
}

variable "github_repo" {
  type        = string
  description = "The GitHub repository in format 'owner/repo' (e.g. stanleychukwu17/code-red-9ja-v1)"
  default     = "stanleychukwu17/code-red-9ja-v1"
}

variable "create_oidc_provider" {
  type        = bool
  description = "Whether to create the IAM OIDC provider. Set to true in only one environment (e.g., staging) and false in others."
  default     = false
}

variable "ecr_repository_arn" {
  type        = string
  description = "The ARN of the ECR repository to allow pushing to"
}

variable "ecs_service_arn" {
  type        = string
  description = "The ARN of the ECS service to allow updating"
}
