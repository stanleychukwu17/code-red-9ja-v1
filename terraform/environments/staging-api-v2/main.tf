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
  # If you want to test the environment locally, you can comment out the whole cloud block below
  # cloud {
  #   organization = "free9ja_team"
  #   workspaces {
  #     name = "free9ja-staging-api-v2"
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
# Creates VPC, subnets, route tables, etc. Disables NAT Gateway for cost savings.
module "vpc" {
  source                = "../../modules/vpc"
  website               = var.website
  environment           = var.environment
  vpc_cidr              = var.vpc_cidr
  availability_zones    = var.availability_zones
  public_subnet_cidrs   = var.public_subnet_cidrs
  private_subnet_cidrs  = var.private_subnet_cidrs
  database_subnet_cidrs = var.database_subnet_cidrs
  enable_nat_gateway    = false # Cost optimization: run in public subnet, no NAT GW needed.
}

# --- Elastic Container Registry (ECR) for API Service ---
resource "aws_ecr_repository" "api" {
  name                 = "${var.website}-${var.environment}-${var.service_name}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
  }
}

# --- Elastic Container Registry (ECR) for IP Service ---
resource "aws_ecr_repository" "ip_service" {
  name                 = "${var.website}-${var.environment}-ip-service"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
  }
}

# --- EC2 Instance Module ---
# Provisions the staging server and installs Docker Compose, Nginx, Certbot.
module "ec2_instance" {
  source                 = "../../modules/ec2"
  website                = var.website
  environment            = var.environment
  vpc_id                 = module.vpc.vpc_id
  subnet_id              = module.vpc.public_subnet_ids[0] # Place in the public subnet
  instance_type          = var.ec2_instance_type
  ssh_public_key         = file(pathexpand(var.bastion_ssh_public_key_path))
  ssh_allowed_cidr       = var.bastion_allowed_cidr
  ecr_api_repo_url       = aws_ecr_repository.api.repository_url
  ecr_ip_repo_url        = aws_ecr_repository.ip_service.repository_url
  aws_region             = var.aws_region
  domain_name            = var.domain_name
  backend_subdomain      = var.backend_subdomain
  ip_subdomain           = var.ip_subdomain
  db_name                = var.rds_db_name
  db_user                = var.rds_db_user
  db_password            = var.rds_db_password
  jwt_secret             = var.jwt_secret
  jwt_access_expiration  = var.jwt_access_expiration
  jwt_refresh_expiration = var.jwt_refresh_expiration
  run_migrations         = var.run_migrations
  ebs_data_volume_size   = var.ebs_data_volume_size
  compose_version        = var.compose_version
  ec2_root_volume_size   = var.ec2_root_volume_size
}

# --- Cloudflare CDN & DNS Module ---
# Maps staging-api.free9ja.com and staging-ip.free9ja.com directly to our EC2 Elastic IP address.
module "cloudflare" {
  source                = "../../modules/cloudflare"
  website               = var.website
  environment           = var.environment
  cloudflare_account_id = var.cloudflare_account_id
  cloudflare_zone_id    = var.cloudflare_zone_id
  domain_name           = var.domain_name
  frontend_subdomain    = var.frontend_subdomain
  backend_subdomain     = var.backend_subdomain
  backend_ip            = module.ec2_instance.public_ip
  ip_subdomain          = var.ip_subdomain
  ip_service_ip         = module.ec2_instance.public_ip
}

# --- AWS OIDC GitHub Actions Role Module ---
# Grants permissions to our CI/CD pipeline to push Docker images and trigger deploys.
module "oidc" {
  source      = "../../modules/oidc"
  website     = var.website
  environment = var.environment
  github_repo = var.github_repo
  ecr_repository_arns = [
    aws_ecr_repository.api.arn,
    aws_ecr_repository.ip_service.arn
  ]
}
