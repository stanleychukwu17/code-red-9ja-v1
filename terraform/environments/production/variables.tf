variable "aws_region" {
  type        = string
  description = "AWS Region to deploy resources"
  default     = "af-south-1"
}

variable "service_name" {
  type        = string
  description = "The name of the service"
}

variable "cloudflare_api_token" {
  type        = string
  description = "Cloudflare API token with Zone.DNS and Account.Pages permissions"
  sensitive   = true
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
  description = "The custom root domain (e.g., domain.com)"
}

variable "db_password" {
  type        = string
  description = "The password for the RDS database admin user"
  sensitive   = true
}

variable "jwt_secret" {
  type        = string
  description = "The secret key used to sign JWTs"
  sensitive   = true
}

variable "website" {
  description = "The website name"
  type        = string
  default     = "free9ja"
}
