variable "aws_access_key" {}
variable "aws_secret_key" {}

variable "website" {
  type        = string
  description = "The website you are deploying"
}

variable "environment" {
  type        = string
  description = "Environment name (staging-api-v2)"
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
  description = "The GitHub repository in format 'owner/repo'"
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
  description = "The IP service subdomain (e.g., staging-ip)"
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
  description = "The password for the database admin user"
  sensitive   = true
}

variable "app_port" {
  type        = number
  description = "The port the Go app runs on"
}

variable "ip_port" {
  type        = number
  description = "The port the ip service runs on"
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

variable "bastion_ssh_public_key_path" {
  type        = string
  description = "Path to the local SSH public key file (used for the EC2 instance)"
}

variable "bastion_allowed_cidr" {
  type        = string
  description = "The CIDR block allowed to connect to the EC2 instance via SSH"
}

variable "ec2_instance_type" {
  type        = string
  description = "The instance type for the EC2 staging server"
  default     = "t3.medium"
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
  description = "CIDR blocks for public subnets"
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for private subnets"
}

variable "database_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for database/cache subnets"
}

variable "ebs_data_volume_size" {
  type        = number
  description = "The size of the persistent data volume in GB"
}

variable "compose_version" {
  type        = string
  description = "Docker Compose CLI plugin version"
}

variable "ec2_root_volume_size" {
  type        = number
  description = "The size of the root volume in GB"
  default     = 20
}

