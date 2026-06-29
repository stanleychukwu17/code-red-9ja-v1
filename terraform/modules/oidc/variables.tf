variable "website" {
  type        = string
  description = "The website name (e.g., free9ja)"
}

variable "environment" {
  type        = string
  description = "Environment name (e.g., staging, production)"
}

variable "github_repo" {
  type        = string
  description = "The GitHub repository in format 'owner/repo' (e.g. stanleychukwu17/code-red-9ja-v1)"
}

variable "ecr_repository_arn" {
  type        = string
  description = "The ARN of the ECR repository to allow pushing to"
  default     = ""
}

variable "ecr_repository_arns" {
  type        = list(string)
  description = "The ARNs of the ECR repositories to allow pushing to"
  default     = []
}

variable "ecs_service_arn" {
  type        = string
  description = "The ARN of the ECS service to allow updating"
  default     = ""
}
