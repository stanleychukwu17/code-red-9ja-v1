# AWS OIDC & Secrets Setup Guide

This guide explains how to configure **AWS OpenID Connect (OIDC)** and define the required repository secrets in GitHub to run the CI/CD pipelines.

---

## 🔐 How OIDC Works (No Long-Lived Credentials)

Traditionally, to deploy to AWS from GitHub Actions, you had to save static `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` credentials in GitHub secrets. If these keys were compromised, attackers could access your AWS account.

With **OIDC (OpenID Connect)**:
1. GitHub Actions requests a short-lived JSON Web Token (JWT) from GitHub's OIDC provider.
2. The workflow sends this JWT to AWS Security Token Service (STS).
3. AWS STS validates that the JWT is authentic, checks that it matches your repository and branch rules, and returns temporary security credentials (valid for 1 hour).
4. GitHub Actions uses these temporary keys for the rest of the job.

---

## 🚀 Steps to Bootstrap & Deploy

### Step 1: Run Terraform Locally First (Or via HCP Terraform)

To create the IAM roles and OIDC trust, you should run Terraform to provision the infrastructure.

1. Create a workspace in [HCP Terraform (Terraform Cloud)](https://app.terraform.io/).
2. Get your HCP Terraform Token and save it in your GitHub repository secrets as `TF_API_TOKEN`.
3. Provide your environment variables in HCP Terraform or your local command line (`db_password`, `jwt_secret`, `cloudflare_api_token`, `cloudflare_account_id`, `cloudflare_zone_id`, `domain_name`).
4. Run `terraform apply` for `terraform/environments/staging` and `terraform/environments/production`.
5. Note the output values for `github_actions_role_arn`.

---

### Step 2: Configure GitHub Repository Secrets

Go to your GitHub repository -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**, and create the following secrets:

| Secret Name | Description | Example / Source |
|-------------|-------------|------------------|
| `TF_API_TOKEN` | Token to authenticate Terraform with HCP Terraform | E.g. `pSg...` from HCP user settings |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token with Pages/DNS permissions | E.g. `zXy...` from Cloudflare profile |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID | Found in Cloudflare Pages dashboard URL |
| `AWS_ROLE_ARN_STAGING` | The IAM Role ARN for staging backend deployment | Outputted by Staging Terraform `github_actions_role_arn` |
| `AWS_ROLE_ARN_PRODUCTION` | The IAM Role ARN for production backend deployment | Outputted by Production Terraform `github_actions_role_arn` |

---

## 🔍 Customizing Branch Restrictions (Optional)

In our OIDC Terraform modules, the trust policy is defined as:
```hcl
"token.actions.githubusercontent.com:sub" = "repo:stanleychukwu17/code-red-9ja-v1:*"
```
This allows deployments to be triggered from any branch. 

To restrict production deployments to only run from the `main` branch, you can customize the OIDC module or trust conditions for the production IAM role to:
```hcl
"token.actions.githubusercontent.com:sub" = "repo:stanleychukwu17/code-red-9ja-v1:ref:refs/heads/main"
```
This is a standard security hardening practice for production environments!
