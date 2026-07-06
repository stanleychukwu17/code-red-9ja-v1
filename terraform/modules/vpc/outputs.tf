output "vpc_id" {
  value       = aws_vpc.main.id
  description = "The ID of the VPC"
}

output "public_subnet_ids" {
  value       = aws_subnet.public[*].id
  description = "List of public subnet IDs"
}

output "private_subnet_ids" {
  value       = aws_subnet.private[*].id
  description = "List of private subnet IDs"
}

output "database_subnet_ids" {
  value       = aws_subnet.database[*].id
  description = "List of database subnet IDs"
}

output "rds_subnet_group_name" {
  value       = try(aws_db_subnet_group.rds[0].name, "")
  description = "The name of the RDS subnet group"
}

output "redis_subnet_group_name" {
  value       = try(aws_elasticache_subnet_group.redis[0].name, "")
  description = "The name of the ElastiCache subnet group"
}
