variable "website" {
  description = "The website name"
  type        = string
}

variable "environment" {
  type        = string
  description = "Environment name (e.g., staging, production)"
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

variable "enable_nat_gateway" {
  type        = bool
  description = "Whether to create a NAT Gateway and route private subnet traffic through it"
  default     = true
}

