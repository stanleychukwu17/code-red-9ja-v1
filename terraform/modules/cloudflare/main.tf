terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = ">= 5.0"
    }
  }
}

# --- Custom Domain for Worker Frontend ---
# Uncomment the following block if you want to use a custom domain for the frontend
# but the wrangler.jsonc already handles the routing of subdomains to each of the deployed environments and works well with
# the github-actions ci/cd. But if you use terraform to provision the subdomain, then you have to always make sure
# that the "worker" already exists and is running in the account/zone. Otherwise, terraform will throw an error.
# resource "cloudflare_workers_custom_domain" "frontend" {
#   account_id = var.cloudflare_account_id
#   zone_id    = var.cloudflare_zone_id
#   hostname   = var.frontend_subdomain == "" ? var.domain_name : "${var.frontend_subdomain}.${var.domain_name}"
#   service    = "${var.website}-${var.environment}-web"
# }


# --- DNS records for AWS Backend API (Proxied through Cloudflare) ---
# Create CNAME record if alb_dns_name is provided (production/Fargate)
resource "cloudflare_dns_record" "backend_cname" {
  count   = var.alb_dns_name != "" && var.alb_dns_name != null ? 1 : 0
  name    = var.backend_subdomain
  zone_id = var.cloudflare_zone_id
  content = var.alb_dns_name
  type    = "CNAME"
  proxied = true
  comment = "Managed by Terraform, backend → AWS ALB (SSL: Full Strict)"
  ttl     = 1 # ttl is ignored by Cloudflare when proxied = true
}

# Create A record if backend_ip is provided (staging-api-v2/EC2)
resource "cloudflare_dns_record" "backend_a" {
  name    = var.backend_subdomain
  zone_id = var.cloudflare_zone_id
  content = var.backend_ip
  type    = "A"
  proxied = true
  comment = "Managed by Terraform, backend → AWS EC2 (SSL: Full Strict)"
  ttl     = 1
}

# Create A record for IP Service if ip_subdomain and ip_service_ip are provided
resource "cloudflare_dns_record" "ip_service_a" {
  name    = var.ip_subdomain
  zone_id = var.cloudflare_zone_id
  content = var.ip_service_ip
  type    = "A"
  proxied = true
  comment = "Managed by Terraform, ip-service → AWS EC2 (SSL: Full Strict)"
  ttl     = 1
}

