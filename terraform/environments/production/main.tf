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
    organization = "your-hcp-org" # Replace with your actual HCP organization name

    workspaces {
      name = "free9ja-production"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# --- VPC Module ---
module "vpc" {
  source      = "../../modules/vpc"
  environment = "production"
}

# --- Security Groups Module ---
module "security_groups" {
  source      = "../../modules/security_groups"
  environment = "production"
  vpc_id      = module.vpc.vpc_id
}

# --- RDS Database Module ---
module "rds" {
  source                = "../../modules/rds"
  environment           = "production"
  rds_subnet_group_name = module.vpc.rds_subnet_group_name
  security_group_id     = module.security_groups.rds_security_group_id
  db_password           = var.db_password
}

# --- ElastiCache Redis Module ---
module "elasticache" {
  source                  = "../../modules/elasticache"
  environment             = "production"
  redis_subnet_group_name = module.vpc.redis_subnet_group_name
  security_group_id       = module.security_groups.redis_security_group_id
}

# --- ALB Module ---
module "alb" {
  source            = "../../modules/alb"
  environment       = "production"
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  security_group_id = module.security_groups.alb_security_group_id
}

# --- ECS Fargate Module ---
module "ecs" {
  source             = "../../modules/ecs"
  environment        = "production"
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  security_group_id  = module.security_groups.ecs_security_group_id
  target_group_arn   = module.alb.target_group_arn

  db_host     = module.rds.db_host
  db_port     = module.rds.db_port
  db_name     = module.rds.db_name
  db_user     = module.rds.db_user
  db_password = var.db_password

  redis_host     = module.elasticache.redis_host
  redis_port     = module.elasticache.redis_port
  redis_password = "" # Local Redis has no password, default is empty

  jwt_secret   = var.jwt_secret
  service_name = var.service_name
}

# --- Cloudflare CDN & DNS Module ---
module "cloudflare" {
  source                = "../../modules/cloudflare"
  environment           = "production"
  cloudflare_account_id = var.cloudflare_account_id
  cloudflare_zone_id    = var.cloudflare_zone_id
  domain_name           = var.domain_name
  frontend_subdomain    = "www"
  backend_subdomain     = "api"
  alb_dns_name          = module.alb.alb_dns_name
  production_branch     = "main" # main branch deploys to production project
}

# --- AWS OIDC GitHub Actions Role Module ---
module "oidc" {
  source             = "../../modules/oidc"
  website            = "free9ja"
  environment        = "production"
  ecr_repository_arn = module.ecs.ecr_repository_arn
  ecs_service_arn    = module.ecs.ecs_service_arn
}
