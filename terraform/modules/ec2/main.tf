resource "aws_key_pair" "ec2" {
  key_name   = "${var.website}-${var.environment}-key"
  public_key = var.ssh_public_key
}

# Security Group for the EC2 Instance
resource "aws_security_group" "ec2" {
  name        = "${var.website}-${var.environment}-sg"
  description = "Allows SSH, HTTP, and HTTPS ingress access"
  vpc_id      = var.vpc_id

  # SSH Access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
  }

  # HTTP Access
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS Access
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress (Outbound) - allow all
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.website}-${var.environment}-sg"
    Environment = var.environment
  }
}

# IAM Role for EC2 Instance to pull images from ECR and enable SSM
resource "aws_iam_role" "ec2_role" {
  name = "${var.website}-${var.environment}-ec2-role"

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

# Allows the EC2 instance to pull Docker images from AWS Elastic Container Registry (ECR).
# This is needed if your application runs in Docker containers hosted on ECR.
resource "aws_iam_role_policy_attachment" "ecr_read" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# Grants the EC2 instance permissions to be managed by AWS Systems Manager (SSM).
# This allows you to securely access the instance via SSM Session Manager without needing SSH keys or open inbound ports.
resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Grants the EC2 instance permission to read the Cloudflare certificates from SSM Parameter Store
resource "aws_iam_role_policy" "ssm_read_certs" {
  name = "${var.website}-${var.environment}-ssm-read-certs"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = [
          aws_ssm_parameter.cf_cert.arn,
          aws_ssm_parameter.cf_key.arn
        ]
      }
    ]
  })
}

# Creates the Instance Profile, which is a container for an IAM role that you can use to pass the role information to an EC2 instance when the instance starts.
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.website}-${var.environment}-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# Fetch the latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  owners      = ["amazon"]
  most_recent = true

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

# Provision the EC2 instance
resource "aws_instance" "app" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = var.instance_type
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [aws_security_group.ec2.id]
  key_name                    = aws_key_pair.ec2.key_name
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name

  # adds a custom volume block size, the default is 2GB which is not enough to run the docker-container
  # with all our images including the api-service, ip-service, redis, postgres
  root_block_device {
    volume_size           = var.ec2_root_volume_size
    volume_type           = "gp3"
    delete_on_termination = true
  }

  # Render user_data using templatefile
  user_data = templatefile("${path.module}/templates/user_data.sh", {
    compose_version        = var.compose_version
    website                = var.website
    environment            = var.environment
    db_name                = var.db_name
    db_user                = var.db_user
    db_password            = var.db_password
    ecr_api_repo_url       = var.ecr_api_repo_url
    ecr_ip_repo_url        = var.ecr_ip_repo_url
    jwt_secret             = var.jwt_secret
    jwt_access_expiration  = var.jwt_access_expiration
    jwt_refresh_expiration = var.jwt_refresh_expiration
    run_migrations         = var.run_migrations
    backend_subdomain      = var.backend_subdomain
    ip_subdomain           = var.ip_subdomain
    domain_name            = var.domain_name
    aws_region             = var.aws_region
    cf_cert_param          = aws_ssm_parameter.cf_cert.name
    cf_key_param           = aws_ssm_parameter.cf_key.name
  })

  # lifecycle {
  #   ignore_changes = [
  #     # Ignore changes to user_data after creation so we don't restart the container on every TF apply
  #     user_data,
  #   ]
  # }

  tags = {
    Name        = "${var.website}-${var.environment}-ec2"
    Environment = var.environment
  }
}

# Static public Elastic IP address for the EC2 instance
resource "aws_eip" "app_eip" {
  domain = "vpc"

  tags = {
    Name        = "${var.website}-${var.environment}-eip"
    Environment = var.environment
  }
}

# Associate Elastic IP with EC2 Instance
resource "aws_eip_association" "app_eip_assoc" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app_eip.id
}

# Fetch subnet details to get the Availability Zone for the EBS volume
data "aws_subnet" "selected" {
  id = var.subnet_id
}

# Persistent EBS volume for database data
resource "aws_ebs_volume" "data" {
  availability_zone = data.aws_subnet.selected.availability_zone
  size              = var.ebs_data_volume_size
  type              = "gp3"

  tags = {
    Name        = "${var.website}-${var.environment}-data-vol"
    Environment = var.environment
  }
}

# Attach the EBS volume to the EC2 instance
resource "aws_volume_attachment" "data_att" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.data.id
  instance_id = aws_instance.app.id
}

# aws_ssm_parameter (AWS Systems Manager Parameter Store): is a service in aws that allows you to store parameters
# These parameters can be used to store sensitive information such as passwords, API keys, and other secrets
# It is a managed service provided by AWS and is highly available and secure
# it has 2 types: string and SecureString. SecureString is encrypted using AWS Key Management Service (KMS).
# when getting a SecureString parameter, you need to decrypt it using the decrypt parameter API or SDK
#
# Below we use the SSM Parameter Store to store the Cloudflare Origin CA Certificate and Private Key
resource "aws_ssm_parameter" "cf_cert" {
  name        = "/${var.website}/${var.environment}/cloudflare_origin_cert"
  description = "Cloudflare Origin CA Certificate"
  type        = "SecureString"
  value       = var.cloudflare_origin_cert
}

# Securely store the Cloudflare Origin CA Private Key
resource "aws_ssm_parameter" "cf_key" {
  name        = "/${var.website}/${var.environment}/cloudflare_origin_key"
  description = "Cloudflare Origin CA Private Key"
  type        = "SecureString"
  value       = var.cloudflare_private_key
}
