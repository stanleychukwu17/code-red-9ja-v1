variable "website" {
  type        = string
  description = "the website you are deploying"
}

variable "environment" {
  type        = string
  description = "Environment name (e.g., staging, production)"
}

variable "allocated_storage" {
  type        = number
  description = "The allocated storage in gigabytes"
}

variable "instance_class" {
  type        = string
  description = "The instance class for the RDS instance"
}

variable "db_name" {
  type        = string
  description = "The name of the database"
}

variable "db_user" {
  type        = string
  description = "The database admin username"
}

variable "db_password" {
  type        = string
  description = "The database admin password"
  sensitive   = true
}

variable "rds_subnet_group_name" {
  type        = string
  description = "The name of the RDS subnet group"
}

variable "security_group_id" {
  type        = string
  description = "The security group ID for the RDS instance"
}

variable "engine_version" {
  type        = string
  description = "The database engine version"
  default     = "16.13"
}

