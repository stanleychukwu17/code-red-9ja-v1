variable "aws_access_key" {}
variable "aws_secret_key" {}

variable "website" {
  type        = string
  description = "the website you are deploying"
}

variable "environment" {
  type        = string
  description = "Environment name (staging or production)"
}

variable "service_name" {
  type        = string
  description = "The name of the service"
}

variable "aws_region" {
  type        = string
  description = "AWS Region to deploy resources"
}

variable "cloudflare_api_token" {
  type        = string
  description = "Cloudflare API token with Zone.DNS and Account.Pages permissions"
  sensitive   = true
}

variable "cloudflare_account_id" {
  type        = string
  description = "The Cloudflare Account ID"
  sensitive   = true
}

variable "cloudflare_zone_id" {
  type        = string
  description = "The Cloudflare Zone ID for the custom domain"
  sensitive   = true
}

variable "domain_name" {
  type        = string
  description = "The custom root domain (e.g., domain.com)"
}
variable "backend_subdomain" {
  type        = string
  description = "The backend subdomain (e.g., staging-api)"
}

variable "frontend_subdomain" {
  type        = string
  description = "The frontend subdomain (e.g., staging)"
}

variable "rds_allocated_storage" {
  type        = number
  description = "The allocated storage in gigabytes"
}

variable "rds_instance_class" {
  type        = string
  description = "The instance class for the RDS instance"
}

variable "rds_db_name" {
  type        = string
  description = "The database name"
}

variable "rds_db_user" {
  type        = string
  description = "The database admin username"
}

variable "rds_db_password" {
  type        = string
  description = "The password for the RDS database admin user"
  sensitive   = true
}

variable "redis_node_type" {
  type        = string
  description = "The compute size of the cache node"
}

variable "redis_num_cache_nodes" {
  type        = number
  description = "The number of cache nodes in the cluster"
}

variable "app_port" {
  type        = number
  description = "The port the Go app runs on"
}

variable "is_ci_cd" {
  type        = string
  description = "if true, go skips loading local .env file"
}

variable "run_migrations" {
  type        = string
  description = "Run database migrations on task start"
}

variable "jwt_secret" {
  type        = string
  description = "The secret key used to sign JWTs"
  sensitive   = true
}

variable "jwt_access_expiration" {
  type        = string
  description = "Access token duration (e.g., 15m)"
}
variable "jwt_refresh_expiration" {
  type        = string
  description = "Refresh token duration (e.g., 720h)"
}

variable "ecs_cpu" {
  type        = number
  description = "The CPU units to allocate to the task (256 = 0.25 vCPU)"
}

variable "ecs_memory" {
  type        = number
  description = "The memory in MB to allocate to the task (512)"
}

variable "ecs_desired_count" {
  type        = number
  description = "The desired number of tasks to run"
}
