terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # HCP Terraform remote state configuration
  cloud {
    organization = "free9ja_team"
    workspaces {
      name = "free9ja-production-5m"
    }
  }
}

provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# --- VPC Module ---
module "vpc" {
  source                = "../../modules/vpc"
  website               = var.website
  environment           = var.environment
  vpc_cidr              = var.vpc_cidr
  availability_zones    = var.availability_zones
  public_subnet_cidrs   = var.public_subnet_cidrs
  private_subnet_cidrs  = var.private_subnet_cidrs
  database_subnet_cidrs = var.database_subnet_cidrs
}

# --- Security Groups Module ---
module "security_groups" {
  source      = "../../modules/security_groups"
  website     = var.website
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  app_port    = var.app_port
}

# --- ACM Module ---
module "acm" {
  source                    = "../../modules/acm"
  website                   = var.website
  environment               = var.environment
  domain_name               = "${var.backend_subdomain}.${var.domain_name}"
  cloudflare_zone_id        = var.cloudflare_zone_id
  subject_alternative_names = var.acm_subject_alternative_names
}

# --- ALB Module ---
module "alb" {
  source            = "../../modules/alb"
  website           = var.website
  environment       = var.environment
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  security_group_id = module.security_groups.alb_security_group_id
  certificate_arn   = module.acm.certificate_arn
  app_port          = var.app_port
  health_check_path = var.alb_health_check_path
}

# --- Cloudflare CDN & DNS Module ---
module "cloudflare" {
  source                = "../../modules/cloudflare"
  website               = var.website
  environment           = var.environment
  cloudflare_account_id = var.cloudflare_account_id
  cloudflare_zone_id    = var.cloudflare_zone_id
  domain_name           = var.domain_name

  create_backend_dns         = var.create_backend_dns
  create_backend_a_record    = var.create_backend_a_record
  create_ip_service_a_record = var.create_ip_service_a_record
  backend_subdomain          = var.backend_subdomain
  ip_subdomain               = var.ip_subdomain
  alb_dns_name               = module.alb.alb_dns_name
}

# --- RDS Database Module ---
module "rds" {
  source                = "../../modules/rds"
  website               = var.website
  environment           = var.environment
  allocated_storage     = var.rds_allocated_storage
  instance_class        = var.rds_instance_class
  engine_version        = var.rds_engine_version
  db_name               = var.rds_db_name
  db_user               = var.rds_db_user
  db_password           = var.rds_db_password
  rds_subnet_group_name = module.vpc.rds_subnet_group_name
  security_group_id     = module.security_groups.rds_security_group_id
}

# --- ElastiCache Redis Module ---
module "elasticache" {
  source                  = "../../modules/elasticache"
  website                 = var.website
  environment             = var.environment
  redis_subnet_group_name = module.vpc.redis_subnet_group_name
  security_group_id       = module.security_groups.redis_security_group_id
  node_type               = var.redis_node_type
  num_cache_nodes         = var.redis_num_cache_nodes
}

# --- AWS Secrets Manager for DB Credentials ---
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${var.website}-${var.environment}-db-credentials"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "db_credentials_version" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username             = var.rds_db_user
    password             = var.rds_db_password
    engine               = "postgres"
    host                 = module.rds.db_host
    port                 = module.rds.db_port
    dbInstanceIdentifier = "${var.website}-${var.environment}-db"
  })
}

# --- RDS Proxy Security Group ---
resource "aws_security_group" "rds_proxy_sg" {
  name        = "${var.website}-${var.environment}-rds-proxy-sg"
  description = "Allows ECS tasks to connect to the RDS Proxy"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.security_groups.ecs_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.website}-${var.environment}-rds-proxy-sg"
    Environment = var.environment
  }
}

# --- Allow RDS Security Group to Accept Connections from RDS Proxy ---
resource "aws_security_group_rule" "allow_proxy_to_rds" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = module.security_groups.rds_security_group_id
  source_security_group_id = aws_security_group.rds_proxy_sg.id
}

# --- RDS Proxy IAM Role ---
resource "aws_iam_role" "rds_proxy_role" {
  name = "${var.website}-${var.environment}-rds-proxy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
      }
    ]
  })
}

# --- RDS Proxy IAM Role Policy for Secrets Manager ---
resource "aws_iam_role_policy" "rds_proxy_policy" {
  name = "${var.website}-${var.environment}-rds-proxy-policy"
  role = aws_iam_role.rds_proxy_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Effect   = "Allow"
        Resource = aws_secretsmanager_secret.db_credentials.arn
      }
    ]
  })
}

# --- AWS RDS Proxy ---
resource "aws_db_proxy" "rds_proxy" {
  name                   = "${var.website}-${var.environment}-db-proxy"
  debug_logging          = false
  engine_family          = "POSTGRESQL"
  idle_client_timeout    = 1800
  require_tls            = true
  role_arn               = aws_iam_role.rds_proxy_role.arn
  vpc_security_group_ids = [aws_security_group.rds_proxy_sg.id]
  vpc_subnet_ids         = module.vpc.database_subnet_ids

  auth {
    auth_scheme = "SECRETS"
    description = "RDS Proxy Auth"
    iam_auth    = "DISABLED"
    secret_arn  = aws_secretsmanager_secret.db_credentials.arn
  }

  tags = {
    Name        = "${var.website}-${var.environment}-db-proxy"
    Environment = var.environment
  }
}

# --- RDS Proxy Default Target Group ---
resource "aws_db_proxy_default_target_group" "rds_proxy_target_group" {
  db_proxy_name = aws_db_proxy.rds_proxy.name

  connection_pool_config {
    connection_borrow_timeout    = 120
    max_connections_percent      = 90
    max_idle_connections_percent = 50
  }
}

# --- RDS Proxy Target ---
resource "aws_db_proxy_target" "rds_proxy_target" {
  db_proxy_name          = aws_db_proxy.rds_proxy.name
  db_instance_identifier = "${var.website}-${var.environment}-db"
  target_group_name      = aws_db_proxy_default_target_group.rds_proxy_target_group.name

  depends_on = [module.rds]
}

# --- ECS Fargate Module (Modified to route via RDS Proxy) ---
module "ecs" {
  source             = "../../modules/ecs"
  website            = var.website
  environment        = var.environment
  service_name       = var.service_name
  aws_region         = var.aws_region
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  security_group_id  = module.security_groups.ecs_security_group_id
  target_group_arn   = module.alb.target_group_arn
  app_port           = var.app_port

  # Route DB connections through RDS Proxy endpoint
  db_host     = aws_db_proxy.rds_proxy.endpoint
  db_port     = 5432
  db_name     = module.rds.db_name
  db_user     = module.rds.db_user
  db_password = var.rds_db_password
  db_sslmode  = var.db_sslmode

  redis_host     = module.elasticache.redis_host
  redis_port     = module.elasticache.redis_port
  redis_password = var.redis_password

  is_ci_cd       = var.is_ci_cd
  run_migrations = var.run_migrations

  jwt_secret             = var.jwt_secret
  jwt_access_expiration  = var.jwt_access_expiration
  jwt_refresh_expiration = var.jwt_refresh_expiration

  ecs_cpu           = var.ecs_cpu
  ecs_memory        = var.ecs_memory
  ecs_desired_count = var.ecs_desired_count
}

# --- ECS Autoscale Target ---
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 15
  min_capacity       = var.ecs_desired_count
  resource_id        = "service/${module.ecs.ecs_cluster_name}/${module.ecs.ecs_service_name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# --- ECS Autoscale Policy (CPU-based) ---
resource "aws_appautoscaling_policy" "ecs_policy_cpu" {
  name               = "${var.website}-${var.environment}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 65.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# --- AWS OIDC GitHub Actions Role Module ---
module "oidc" {
  source             = "../../modules/oidc"
  website            = var.website
  environment        = var.environment
  ecr_repository_arn = module.ecs.ecr_repository_arn
  ecs_service_arn    = module.ecs.ecs_service_arn
  github_repo        = var.github_repo
}

# --- Bastion Module ---
module "bastion" {
  source                  = "../../modules/bastion"
  enable_bastion          = var.enable_bastion
  website                 = var.website
  environment             = var.environment
  instance_type           = var.bastion_ec2_instance_type
  vpc_id                  = module.vpc.vpc_id
  subnet_id               = module.vpc.public_subnet_ids[0]
  rds_security_group_id   = module.security_groups.rds_security_group_id
  redis_security_group_id = module.security_groups.redis_security_group_id
  allowed_cidr            = var.bastion_allowed_cidr
  ssh_public_key          = file(pathexpand(var.bastion_ssh_public_key_path))
}
