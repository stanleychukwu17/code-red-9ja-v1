output "redis_host" {
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
  description = "The address of the Redis node"
}

output "redis_port" {
  value       = aws_elasticache_cluster.redis.cache_nodes[0].port
  description = "The port of the Redis node"
}

output "redis_endpoint" {
  value       = "${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.cache_nodes[0].port}"
  description = "The full endpoint of the Redis node (host:port)"
}
