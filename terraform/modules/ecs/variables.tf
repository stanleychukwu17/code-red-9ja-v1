variable "website" {
  type        = string
  description = "the website you are deploying"
}

variable "environment" {
  type        = string
  description = "Environment name (e.g., staging, production)"
}

variable "service_name" {
  type        = string
  description = "The name of the service"
}

variable "aws_region" {
  type        = string
  description = "The aws region"
}

variable "vpc_id" {
  type        = string
  description = "The ID of the VPC"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnets for running the ECS tasks"
}

variable "security_group_id" {
  type        = string
  description = "The security group ID for ECS tasks"
}

variable "target_group_arn" {
  type        = string
  description = "The ARN of the ALB target group"
}

variable "app_port" {
  type        = number
  description = "The port the Go app runs on"
}

# --- Backend Application Env Variables ---
variable "db_host" {
  type        = string
  description = "The database host address"
}

variable "db_port" {
  type        = number
  description = "The database port"
}

variable "db_name" {
  type        = string
  description = "The database name"
}

variable "db_user" {
  type        = string
  description = "The database user"
}

variable "db_password" {
  type        = string
  description = "The database password"
  sensitive   = true
}

variable "redis_host" {
  type        = string
  description = "The Redis host address"
}

variable "redis_port" {
  type        = number
  description = "The Redis port"
}

variable "redis_password" {
  type        = string
  description = "The Redis password"
  sensitive   = true
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

# --- ECS Resource Sizing ---
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

