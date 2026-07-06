
output "backend_url" {
  value       = "https://${var.backend_subdomain}.${var.domain_name}"
  description = "The custom URL of the backend API"
}
