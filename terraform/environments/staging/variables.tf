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

variable "github_repo" {
  type        = string
  description = "The GitHub repository in format 'owner/repo' (e.g. stanleychukwu17/code-red-9ja-v1)"
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
variable "create_backend_dns" {
  type        = bool
  description = "Whether to create the backend DNS record"
}
variable "create_backend_a_record" {
  type        = bool
  description = "Whether to create the backend A record"
}
variable "create_ip_service_a_record" {
  type        = bool
  description = "Whether to create the IP service A record"
}
variable "backend_subdomain" {
  type        = string
  description = "The backend subdomain (e.g., staging-api)"
}

variable "ip_subdomain" {
  type        = string
  description = "The subdomain for the IP"
}


variable "rds_engine_version" {
  type        = string
  description = "The database engine version"
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

variable "db_sslmode" {
  type        = string
  description = "PostgreSQL SSL mode used by the API and migrations"
}

variable "redis_node_type" {
  type        = string
  description = "The compute size of the cache node"
}

variable "redis_num_cache_nodes" {
  type        = number
  description = "The number of cache nodes in the cluster"
}

variable "redis_password" {
  type        = string
  description = "The password for the Redis cluster"
  sensitive   = true
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

variable "enable_bastion" {
  type        = bool
  description = "Whether to create the bastion host and related resources"
}

variable "ecs_desired_count" {
  type        = number
  description = "The desired number of tasks to run"
}

variable "bastion_ec2_instance_type" {
  type        = string
  description = "The instance type for the Bastion host"
}

variable "bastion_ssh_public_key_path" {
  type        = string
  description = "Path to the local SSH public key file"
}

variable "bastion_allowed_cidr" {
  type        = string
  description = "The CIDR block allowed to connect to the Bastion host"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
}

variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones in the region"
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for public subnets (ALBs)"
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for private subnets (ECS Tasks)"
}

variable "database_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for database/cache subnets (RDS, Redis)"
}

variable "alb_health_check_path" {
  type        = string
  description = "The health check endpoint path for the ALB"
}

variable "acm_subject_alternative_names" {
  type        = list(string)
  description = "Subject alternative names for the certificate"
}
