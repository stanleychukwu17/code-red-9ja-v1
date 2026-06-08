output "pages_project_name" {
  value       = cloudflare_pages_project.frontend.name
  description = "The name of the Cloudflare Pages project"
}

output "pages_subdomain" {
  value       = cloudflare_pages_project.frontend.subdomain
  description = "The pages.dev subdomain assigned to the project"
}

output "frontend_url" {
  value       = "https://${cloudflare_pages_domain.frontend.name}"
  description = "The custom URL of the frontend"
}

output "backend_url" {
  value       = "https://${var.backend_subdomain}.${var.domain_name}"
  description = "The custom URL of the backend API"
}
