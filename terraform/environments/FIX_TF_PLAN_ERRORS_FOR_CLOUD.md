# When using Terraform Cloud for storage of the `terraform.tfstate` file

As it is now, if you run the command `terraform plan` or `terraform apply`, you might get an error that says:

```text
│ Error: Unreadable module directory
│
│ The directory  could not be read for module "security_groups" at
│ main.tf:50.
```

There are different ways to solve this error:

### 1. Set working_directory in HCP Terraform (Recommended)
In your HCP Terraform workspace settings, set the Terraform Working Directory to:
`environments/staging` or `environments/production` or `environments/global`

And make sure your VCS root is the repo root (`.`). This tells HCP Terraform to upload the entire repo but run Terraform from the subdirectory, so `../../modules` resolves correctly.

*Settings → General → Terraform Working Directory*

### 2. Use a terraform.tar.gz upload that includes modules
If you're triggering runs via CLI/API rather than VCS, use the `-chdir` flag or ensure your upload tarball includes the `modules/` directory.
HCP Terraform's CLI-driven runs upload only the current directory by default.

### 3. Publish modules to a registry
Put your modules in a private registry (e.g. Terraform Registry, GitHub Artifacts, or Artifactory) and reference them that way.
This is the most robust long-term solution for team environments.
e.g:
```hcl
module "vpc" {
  source  = "app.terraform.io/free9ja_team/vpc/aws"
  version = "1.0.0"
  # ...
}
```

### 4. Allow terraform store the tfstate but execute the plan locally on your system (this is the one i used)
Go to the workspace
**Settings -> General :**
- Execution mode: Local (custom)
- Remote state sharing: Share with all workspaces in this organization

**Note:**
I used option 4.
