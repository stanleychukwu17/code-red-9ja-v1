resource "aws_key_pair" "bastion_key" {
  count      = var.enable_bastion ? 1 : 0
  key_name   = "${var.website}-${var.environment}-bastion-key"
  public_key = var.ssh_public_key
}

# Security Group for the Bastion Host
resource "aws_security_group" "bastion" {
  count       = var.enable_bastion ? 1 : 0
  name        = "${var.website}-${var.environment}-bastion-sg"
  description = "Allows SSH ingress access"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.website}-${var.environment}-bastion-sg"
    Environment = var.environment
  }
}

# Attach ingress rule to the RDS SG to allow PG traffic from the Bastion SG
resource "aws_security_group_rule" "rds_from_bastion" {
  count                    = var.enable_bastion ? 1 : 0
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = var.rds_security_group_id
  source_security_group_id = aws_security_group.bastion[0].id
}

# Attach ingress rule to the Redis SG to allow Redis traffic from the Bastion SG
resource "aws_security_group_rule" "redis_from_bastion" {
  count                    = var.enable_bastion ? 1 : 0
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = var.redis_security_group_id
  source_security_group_id = aws_security_group.bastion[0].id
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

# Provision the EC2 instance in the public subnet
resource "aws_instance" "bastion" {
  count                       = var.enable_bastion ? 1 : 0
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = var.instance_type
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [aws_security_group.bastion[0].id]
  key_name                    = aws_key_pair.bastion_key[0].key_name
  associate_public_ip_address = true

  tags = {
    Name        = "${var.website}-${var.environment}-bastion"
    Environment = var.environment
  }
}
