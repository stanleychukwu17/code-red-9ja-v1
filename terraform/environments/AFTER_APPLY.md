# Post-Apply Steps

After you run `terraform apply`, you'll get the following outputs:

```text
  + acm_certificate_arn     = (known after apply)
  + alb_dns_name            = (known after apply)
  + backend_url             = "https://staging-api.free9ja.com" or "https://api.free9ja.com"
  + ecr_repository_url      = "805149720028.dkr.ecr.af-south-1.amazonaws.com/free9ja-staging-api"
  + ecs_cluster_name        = "free9ja-staging-cluster"
  + ecs_service_name        = "free9ja-staging-api-service"
  + github_actions_role_arn = (known after apply)
  + rds_db_endpoint         = (known after apply)
  + redis_endpoint          = (known after apply)
  + vpc_id                  = (known after apply)
```

## Next Steps

Copy the `github_actions_role_arn` to your GitHub secrets and add it to:
- `AWS_ROLE_ARN_PRODUCTION`
- `AWS_ROLE_ARN_STAGING`

> [!NOTE] 

> you may not always need to copy and paste after each `terraform apply`. 
> This may not be needed, because the role ARN usually stays the same.
