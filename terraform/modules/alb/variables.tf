variable "website" {
  description = "The website name"
  type        = string
}

variable "environment" {
  type        = string
  description = "Environment name (e.g., staging, production)"
}

variable "vpc_id" {
  type        = string
  description = "The ID of the VPC"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "The list of public subnet IDs to place the ALB"
}

variable "security_group_id" {
  type        = string
  description = "The security group ID for the ALB"
}

variable "app_port" {
  type        = number
  description = "The port the Go application runs on"
  default     = 4000
}

variable "health_check_path" {
  type        = string
  description = "The health check endpoint path"
  default     = "/api/v1"
}
