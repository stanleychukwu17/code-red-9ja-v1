resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${var.website}-${var.environment}-redis"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.node_type
  num_cache_nodes      = var.num_cache_nodes
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = var.redis_subnet_group_name
  security_group_ids   = [var.security_group_id]

  tags = {
    Name        = "${var.website}-${var.environment}-redis"
    Environment = var.environment
  }
}
