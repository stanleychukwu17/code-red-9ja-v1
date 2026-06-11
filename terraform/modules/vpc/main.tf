resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.website}-${var.environment}-vpc"
    Environment = var.environment
  }
}

# --- Subnets ---
# Public Subnets for ALBs
resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.website}-${var.environment}-public-${var.availability_zones[count.index]}"
    Environment = var.environment
  }
}

# Private Subnets for ECS Tasks
resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name        = "${var.website}-${var.environment}-private-${var.availability_zones[count.index]}"
    Environment = var.environment
  }
}

# Database & Cache Subnets (Isolated)
resource "aws_subnet" "database" {
  count             = length(var.database_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.database_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name        = "${var.website}-${var.environment}-database-${var.availability_zones[count.index]}"
    Environment = var.environment
  }
}

# --- Internet Gateway ---
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "${var.website}-${var.environment}-igw"
    Environment = var.environment
  }
}

# An EIP in AWS stands for Elastic IP address. It’s a static, public IPv4 address that you can  associate
# with resources like EC2 instances or NAT gateways. Unlike the default public IPs
# that AWS assigns (which can change when you stop/start an instance), an Elastic IP stays constant until you release it.
# NOTE - Aws charges $0.010 per Elastic IP address per hour when it is not associated with an instance. and 
# $0.00 per hour when it is associated with an instance. So if you are not using the Elastic IP, 
# it is advisable to release it to avoid unnecessary charges.
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name        = "${var.website}-${var.environment}-nat-eip"
    Environment = var.environment
  }
}

# --- NAT Gateway (Single for cost efficiency) ---
resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id # Place in the first public subnet

  tags = {
    Name        = "${var.website}-${var.environment}-nat-gw"
    Environment = var.environment
  }

  depends_on = [aws_internet_gateway.igw]
}

# --- Route Tables ---
# Public route table (Internet through IGW)
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name        = "${var.website}-${var.environment}-public-rt"
    Environment = var.environment
  }
}

# Private route table (Internet through NAT Gateway)
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }

  tags = {
    Name        = "${var.website}-${var.environment}-private-rt"
    Environment = var.environment
  }
}

# Database route table (Isolated - No internet access)
resource "aws_route_table" "database" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "${var.website}-${var.environment}-database-rt"
    Environment = var.environment
  }
}

# --- Route Table Associations ---
resource "aws_route_table_association" "public" {
  count          = length(var.public_subnet_cidrs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(var.private_subnet_cidrs)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "database" {
  count          = length(var.database_subnet_cidrs)
  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = aws_route_table.database.id
}

# --- Subnet Groups ---
resource "aws_db_subnet_group" "rds" {
  name        = "${var.website}-${var.environment}-rds-subnet-group"
  subnet_ids  = aws_subnet.database[*].id
  description = "RDS Database subnet group"

  tags = {
    Name        = "${var.website}-${var.environment}-rds-subnet-group"
    Environment = var.environment
  }
}

resource "aws_elasticache_subnet_group" "redis" {
  name        = "${var.website}-${var.environment}-redis-subnet-group"
  subnet_ids  = aws_subnet.database[*].id
  description = "ElastiCache Redis subnet group"

  tags = {
    Name        = "${var.website}-${var.environment}-redis-subnet-group"
    Environment = var.environment
  }
}
