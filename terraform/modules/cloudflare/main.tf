terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = ">= 5.0"
    }
  }
}

# --- Custom Domain for Worker Frontend ---
resource "cloudflare_workers_custom_domain" "frontend" {
  count      = var.create_frontend_domain ? 1 : 0
  account_id = var.cloudflare_account_id
  zone_id    = var.cloudflare_zone_id
  hostname   = var.frontend_subdomain == "" ? var.domain_name : "${var.frontend_subdomain}.${var.domain_name}"
  service    = "${var.website}-${var.environment}-web"
}

# --- CNAME record for AWS Backend API (Proxied through Cloudflare) ---
resource "cloudflare_dns_record" "backend_cname" {
  name    = var.backend_subdomain
  zone_id = var.cloudflare_zone_id
  content = var.alb_dns_name
  type    = "CNAME"
  proxied = true
  comment = "Managed by Terraform, backend → AWS ALB (SSL: Full Strict)"
  ttl     = 1 # ttl is ignored by Cloudflare when proxied = true
}

# Cloudflare SSL settings: Since the Cloudflare API token is scoped to DNS and Pages only, we will comment out the
# cloudflare_zone_setting.ssl_strict resource in Terraform. We recommend that you manually set the
# SSL/TLS Encryption mode to Full (Strict) directly via the Cloudflare Dashboard:
# Domain-name Dashboard → SSL/TLS → Overview → {click configure button} → Full (Strict). (i did automatic SSL/TLS)
# resource "cloudflare_zone_setting" "ssl_strict" {
#   zone_id    = var.cloudflare_zone_id
#   setting_id = "ssl"
#   value      = "strict"
# }
# removed {
#   from = cloudflare_zone_setting.ssl_strict

#   lifecycle {
#     destroy = false
#   }
# }
