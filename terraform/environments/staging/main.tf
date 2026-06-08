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
  # cloud {
  #   organization = "free9ja_team" # Replace with your actual HCP organization name

  #   workspaces {
  #     name = "free9ja-staging"
  #   }
  # }
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
# creates aws_vpc, aws_subnet, aws_internet_gateway, aws_eip(Elastic IP), aws_nat_gateway, aws_route_table,
# aws_subnet_route_table_association, aws_db_subnet_group, aws_elasticache_subnet_group
module "vpc" {
  source      = "../../modules/vpc"
  environment = var.environment
}

# # --- Security Groups Module ---
# creates 4 security groups for: alb, ecs, rds & redis
module "security_groups" {
  source      = "../../modules/security_groups"
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
}

# --- ACM Module ---
module "acm" {
  source             = "../../modules/acm"
  environment        = var.environment
  domain_name        = "${var.backend_subdomain}.${var.domain_name}"
  cloudflare_zone_id = var.cloudflare_zone_id
}

# --- ALB Module ---
module "alb" {
  source            = "../../modules/alb"
  environment       = var.environment
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  security_group_id = module.security_groups.alb_security_group_id
  certificate_arn   = module.acm.certificate_arn
}

# --- Cloudflare CDN & DNS Module ---
module "cloudflare" {
  source                = "../../modules/cloudflare"
  environment           = var.environment
  cloudflare_account_id = var.cloudflare_account_id
  cloudflare_zone_id    = var.cloudflare_zone_id
  domain_name           = var.domain_name
  frontend_subdomain    = var.frontend_subdomain
  backend_subdomain     = var.backend_subdomain
  alb_dns_name          = module.alb.alb_dns_name
  production_branch     = var.environment
}

# # --- RDS Database Module ---
module "rds" {
  source                = "../../modules/rds"
  website               = var.website
  environment           = var.environment
  allocated_storage     = var.rds_allocated_storage
  instance_class        = var.rds_instance_class
  db_name               = var.rds_db_name
  db_user               = var.rds_db_user
  db_password           = var.rds_db_password
  rds_subnet_group_name = module.vpc.rds_subnet_group_name
  security_group_id     = module.security_groups.rds_security_group_id
}

# # --- ElastiCache Redis Module ---
module "elasticache" {
  source                  = "../../modules/elasticache"
  website                 = var.website
  environment             = var.environment
  redis_subnet_group_name = module.vpc.redis_subnet_group_name
  security_group_id       = module.security_groups.redis_security_group_id
  node_type               = var.redis_node_type
  num_cache_nodes         = var.redis_num_cache_nodes
}

# # --- ECS Fargate Module ---
module "ecs" {
  source             = "../../modules/ecs"
  website            = var.website
  environment        = var.environment
  service_name       = var.service_name
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  security_group_id  = module.security_groups.ecs_security_group_id
  target_group_arn   = module.alb.target_group_arn
  app_port           = var.app_port

  db_host     = module.rds.db_host
  db_port     = module.rds.db_port
  db_name     = module.rds.db_name
  db_user     = module.rds.db_user
  db_password = var.rds_db_password

  redis_host     = module.elasticache.redis_host
  redis_port     = module.elasticache.redis_port
  redis_password = "" # Local Redis has no password, default is empty

  is_ci_cd       = var.is_ci_cd
  run_migrations = var.run_migrations

  jwt_secret             = var.jwt_secret
  jwt_access_expiration  = var.jwt_access_expiration
  jwt_refresh_expiration = var.jwt_refresh_expiration

  ecs_cpu           = var.ecs_cpu
  ecs_memory        = var.ecs_memory
  ecs_desired_count = var.ecs_desired_count
  aws_region        = var.aws_region
}

# # --- AWS OIDC GitHub Actions Role Module ---
# module "oidc" {
#   source               = "../../modules/oidc"
#   environment          = var.environment
#   create_oidc_provider = true # Create the OIDC provider once in this workspace
#   ecr_repository_arn   = module.ecs.ecr_repository_arn
#   ecs_service_arn      = module.ecs.ecs_service_arn
# }
