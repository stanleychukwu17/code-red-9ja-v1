variable "website" {
  type        = string
  description = "the website you are deploying"
}

variable "environment" {
  type        = string
  description = "Environment name (e.g., staging, production)"
}

variable "node_type" {
  type        = string
  description = "The compute size of the cache node"
}

variable "num_cache_nodes" {
  type        = number
  description = "The number of cache nodes in the cluster"
}

variable "redis_subnet_group_name" {
  type        = string
  description = "The name of the ElastiCache subnet group"
}

variable "security_group_id" {
  type        = string
  description = "The security group ID for the Redis cluster"
}
