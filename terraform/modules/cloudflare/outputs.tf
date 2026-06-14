output "frontend_url" {
  value       = length(cloudflare_workers_custom_domain.frontend) > 0 ? "https://${cloudflare_workers_custom_domain.frontend[0].hostname}" : null
  description = "The custom domain URL for the frontend"
}


output "backend_url" {
  value       = "https://${var.backend_subdomain}.${var.domain_name}"
  description = "The custom URL of the backend API"
}
