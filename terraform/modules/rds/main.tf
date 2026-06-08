resource "aws_db_instance" "postgres" {
  identifier             = "free9ja-${var.environment}-db"
  allocated_storage      = var.allocated_storage
  max_allocated_storage  = 100
  engine                 = "postgres"
  engine_version         = var.engine_version
  instance_class         = var.instance_class
  db_name                = var.db_name
  username               = var.db_user
  password               = var.db_password
  db_subnet_group_name   = var.rds_subnet_group_name
  vpc_security_group_ids = [var.security_group_id]
  skip_final_snapshot    = true
  publicly_accessible    = false

  tags = {
    Name        = "free9ja-${var.environment}-db"
    Environment = var.environment
  }
}
