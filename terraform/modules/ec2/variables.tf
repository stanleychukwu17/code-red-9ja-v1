variable "website" {
  type        = string
  description = "The website name (e.g. free9ja)"
}

variable "environment" {
  type        = string
  description = "The deployment environment (e.g. staging-api-v2)"
}

variable "vpc_id" {
  type        = string
  description = "The VPC ID where the EC2 instance will be created"
}

variable "subnet_id" {
  type        = string
  description = "The public subnet ID where the EC2 instance will be deployed"
}

variable "instance_type" {
  type        = string
  description = "The instance type for the EC2 instance"
  default     = "t3.medium"
}

variable "ssh_public_key" {
  type        = string
  description = "The public key contents to authorize SSH access"
}

variable "ssh_allowed_cidr" {
  type        = string
  description = "The CIDR block allowed to SSH to the instance"
}

variable "ecr_api_repo_url" {
  type        = string
  description = "The ECR repository URL for the API service"
}

variable "ecr_ip_repo_url" {
  type        = string
  description = "The ECR repository URL for the IP service"
}

variable "aws_region" {
  type        = string
  description = "The AWS region where resources are deployed"
}

variable "domain_name" {
  type        = string
  description = "The custom root domain (e.g., free9ja.com)"
}

variable "backend_subdomain" {
  type        = string
  description = "The backend subdomain (e.g., staging-api)"
}

variable "ip_subdomain" {
  type        = string
  description = "The IP service subdomain (e.g., staging-ip)"
}

variable "db_name" {
  type        = string
  description = "The database name to initialize"
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

variable "run_migrations" {
  type        = string
  description = "Run database migrations on start"
  default     = "true"
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

