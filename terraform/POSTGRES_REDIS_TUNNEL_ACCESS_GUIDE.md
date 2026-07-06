# Accessing Private PostgreSQL & Redis in AWS

This guide explains how to connect local GUI clients (**DBeaver** and **Redis Insight**) to the private RDS PostgreSQL and ElastiCache Redis instances configured in this Terraform setup.

## The Challenge
* **PostgreSQL** ([modules/rds/main.tf](modules/rds/main.tf)) and **Redis** ([modules/elasticache/main.tf](modules/elasticache/main.tf)) are placed inside isolated database subnets ([modules/vpc/main.tf](modules/vpc/main.tf)).
* They have no direct internet access (`publicly_accessible = false` on RDS).
* Their security groups ([modules/security_groups/main.tf](modules/security_groups/main.tf)) restrict traffic exclusively to ECS tasks.

Below are the two recommended approaches to enable connection.

---

## Solution 1: SSH Bastion Host (Traditional & Simpler Setup in GUI) (this is the one i used)

This approach deploys a lightweight, public-facing EC2 instance (a "Bastion") in one of your public subnets. This instance acts as a secure jump box.

### 1. Terraform Infrastructure Configuration

Add the following code to your staging environment (e.g., inside `environments/staging/bastion.tf` or directly in [environments/staging/main.tf](environments/staging/main.tf)):

```hcl
# 1. SSH Key Pair (ensure your public key is added to AWS)
resource "aws_key_pair" "bastion_key" {
  key_name   = "free9ja-${var.environment}-bastion-key"
  public_key = file("~/.ssh/id_rsa.pub") # Path to your local public SSH key
}

# 2. Bastion Security Group
resource "aws_security_group" "bastion" {
  name        = "free9ja-${var.environment}-bastion-sg"
  description = "Allows SSH ingress from developer IP"
  vpc_id      = module.vpc.vpc_id

  # Ingress: Allow SSH ONLY from your public IP address for security
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["YOUR_LOCAL_IP/32"] # Replace with your public IP address
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 3. Security Group Rules allowing RDS & Redis to accept traffic from Bastion
resource "aws_security_group_rule" "rds_from_bastion" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = module.security_groups.rds_security_group_id
  source_security_group_id = aws_security_group.bastion.id
}

resource "aws_security_group_rule" "redis_from_bastion" {
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = module.security_groups.redis_security_group_id
  source_security_group_id = aws_security_group.bastion.id
}

# 4. Fetch the latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

# 5. Launch Bastion EC2 Instance in a Public Subnet
resource "aws_instance" "bastion" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = "t3.nano" # Low cost
  subnet_id                   = module.vpc.public_subnet_ids[0] # First public subnet
  vpc_security_group_ids      = [aws_security_group.bastion.id]
  key_name                    = aws_key_pair.bastion_key.key_name
  associate_public_ip_address = true

  tags = {
    Name        = "free9ja-${var.environment}-bastion"
    Environment = var.environment
  }
}

# Output Bastion IP
output "bastion_public_ip" {
  value = aws_instance.bastion.public_ip
}
```

---

### 2. Client Connection Instructions (SSH Bastion)

#### DBeaver Configuration
1. **Create a new PostgreSQL Connection** in DBeaver.
2. In the **Main** tab:
   * **Host**: Your RDS endpoint (e.g., `free9ja-staging-db.xxxxxx.us-east-1.rds.amazonaws.com`).
   * **Database**: Your DB name.
   * **Username / Password**: Your DB credentials.
3. Switch to the **SSH** tab:
   * Check **Use SSH Tunnel**.
   * **Host/IP**: Paste your `bastion_public_ip` output.
   * **Port**: `22`.
   * **Username**: `ec2-user`.
   * **Authentication Method**: `Private Key`.
   * **Private Key**: Browse to your local private key (e.g., `~/.ssh/id_rsa`).
4. Click **Test Connection** and save.

#### Redis Insight Configuration
1. Click **Add Database**.
2. **Host**: Your ElastiCache endpoint (e.g., `free9ja-staging-redis.xxxxxx.0001.use1.cache.amazonaws.com`).
3. **Port**: `6379`.
4. Toggle on **Use SSH Tunneling**:
   * **SSH Host**: Your `bastion_public_ip`.
   * **SSH Port**: `22`.
   * **SSH Username**: `ec2-user`.
   * **Authentication**: Private Key (Upload your private SSH key file).
5. Click **Add Database**.

---

## Solution 2: AWS SSM Port Forwarding (Most Secure & Best Practice)

With AWS Systems Manager (SSM) Session Manager, you launch an EC2 instance inside a **private subnet** and keep port `22` (SSH) **completely closed**. Access is authenticated via your AWS CLI credentials using IAM policies, which avoids exposing keys or SSH ports.

### 1. Terraform Infrastructure Configuration

Add the following code to your environment:

```hcl
# 1. IAM Role & Profile for SSM Jump Instance
resource "aws_iam_role" "ssm_role" {
  name = "free9ja-${var.environment}-ssm-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_attach" {
  role       = aws_iam_role.ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_profile" {
  name = "free9ja-${var.environment}-ssm-profile"
  role = aws_iam_role.ssm_role.name
}

# 2. SSM Jump Host Security Group (No Ingress Rules needed!)
resource "aws_security_group" "ssm_jump" {
  name        = "free9ja-${var.environment}-ssm-jump-sg"
  vpc_id      = module.vpc.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 3. Security Group Rules allowing RDS & Redis to accept traffic from SSM Jump Host
resource "aws_security_group_rule" "rds_from_ssm" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = module.security_groups.rds_security_group_id
  source_security_group_id = aws_security_group.ssm_jump.id
}

resource "aws_security_group_rule" "redis_from_ssm" {
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = module.security_groups.redis_security_group_id
  source_security_group_id = aws_security_group.ssm_jump.id
}

# 4. Fetch the latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

# 5. Launch Private SSM EC2 Instance
resource "aws_instance" "ssm_jump" {
  ami                  = data.aws_ami.amazon_linux.id
  instance_type        = "t3.nano"
  subnet_id            = module.vpc.private_subnet_ids[0] # Inside Private Subnet
  vpc_security_group_ids = [aws_security_group.ssm_jump.id]
  instance_profile     = aws_iam_instance_profile.ssm_profile.name

  tags = {
    Name        = "free9ja-${var.environment}-ssm-jump"
    Environment = var.environment
  }
}

output "ssm_jump_instance_id" {
  value = aws_instance.ssm_jump.id
}
```

---

### 2. Launching Tunnels from Local Machine (SSM)

To use SSM, ensure you have the **AWS CLI** and the **Session Manager Plugin** installed on your local computer.

1. **For PostgreSQL (DBeaver)**, run the following command in a terminal:
   ```powershell
   aws ssm start-session `
     --target "INSTANCE_ID" `
     --document-name AWS-StartPortForwardingSessionToRemoteHost `
     --parameters '{"host":["YOUR_RDS_ENDPOINT"],"portNumber":["5432"],"localPortNumber":["5432"]}'
   ```
   *(Keep this terminal window open while you work).*

2. **For Redis (Redis Insight)**, run this command in a separate terminal:
   ```powershell
   aws ssm start-session `
     --target "INSTANCE_ID" `
     --document-name AWS-StartPortForwardingSessionToRemoteHost `
     --parameters '{"host":["YOUR_REDIS_ENDPOINT"],"portNumber":["6379"],"localPortNumber":["6379"]}'
   ```
   *(Keep this terminal window open while you work).*

*Note: Replace `INSTANCE_ID`, `YOUR_RDS_ENDPOINT`, and `YOUR_REDIS_ENDPOINT` with your actual values from the terraform output.*

---

### 3. Client Connection Instructions (SSM)

Since the tunnels map the remote ports directly to your local computer, point your GUI clients directly to `localhost`:

* **DBeaver Connection**:
  * **Host**: `localhost`
  * **Port**: `5432`
  * **Database / Username / Password**: Use your actual DB credentials.
  * *Leave the SSH tab disabled.*

* **Redis Insight Connection**:
  * **Host**: `localhost`
  * **Port**: `6379`
  * *Leave SSH Tunneling disabled.*
