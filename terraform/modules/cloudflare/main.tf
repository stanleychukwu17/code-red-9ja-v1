terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = ">= 5.0"
    }
  }
}

# --- Cloudflare Pages Project (Direct Upload) ---
resource "cloudflare_pages_project" "frontend" {
  account_id        = var.cloudflare_account_id
  name              = "free9ja-${var.environment}-web"
  production_branch = var.production_branch

  # Uses Wrangler in GitHub Actions for direct uploads, no source block needed
}

# --- Custom Domain for Pages Frontend ---
resource "cloudflare_pages_domain" "frontend" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.frontend.name
  name         = var.frontend_subdomain == "" ? var.domain_name : "${var.frontend_subdomain}.${var.domain_name}"
}

# CNAME record pointing the frontend subdomain to Pages dev subdomain
resource "cloudflare_dns_record" "frontend_cname" {
  name    = var.frontend_subdomain == "" ? "@" : var.frontend_subdomain
  zone_id = var.cloudflare_zone_id
  # content = cloudflare_pages_project.frontend.subdomain
  content = "${cloudflare_pages_project.frontend.name}.pages.dev" # gemini says its better than above "content"
  type    = "CNAME"
  proxied = true
  comment = "Managed by Terraform, frontend → Pages project"
  ttl     = 1 # ttl is ignored by Cloudflare when proxied = true
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

# Cloudflare SSL settings: Since the Cloudflare API token is scoped to DNS and Pages only, we will comment out the cloudflare_zone_setting.ssl_strict resource in Terraform. We recommend that you manually set the SSL/TLS Encryption mode to Full (Strict) directly via the Cloudflare Dashboard: Dashboard → SSL/TLS → Overview → Full (Strict).
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
