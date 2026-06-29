# --- Data Source for OIDC Provider (Created Globally) ---
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

locals {
  github_provider_arn = data.aws_iam_openid_connect_provider.github.arn
}

# --- GitHub Actions Deployment IAM Role ---
resource "aws_iam_role" "github_actions" {
  name        = "${var.website}-${var.environment}-github-actions-role"
  description = "IAM Role assumed by GitHub Actions for deploying ${var.environment} environment"

  # The trust policy that grants GitHub Actions permission to assume this role.
  # We use OIDC (OpenID Connect) to avoid storing long-lived AWS credentials in GitHub secrets.
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"

        # The Principal is the Shared GitHub OIDC Identity Provider (created globally)
        Principal = {
          Federated = local.github_provider_arn
        }

        # This action allows the OIDC token from GitHub to be exchanged for temporary AWS credentials
        Action = "sts:AssumeRoleWithWebIdentity"

        # Conditions are critical for security to prevent unauthorized access.
        Condition = {
          # Ensure the audience (aud) matches the official AWS STS endpoint
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          # Ensure that ONLY workflows running in our specific GitHub repository can assume this role.
          # The '*' allows any branch, tag, or environment within the repository to authenticate.
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
          }
        }
      }
    ]
  })
}

# --- Deployment Policy for ECR and ECS ---
resource "aws_iam_policy" "deploy" {
  name        = "${var.website}-${var.environment}-github-deploy-policy"
  description = "Allows GitHub Actions to push images to ECR and deploy tasks to ECS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # ECR Authorization Token (Must be * for global login)
      {
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      # ECR Image upload permissions restricted to our repository
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:CompleteLayerUpload",
          "ecr:GetDownloadUrlForLayer",
          "ecr:InitiateLayerUpload",
          "ecr:PutImage",
          "ecr:UploadLayerPart"
        ]
        Resource = concat(var.ecr_repository_arn != "" ? [var.ecr_repository_arn] : [], var.ecr_repository_arns)
      },
      # ECS Service deploy permissions
      {
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices"
        ]
        Resource = var.ecs_service_arn != "" ? var.ecs_service_arn : "*"
      },
      # Task Definition registration (needed for ECS deployment)
      {
        Effect = "Allow"
        Action = [
          "ecs:RegisterTaskDefinition",
          "ecs:DescribeTaskDefinition",
          "ecs:ListTaskDefinitions"
        ]
        Resource = "*"
      },
      # PassRole permission so ECS can assume task roles
      {
        Effect   = "Allow"
        Action   = "iam:PassRole"
        Resource = "arn:aws:iam::*:role/${var.website}-${var.environment}-ecs-*"
      },
      # SSM Run Command permissions for EC2 staging deployment
      {
        Effect = "Allow"
        Action = [
          "ssm:SendCommand",
          "ssm:GetCommandInvocation"
        ]
        Resource = "*"
      },
      # EC2 description permissions to find instances by tags
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances"
        ]
        Resource = "*"
      }
    ]
  })
}

# --- Attach Policy to Role ---
# Attach the deployment policy created above to the GitHub Actions IAM role
resource "aws_iam_role_policy_attachment" "deploy" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.deploy.arn
}
