variable "website" {
  type        = string
  description = "The website / application name"
}

variable "environment" {
  type        = string
  description = "The environment name (e.g. staging or production)"
}

variable "enable_bastion" {
  type        = bool
  description = "Whether to create the bastion host and related resources"
}

variable "vpc_id" {
  type        = string
  description = "The ID of the VPC"
}

variable "instance_type" {
  type        = string
  description = "The instance type for the bastion host"
}

variable "subnet_id" {
  type        = string
  description = "The ID of the public subnet where the bastion host will be launched"
}

variable "rds_security_group_id" {
  type        = string
  description = "The ID of the RDS security group to attach the ingress rule to"
}

variable "redis_security_group_id" {
  type        = string
  description = "The ID of the Redis security group to attach the ingress rule to"
}

variable "allowed_cidr" {
  type        = string
  description = "The CIDR block allowed to SSH into the bastion host"
}

variable "ssh_public_key" {
  type        = string
  description = "The public key material to register with the AWS key pair"
}
