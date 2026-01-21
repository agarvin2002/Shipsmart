# ShipSmart AI API - ECS Fargate Module
# Purpose: Container orchestration with Fargate, including task definitions, services, and IAM

# ========================================
# ECS CLUSTER
# ========================================

resource "aws_ecs_cluster" "main" {
  name = "shipsmart-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "shipsmart-${var.environment}-cluster"
    Environment = var.environment
  }
}

# ========================================
# CLOUDWATCH LOG GROUP
# ========================================

resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/shipsmart-${var.environment}"
  retention_in_days = var.environment == "production" ? 30 : 7

  tags = {
    Name        = "shipsmart-${var.environment}-logs"
    Environment = var.environment
  }
}

# ========================================
# IAM ROLES
# ========================================

# ECS Task Execution Role (for pulling images, writing logs, reading secrets)
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "shipsmart-${var.environment}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })

  tags = {
    Name        = "shipsmart-${var.environment}-ecs-task-execution-role"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role (for application permissions: S3, etc.)
resource "aws_iam_role" "ecs_task_role" {
  name = "shipsmart-${var.environment}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })

  tags = {
    Name        = "shipsmart-${var.environment}-ecs-task-role"
    Environment = var.environment
  }
}

# S3 access for config files
resource "aws_iam_role_policy" "s3_access" {
  name = "s3-config-access"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:ListBucket"
      ]
      Resource = [
        "arn:aws:s3:::shipsmart-config",
        "arn:aws:s3:::shipsmart-config/*"
      ]
    }]
  })
}

# ========================================
# SECRETS MANAGER
# ========================================

resource "aws_secretsmanager_secret" "db_password" {
  name = "shipsmart-${var.environment}-db-password"

  tags = {
    Name        = "shipsmart-${var.environment}-db-password"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.db_password
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "shipsmart-${var.environment}-jwt-secret"

  tags = {
    Name        = "shipsmart-${var.environment}-jwt-secret"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret
}

resource "aws_secretsmanager_secret" "encryption_key" {
  name = "shipsmart-${var.environment}-encryption-key"

  tags = {
    Name        = "shipsmart-${var.environment}-encryption-key"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "encryption_key" {
  secret_id     = aws_secretsmanager_secret.encryption_key.id
  secret_string = var.encryption_key
}

# Grant ECS task execution role permission to read secrets
resource "aws_iam_role_policy" "secrets_access" {
  name = "secrets-access"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue"
      ]
      Resource = [
        aws_secretsmanager_secret.db_password.arn,
        aws_secretsmanager_secret.jwt_secret.arn,
        aws_secretsmanager_secret.encryption_key.arn
      ]
    }]
  })
}

# ========================================
# SECURITY GROUP
# ========================================

resource "aws_security_group" "ecs_tasks" {
  name        = "shipsmart-${var.environment}-ecs-tasks-sg"
  description = "Security group for ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  ingress {
    description     = "API from ALB"
    from_port       = 3000
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  ingress {
    description     = "Bull Arena from ALB"
    from_port       = 3050
    to_port         = 3050
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "shipsmart-${var.environment}-ecs-tasks-sg"
    Environment = var.environment
  }
}

# ========================================
# ECS TASK DEFINITION
# ========================================

resource "aws_ecs_task_definition" "api" {
  family                   = "shipsmart-${var.environment}-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory

  execution_role_arn = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn      = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([{
    name  = "shipsmart-api"
    image = "${var.ecr_repository_url}:${var.image_tag}"

    portMappings = [
      {
        containerPort = 80
        protocol      = "tcp"
      },
      {
        containerPort = 3000
        protocol      = "tcp"
      },
      {
        containerPort = 3050
        protocol      = "tcp"
      }
    ]

    environment = [
      {
        name  = "NODE_ENV"
        value = var.environment
      },
      {
        name  = "DATABASE_HOST"
        value = split(":", var.db_endpoint)[0]
      },
      {
        name  = "DATABASE_NAME"
        value = var.db_name
      },
      {
        name  = "DATABASE_USER"
        value = var.db_username
      },
      {
        name  = "REDIS_HOST"
        value = var.redis_endpoint
      },
      {
        name  = "REDIS_PORT"
        value = tostring(var.redis_port)
      },
      {
        name  = "AWS_REGION"
        value = "us-east-1"
      }
    ]

    secrets = [
      {
        name      = "DATABASE_PASSWORD"
        valueFrom = aws_secretsmanager_secret.db_password.arn
      },
      {
        name      = "JWT_SECRET"
        valueFrom = aws_secretsmanager_secret.jwt_secret.arn
      },
      {
        name      = "ENCRYPTION_KEY"
        valueFrom = aws_secretsmanager_secret.encryption_key.arn
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
        "awslogs-region"        = "us-east-1"
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost/api/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])

  tags = {
    Name        = "shipsmart-${var.environment}-task"
    Environment = var.environment
  }
}

# ========================================
# ECS SERVICE
# ========================================

resource "aws_ecs_service" "api" {
  name            = "shipsmart-${var.environment}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "shipsmart-api"
    container_port   = 80
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  # Wait for ALB to be ready
  depends_on = [var.target_group_arn]

  tags = {
    Name        = "shipsmart-${var.environment}-service"
    Environment = var.environment
  }
}
