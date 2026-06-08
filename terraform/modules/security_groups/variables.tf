variable "environment" {
  type        = string
  description = "Environment name (e.g., staging, production)"
}

variable "vpc_id" {
  type        = string
  description = "The ID of the VPC"
}

variable "app_port" {
  type        = number
  description = "The port the Go application runs on"
  default     = 4000
}
