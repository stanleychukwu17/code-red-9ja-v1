variable "environment" {
  type        = string
  description = "The deployment environment (e.g., staging, production)"
}

variable "website" {
  type        = string
  description = "The deployment website (e.g., free9ja)"
}

variable "domain_name" {
  type        = string
  description = "The primary domain name for the certificate (e.g., staging-api.free9ja.com)"
}

variable "cloudflare_zone_id" {
  type        = string
  description = "The Cloudflare Zone ID for validation record creation"
}

variable "subject_alternative_names" {
  type        = list(string)
  description = "Subject alternative names for the certificate"
  default     = []
}
