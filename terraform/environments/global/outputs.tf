output "oidc_provider_arn" {
  value       = aws_iam_openid_connect_provider.github.arn
  description = "The ARN of the IAM OIDC Provider for GitHub Actions"
}
