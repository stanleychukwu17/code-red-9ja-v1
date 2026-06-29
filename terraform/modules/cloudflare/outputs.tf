output "frontend_url" {
  value       = var.frontend_subdomain == "" || var.frontend_subdomain == null ? "https://${var.domain_name}" : "https://${var.frontend_subdomain}.${var.domain_name}"
  description = "The custom domain URL for the frontend"
}


output "backend_url" {
  value       = "https://${var.backend_subdomain}.${var.domain_name}"
  description = "The custom URL of the backend API"
}
