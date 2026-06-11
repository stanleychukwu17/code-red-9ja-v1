# Global Terraform Environment

This directory contains the Terraform configuration for globally shared AWS resources that are used across all other environments (e.g., staging, production).

## Current Infrastructure

This environment currently provisions the following global resources:
- **Shared AWS OIDC GitHub Identity Provider**: Used to allow GitHub Actions workflows to authenticate to AWS securely using OpenID Connect (OIDC) without long-lived credentials.

## State and Current Status

> [!NOTE]
> The configuration in `main.tf` **has already been applied**. 

To view the currently provisioned resources in this environment, you can run:

```bash
terraform state list
```
