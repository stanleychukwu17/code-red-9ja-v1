# --- Elastic Container Registry ---
resource "aws_ecr_repository" "api" {
  name                 = "${var.website}-${var.environment}-${var.service_name}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
  }
}

# --- CloudWatch Logs ---
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.website}-${var.environment}-${var.service_name}"
  retention_in_days = 14

  tags = {
    Environment = var.environment
  }
}

# --- ECS (Elastic Container Service ) Cluster ---
resource "aws_ecs_cluster" "main" {
  name = "${var.website}-${var.environment}-cluster"

  tags = {
    Environment = var.environment
  }
}

# --- IAM Roles ---
# Task Execution Role (Required by ECS agent to pull images and push logs)
resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.website}-${var.environment}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Task Role (Permissions for the application itself)
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.website}-${var.environment}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# --- Task Definition ---
resource "aws_ecs_task_definition" "api" {
  family                   = "${var.website}-${var.environment}-${var.service_name}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_cpu
  memory                   = var.ecs_memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = var.service_name
      image     = "${aws_ecr_repository.api.repository_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = var.app_port
          hostPort      = var.app_port
        }
      ]

      environment = [
        { name = "PORT", value = tostring(var.app_port) },
        { name = "ENV", value = var.environment }, # Run Go app in production mode
        { name = "DB_HOST", value = var.db_host },
        { name = "DB_PORT", value = tostring(var.db_port) },
        { name = "DB_NAME", value = var.db_name },
        { name = "DB_USER", value = var.db_user },
        { name = "DB_PASSWORD", value = var.db_password },
        { name = "DB_SSLMODE", value = var.db_sslmode },
        { name = "REDIS_ADDR", value = "${var.redis_host}:${var.redis_port}" },
        { name = "REDIS_PORT", value = tostring(var.redis_port) },
        { name = "REDIS_PASSWORD", value = var.redis_password },
        { name = "IS_CI_CD", value = var.is_ci_cd },             # if true, it skips loading local .env file
        { name = "RUN_MIGRATIONS", value = var.run_migrations }, # if true, it runs database migrations on task start
        { name = "JWT_SECRET", value = var.jwt_secret },
        { name = "JWT_ACCESS_EXPIRATION", value = var.jwt_access_expiration },
        { name = "JWT_REFRESH_EXPIRATION", value = var.jwt_refresh_expiration }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = var.service_name
        }
      }
    }
  ])

  tags = {
    Environment = var.environment
  }
}

# --- ECS Service ---
resource "aws_ecs_service" "api" {
  name                              = "${var.website}-${var.environment}-${var.service_name}-service"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.api.arn
  desired_count                     = var.ecs_desired_count
  launch_type                       = "FARGATE"
  health_check_grace_period_seconds = 1200 # 20minutes

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.security_group_id]
    assign_public_ip = false # Fargate in private subnet has NAT for outgoing connection
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = var.service_name
    container_port   = var.app_port
  }

  # Ensure task definitions are not reset by terraform on subsequent code deployments
  lifecycle {
    ignore_changes = [task_definition]
  }

  tags = {
    Environment = var.environment
  }
}
