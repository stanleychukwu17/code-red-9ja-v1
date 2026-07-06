output "db_endpoint" {
  value       = aws_db_instance.postgres.endpoint
  description = "The connection endpoint of the RDS instance"
}

output "db_host" {
  value       = split(":", aws_db_instance.postgres.endpoint)[0]
  description = "The database host address"
}

output "db_port" {
  value       = aws_db_instance.postgres.port
  description = "The database port"
}

output "db_name" {
  value       = aws_db_instance.postgres.db_name
  description = "The database name"
}

output "db_user" {
  value       = aws_db_instance.postgres.username
  description = "The database admin username"
}
