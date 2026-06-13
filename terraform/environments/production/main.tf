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
  # if you want to test the environment locally, you can comment out the whole cloud block below
  cloud {
    organization = "free9ja_team"
    workspaces {
      name = "free9ja-production"
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
# creates aws_vpc, aws_subnet, aws_internet_gateway, aws_eip(Elastic IP), aws_nat_gateway, aws_route_table,
# aws_subnet_route_table_association, aws_db_subnet_group, aws_elasticache_subnet_group
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

# # --- Security Groups Module ---
# creates 4 security groups for: alb, ecs, rds & redis
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
  source                 = "../../modules/cloudflare"
  website                = var.website
  environment            = var.environment
  cloudflare_account_id  = var.cloudflare_account_id
  cloudflare_zone_id     = var.cloudflare_zone_id
  domain_name            = var.domain_name
  create_frontend_domain = var.create_frontend_domain
  frontend_subdomain     = var.frontend_subdomain
  backend_subdomain      = var.backend_subdomain
  alb_dns_name           = module.alb.alb_dns_name
}

# # --- RDS Database Module ---
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
  aws_region         = var.aws_region
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
  redis_password = var.redis_password # Local Redis has no password, default is empty

  is_ci_cd       = var.is_ci_cd
  run_migrations = var.run_migrations

  jwt_secret             = var.jwt_secret
  jwt_access_expiration  = var.jwt_access_expiration
  jwt_refresh_expiration = var.jwt_refresh_expiration

  ecs_cpu           = var.ecs_cpu
  ecs_memory        = var.ecs_memory
  ecs_desired_count = var.ecs_desired_count
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
