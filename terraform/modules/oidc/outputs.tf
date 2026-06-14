output "role_arn" {
  value       = aws_iam_role.github_actions.arn
  description = "The ARN of the IAM Role for GitHub Actions to assume"
}
