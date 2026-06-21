variable "website" {
  description = "The website name"
  type        = string
}

variable "environment" {
  type        = string
  description = "Environment name (e.g., staging, production)"
}

variable "cloudflare_account_id" {
  type        = string
  description = "The Cloudflare Account ID"
  sensitive   = true
}

variable "cloudflare_zone_id" {
  type        = string
  description = "The Cloudflare Zone ID for the custom domain"
  sensitive   = true
}

variable "domain_name" {
  type        = string
  description = "The root domain name (e.g., domain.com)"
}

variable "frontend_subdomain" {
  type        = string
  description = "Subdomain for the frontend (e.g., www, staging)"
}

variable "backend_subdomain" {
  type        = string
  description = "Subdomain for the backend (e.g., api, api.staging)"
}

variable "alb_dns_name" {
  type        = string
  description = "The DNS name of the AWS Application Load Balancer"
}
