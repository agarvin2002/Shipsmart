# ShipSmart AI API - AWS Infrastructure Deployment Guide

This directory contains Terraform configurations for deploying the ShipSmart AI API to AWS using ECS Fargate, RDS PostgreSQL, ElastiCache Redis, and Application Load Balancer.

---

## 🚀 New to Terraform?

**Start here:** [Terraform Crash Course](../docs/terraform/TERRAFORM-CRASH-COURSE.md)

Learn Terraform and understand the entire ShipSmart infrastructure in **1-2 hours** (not weeks). This focused guide covers:
- Terraform basics (15 min)
- What we built and why (30 min)
- How to use it (15 min)
- How to explain it confidently to others

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Directory Structure](#directory-structure)
- [Initial Setup](#initial-setup)
- [Environment Configuration](#environment-configuration)
- [Deployment Steps](#deployment-steps)
- [Post-Deployment Tasks](#post-deployment-tasks)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Cost Estimates](#cost-estimates)
- [Maintenance](#maintenance)
- [Security Best Practices](#security-best-practices)

---

## Architecture Overview

```
Internet
    ↓
Route53 (DNS)
    ↓
ACM (SSL/TLS Certificate)
    ↓
Application Load Balancer (ALB)
    ├── HTTPS Listener (443) → Target Group
    └── HTTP Listener (80) → Redirect to HTTPS
    ↓
ECS Fargate Cluster
    └── Service (Fargate Tasks)
        └── Container: shipsmart-api
            ├── Nginx (Port 80/443)
            ├── PM2 Process Manager
            │   ├── API Server (3001)
            │   ├── Worker (background)
            │   └── Arena UI (3050)
            └── Node.js 22 Runtime
    ↓
External Services:
├── RDS PostgreSQL 14 (Multi-AZ in production)
├── ElastiCache Redis 7 (Multi-node in production)
├── S3 Bucket (configuration files)
└── ECR (Docker images)
```

### Key Design Decisions

- **Single-container architecture**: Nginx + Node.js + PM2 in one container for simplified deployment
- **ECS Fargate**: Serverless container orchestration (no EC2 management)
- **Multi-AZ production**: High availability with redundancy across availability zones
- **Private subnets**: ECS tasks, RDS, and Redis isolated from internet
- **Secrets Manager**: Secure storage for database passwords, JWT secrets, and encryption keys

---

## Prerequisites

### Required Tools

1. **Terraform** (v1.6 or higher)
   ```bash
   # macOS
   brew tap hashicorp/tap
   brew install hashicorp/tap/terraform

   # Linux
   wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
   echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
   sudo apt update && sudo apt install terraform

   # Verify
   terraform version
   ```

2. **AWS CLI** (v2)
   ```bash
   # macOS
   brew install awscli

   # Linux
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install

   # Verify
   aws --version
   ```

3. **Docker** (for building and pushing images to ECR)
   ```bash
   # macOS
   brew install --cask docker

   # Linux
   sudo apt-get update
   sudo apt-get install docker-ce docker-ce-cli containerd.io

   # Verify
   docker --version
   ```

### AWS Account Setup

1. **AWS Account**: Active AWS account with billing enabled
2. **IAM User**: Create IAM user with following permissions:
   - AdministratorAccess (or custom policy with ECS, RDS, ElastiCache, VPC, ALB, Route53, ACM, Secrets Manager, CloudWatch access)
3. **Access Keys**: Generate access key ID and secret access key
4. **Configure AWS CLI**:
   ```bash
   aws configure
   # AWS Access Key ID: <your-access-key>
   # AWS Secret Access Key: <your-secret-key>
   # Default region name: us-east-1
   # Default output format: json
   ```

### Domain and SSL Setup

1. **Domain Registration**: Register domain (e.g., shipsmart.com) or have existing domain
2. **Route53 Hosted Zone**: Create hosted zone in Route53
   ```bash
   aws route53 create-hosted-zone --name shipsmart.com --caller-reference $(date +%s)
   ```
3. **SSL Certificates**: Request certificates in ACM for:
   - Staging: `staging.shipsmart.com`
   - Production: `api.shipsmart.com`
   ```bash
   # Request certificate (DNS validation recommended)
   aws acm request-certificate \
     --domain-name staging.shipsmart.com \
     --validation-method DNS \
     --region us-east-1
   ```

---

## Directory Structure

```
terraform/
├── README.md                    # This file
├── .gitignore                   # Prevents committing sensitive files
├── shared/                      # Shared resources across environments
│   ├── backend.tf               # S3 backend for Terraform state
│   ├── ecr.tf                   # Docker image repository
│   └── s3.tf                    # Configuration file storage
├── modules/                     # Reusable Terraform modules
│   ├── vpc/                     # VPC with public/private subnets
│   ├── rds/                     # PostgreSQL database
│   ├── elasticache/             # Redis cluster
│   ├── alb/                     # Application Load Balancer
│   └── ecs/                     # ECS Fargate cluster and tasks
└── environments/                # Environment-specific configurations
    ├── staging/
    │   ├── main.tf              # Staging resources
    │   ├── variables.tf         # Variable definitions
    │   ├── outputs.tf           # Output values
    │   └── terraform.tfvars.example  # Configuration template
    └── production/
        ├── main.tf              # Production resources
        ├── variables.tf         # Variable definitions
        ├── outputs.tf           # Output values
        └── terraform.tfvars.example  # Configuration template
```

---

## Initial Setup

### Step 1: Create Terraform Backend (One-Time Setup)

The Terraform backend stores state files in S3 with DynamoDB locking for team collaboration.

```bash
cd terraform/shared

# Initialize Terraform
terraform init

# Review planned resources
terraform plan

# Create S3 bucket and DynamoDB table
terraform apply

# After successful creation, uncomment the backend configuration in backend.tf:
# terraform {
#   backend "s3" {
#     bucket         = "shipsmart-terraform-state"
#     key            = "infrastructure/terraform.tfstate"
#     region         = "us-east-1"
#     encrypt        = true
#     dynamodb_table = "terraform-state-lock"
#   }
# }

# Migrate state to S3
terraform init -migrate-state
```

### Step 2: Create ECR Repository and S3 Config Bucket

```bash
# Still in terraform/shared/

# Review ECR and S3 configurations
terraform plan

# Apply (creates ECR repository and S3 config bucket)
terraform apply

# Note the ECR repository URL from output
terraform output ecr_repository_url
# Example: 123456789012.dkr.ecr.us-east-1.amazonaws.com/shipsmart-api
```

### Step 3: Upload Configuration Files to S3

```bash
# From project root
cd config

# Upload environment-specific configs
aws s3 cp config.staging.json s3://shipsmart-config/config.staging.json
aws s3 cp config.production.json s3://shipsmart-config/config.production.json

# Verify upload
aws s3 ls s3://shipsmart-config/
```

### Step 4: Build and Push Initial Docker Image

Before deploying ECS, you need at least one Docker image in ECR.

```bash
# From project root
cd ..

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build staging image
docker build --build-arg NODE_ENV=staging -t shipsmart-api:staging .

# Tag image for ECR
docker tag shipsmart-api:staging <ecr-repository-url>:staging

# Push to ECR
docker push <ecr-repository-url>:staging

# For production
docker build --build-arg NODE_ENV=production -t shipsmart-api:latest .
docker tag shipsmart-api:latest <ecr-repository-url>:latest
docker push <ecr-repository-url>:latest
```

---

## Environment Configuration

### Staging Environment

1. **Copy template file**:
   ```bash
   cd terraform/environments/staging
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Generate secure passwords and keys**:
   ```bash
   # Database password (32+ characters)
   openssl rand -base64 32

   # JWT secret (48+ characters)
   openssl rand -base64 48

   # Encryption key (exactly 32 characters)
   openssl rand -hex 16
   ```

3. **Edit `terraform.tfvars`** with actual values:
   ```hcl
   aws_region = "us-east-1"
   image_tag  = "staging"

   # Secrets (use generated values above)
   db_username     = "shipsmart_admin"
   db_password     = "<generated-password>"
   jwt_secret      = "<generated-jwt-secret>"
   encryption_key  = "<generated-32-char-key>"

   # AWS Resources (get from AWS Console)
   certificate_arn   = "arn:aws:acm:us-east-1:123456789012:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   route53_zone_id   = "Z1234567890ABC"
   ```

4. **CRITICAL**: Verify `terraform.tfvars` is in `.gitignore`
   ```bash
   cat ../../../.gitignore | grep terraform.tfvars
   # Should see: *.tfvars
   ```

### Production Environment

**WARNING**: Use DIFFERENT secrets than staging. NEVER reuse passwords or keys.

1. **Copy template file**:
   ```bash
   cd terraform/environments/production
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Generate NEW secure passwords** (different from staging):
   ```bash
   openssl rand -base64 48  # db_password (longer for production)
   openssl rand -base64 64  # jwt_secret (longer for production)
   openssl rand -hex 16     # encryption_key (different key)
   ```

3. **Edit `terraform.tfvars`** with production values

4. **Store secrets in AWS Secrets Manager** (recommended for production):
   ```bash
   # Store database password
   aws secretsmanager create-secret \
     --name shipsmart-production-db-password \
     --secret-string "<generated-password>"

   # Store JWT secret
   aws secretsmanager create-secret \
     --name shipsmart-production-jwt-secret \
     --secret-string "<generated-jwt-secret>"
   ```

---

## Deployment Steps

### Deploy Staging Environment

```bash
cd terraform/environments/staging

# Initialize Terraform (first time only)
terraform init

# Validate configuration
terraform validate

# Review planned changes
terraform plan

# Apply infrastructure
terraform apply

# Type 'yes' when prompted
```

**Expected Duration**: 10-15 minutes

**What gets created**:
- VPC with 2 public and 2 private subnets across 2 AZs
- 2 NAT Gateways (one per AZ)
- Internet Gateway and route tables
- RDS PostgreSQL 14 (db.t3.small, single-AZ)
- ElastiCache Redis 7 (cache.t3.micro, 1 node)
- Application Load Balancer with HTTPS listener
- ECS Fargate cluster with 1 task (512 CPU, 1024 MB memory)
- Security groups for ALB, ECS, RDS, Redis
- CloudWatch log group
- Route53 DNS record (staging.shipsmart.com)

### Run Database Migrations

After infrastructure is provisioned, run database migrations:

```bash
# Get RDS endpoint from Terraform output
cd terraform/environments/staging
terraform output db_endpoint

# Set DATABASE_URL and run migrations
export DATABASE_URL="postgresql://<db-username>:<db-password>@<rds-endpoint>/shipsmart_staging_db"

cd ../../../service
yarn db:migrate

# Verify migrations
yarn db:migrate:status
```

### Deploy Production Environment

**Pre-Deployment Checklist**:
- [ ] Staging environment tested and verified
- [ ] Database migrations tested on staging
- [ ] Production secrets generated (different from staging)
- [ ] SSL certificate provisioned for api.shipsmart.com
- [ ] Backup and rollback plan documented

```bash
cd terraform/environments/production

# Initialize Terraform
terraform init

# Review production configuration
terraform plan

# Apply infrastructure (Multi-AZ, higher capacity)
terraform apply
```

**Expected Duration**: 15-20 minutes (Multi-AZ RDS takes longer)

**What gets created** (production-specific differences):
- RDS PostgreSQL 14 (db.t3.medium, Multi-AZ)
- ElastiCache Redis 7 (cache.t3.small, 2 nodes)
- ECS Fargate cluster with 2 tasks (1024 CPU, 2048 MB memory)
- 7-day backup retention for RDS
- Deletion protection enabled on ALB
- Route53 DNS record (api.shipsmart.com)

---

## Post-Deployment Tasks

### 1. Verify DNS Resolution

```bash
# Wait for DNS propagation (may take 5-10 minutes)
nslookup staging.shipsmart.com
nslookup api.shipsmart.com

# Verify ALB endpoint
curl https://staging.shipsmart.com/api/health
# Expected: {"status":"OK"}
```

### 2. Configure CloudWatch Alarms

```bash
# CPU Utilization Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name shipsmart-staging-high-cpu \
  --alarm-description "Triggers when ECS CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ClusterName,Value=shipsmart-staging-cluster Name=ServiceName,Value=shipsmart-staging-service

# Memory Utilization Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name shipsmart-staging-high-memory \
  --alarm-description "Triggers when ECS memory exceeds 80%" \
  --metric-name MemoryUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ClusterName,Value=shipsmart-staging-cluster Name=ServiceName,Value=shipsmart-staging-service
```

### 3. Set Up Log Insights Queries

Save these queries in CloudWatch Logs Insights:

**Error Logs**:
```sql
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100
```

**API Response Times**:
```sql
fields @timestamp, @message
| filter @message like /Request duration/
| parse @message /duration: (?<duration>\d+)/
| stats avg(duration), max(duration), min(duration) by bin(5m)
```

### 4. Enable RDS Automated Backups

Production backups are configured automatically (7-day retention). For staging:

```bash
aws rds modify-db-instance \
  --db-instance-identifier shipsmart-staging-db \
  --backup-retention-period 1 \
  --preferred-backup-window "03:00-04:00" \
  --apply-immediately
```

---

## Verification

### Health Check

```bash
# Staging
curl https://staging.shipsmart.com/api/health
# Expected: {"status":"OK"}

# Production
curl https://api.shipsmart.com/api/health
```

### ECS Service Status

```bash
# Staging
aws ecs describe-services \
  --cluster shipsmart-staging-cluster \
  --services shipsmart-staging-service \
  --region us-east-1 \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Deployments:deployments[0].status}'

# Expected output:
# {
#   "Status": "ACTIVE",
#   "Running": 1,
#   "Desired": 1,
#   "Deployments": "PRIMARY"
# }
```

### Database Connectivity

```bash
# Test database connection from ECS task
aws ecs execute-command \
  --cluster shipsmart-staging-cluster \
  --task <task-id> \
  --container shipsmart-api \
  --interactive \
  --command "/bin/sh"

# Inside container:
psql -h <rds-endpoint> -U shipsmart_admin -d shipsmart_staging_db -c "\dt"
```

### Redis Connectivity

```bash
# Test Redis connection
aws ecs execute-command \
  --cluster shipsmart-staging-cluster \
  --task <task-id> \
  --container shipsmart-api \
  --interactive \
  --command "/bin/sh"

# Inside container:
redis-cli -h <redis-endpoint> -p 6379 PING
# Expected: PONG
```

### ALB Target Health

```bash
# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn <target-group-arn> \
  --region us-east-1 \
  --query 'TargetHealthDescriptions[*].{Target:Target.Id,Health:TargetHealth.State}'

# Expected: "Health": "healthy"
```

---

## Troubleshooting

### Issue: ECS Tasks Failing to Start

**Symptoms**: Tasks start then immediately stop

**Diagnosis**:
```bash
# Get task ARN
aws ecs list-tasks \
  --cluster shipsmart-staging-cluster \
  --service-name shipsmart-staging-service \
  --region us-east-1

# Describe stopped task
aws ecs describe-tasks \
  --cluster shipsmart-staging-cluster \
  --tasks <task-arn> \
  --region us-east-1 \
  --query 'tasks[0].{StoppedReason:stoppedReason,Containers:containers[*].{Name:name,Reason:reason}}'
```

**Common Causes**:
1. **Health check failing**: Check CloudWatch logs for application errors
2. **Secrets Manager permissions**: Verify task execution role has `secretsmanager:GetSecretValue` permission
3. **Database connection failure**: Verify security group allows ECS → RDS on port 5432
4. **Image pull failure**: Verify ECR permissions and image tag exists

**Solutions**:
```bash
# Check CloudWatch logs
aws logs tail /ecs/shipsmart-staging --follow

# Verify security group rules
aws ec2 describe-security-groups \
  --group-ids <ecs-security-group-id> \
  --query 'SecurityGroups[0].IpPermissions'
```

### Issue: ALB Health Checks Failing

**Symptoms**: Targets marked as "unhealthy" in target group

**Diagnosis**:
```bash
# Check health check configuration
aws elbv2 describe-target-groups \
  --target-group-arns <target-group-arn> \
  --query 'TargetGroups[0].HealthCheckPath'

# Test health endpoint directly from ECS task
aws ecs execute-command \
  --cluster shipsmart-staging-cluster \
  --task <task-id> \
  --container shipsmart-api \
  --interactive \
  --command "/bin/sh"

# Inside container:
curl http://localhost/api/health
```

**Common Causes**:
1. **Health endpoint not responding**: Application not fully started
2. **Incorrect health check path**: Should be `/api/health`
3. **Port mismatch**: Container port 80 should be exposed
4. **Application crash**: Check logs for errors

**Solutions**:
```bash
# Increase health check grace period
aws ecs update-service \
  --cluster shipsmart-staging-cluster \
  --service shipsmart-staging-service \
  --health-check-grace-period-seconds 120
```

### Issue: Database Connection Timeout

**Symptoms**: Application logs show database connection errors

**Diagnosis**:
```bash
# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier shipsmart-staging-db \
  --query 'DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint.Address}'

# Verify security group allows ECS → RDS
aws ec2 describe-security-groups \
  --group-ids <rds-security-group-id> \
  --query 'SecurityGroups[0].IpPermissions[?ToPort==`5432`]'
```

**Solution**:
```bash
# Add inbound rule to RDS security group
aws ec2 authorize-security-group-ingress \
  --group-id <rds-security-group-id> \
  --protocol tcp \
  --port 5432 \
  --source-group <ecs-security-group-id>
```

### Issue: Terraform State Lock Error

**Symptoms**: `Error acquiring the state lock`

**Cause**: Previous Terraform operation crashed or was interrupted

**Solution**:
```bash
# Force unlock (use with caution)
terraform force-unlock <lock-id>

# Or manually delete from DynamoDB
aws dynamodb delete-item \
  --table-name terraform-state-lock \
  --key '{"LockID":{"S":"shipsmart-terraform-state/staging/terraform.tfstate"}}'
```

### Issue: DNS Not Resolving

**Symptoms**: `nslookup staging.shipsmart.com` returns NXDOMAIN

**Diagnosis**:
```bash
# Check Route53 record
aws route53 list-resource-record-sets \
  --hosted-zone-id <zone-id> \
  --query "ResourceRecordSets[?Name=='staging.shipsmart.com.']"
```

**Solution**:
```bash
# Wait for DNS propagation (5-10 minutes)
# Or manually create A record pointing to ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id <zone-id> \
  --change-batch file://dns-change.json
```

---

## Cost Estimates

### Staging Environment (Monthly)

| Service | Resource | Estimated Cost |
|---------|----------|----------------|
| VPC | 2 NAT Gateways | $32.40 ($0.045/hr × 2 × 730 hrs) |
| RDS | db.t3.small (single-AZ) | ~$30 |
| ElastiCache | cache.t3.micro (1 node) | ~$12 |
| ECS Fargate | 1 task (0.5 vCPU, 1 GB) | ~$15 |
| ALB | Application Load Balancer | $16.20 + data transfer |
| CloudWatch | Logs (7-day retention) | ~$5 |
| **Total** | | **~$110/month** |

### Production Environment (Monthly)

| Service | Resource | Estimated Cost |
|---------|----------|----------------|
| VPC | 2 NAT Gateways | $32.40 |
| RDS | db.t3.medium (Multi-AZ) | ~$120 |
| ElastiCache | cache.t3.small (2 nodes) | ~$48 |
| ECS Fargate | 2 tasks (1 vCPU, 2 GB each) | ~$60 |
| ALB | Application Load Balancer | $16.20 + data transfer |
| CloudWatch | Logs (30-day retention) | ~$20 |
| Secrets Manager | 3 secrets | ~$1.20 |
| **Total** | | **~$300/month** |

### Cost Optimization Tips

1. **Stop staging during off-hours**:
   ```bash
   # Stop ECS service (scales to 0 tasks)
   aws ecs update-service \
     --cluster shipsmart-staging-cluster \
     --service shipsmart-staging-service \
     --desired-count 0

   # Restart
   aws ecs update-service \
     --cluster shipsmart-staging-cluster \
     --service shipsmart-staging-service \
     --desired-count 1
   ```

2. **Use RDS Reserved Instances** (1-year or 3-year commitment for 30-50% discount)

3. **Enable S3 lifecycle policies** for log archival

4. **Set CloudWatch log retention** to 7 days for staging

5. **Use AWS Savings Plans** for Fargate (up to 52% savings)

---

## Maintenance

### Updating ECS Task Definition

When application code changes and new Docker image is pushed:

```bash
# Method 1: Force new deployment (pulls latest image)
aws ecs update-service \
  --cluster shipsmart-staging-cluster \
  --service shipsmart-staging-service \
  --force-new-deployment

# Method 2: Update task definition (if changing resources)
cd terraform/environments/staging
terraform apply -target=module.ecs.aws_ecs_task_definition.api
```

### Scaling ECS Service

```bash
# Manual scaling
aws ecs update-service \
  --cluster shipsmart-prod-cluster \
  --service shipsmart-prod-service \
  --desired-count 4

# Or via Terraform
cd terraform/environments/production
# Edit main.tf: module "ecs" { desired_count = 4 }
terraform apply
```

### Database Backup and Restore

**Create Manual Snapshot**:
```bash
aws rds create-db-snapshot \
  --db-instance-identifier shipsmart-prod-db \
  --db-snapshot-identifier shipsmart-prod-snapshot-$(date +%Y%m%d)
```

**Restore from Snapshot**:
```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier shipsmart-prod-db-restored \
  --db-snapshot-identifier shipsmart-prod-snapshot-20260113

# Update ECS task definition with new endpoint
```

### Rotating Secrets

```bash
# Generate new secret
NEW_SECRET=$(openssl rand -base64 64)

# Update Secrets Manager
aws secretsmanager update-secret \
  --secret-id shipsmart-production-jwt-secret \
  --secret-string "$NEW_SECRET"

# Force ECS service redeploy (picks up new secret)
aws ecs update-service \
  --cluster shipsmart-prod-cluster \
  --service shipsmart-prod-service \
  --force-new-deployment
```

### Viewing Logs

```bash
# Tail CloudWatch logs
aws logs tail /ecs/shipsmart-staging --follow

# Filter for errors
aws logs tail /ecs/shipsmart-staging --filter-pattern "ERROR" --follow

# Search specific time range
aws logs filter-log-events \
  --log-group-name /ecs/shipsmart-production \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --filter-pattern "?ERROR ?WARN" \
  --query 'events[*].message' \
  --output text
```

---

## Security Best Practices

### 1. Never Commit Secrets

- ✅ Use `terraform.tfvars.example` templates
- ✅ Add `*.tfvars` to `.gitignore`
- ✅ Store secrets in AWS Secrets Manager
- ✅ Use environment variables for CI/CD
- ❌ NEVER commit `terraform.tfvars` with actual secrets

### 2. Restrict CORS Origins

Update `nginx.production.conf` before deployment:

```nginx
# Change from wildcard to specific origins
add_header 'Access-Control-Allow-Origin' 'https://app.shipsmart.com' always;
```

### 3. Enable Deletion Protection

For production resources:

```bash
# Enable deletion protection on RDS
aws rds modify-db-instance \
  --db-instance-identifier shipsmart-prod-db \
  --deletion-protection \
  --apply-immediately

# Enable deletion protection on ALB
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn <alb-arn> \
  --attributes Key=deletion_protection.enabled,Value=true
```

### 4. Enable VPC Flow Logs

```bash
# Create CloudWatch log group
aws logs create-log-group --log-group-name /aws/vpc/shipsmart-production

# Create IAM role for VPC Flow Logs
# (See AWS documentation for policy details)

# Enable VPC Flow Logs
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids <vpc-id> \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /aws/vpc/shipsmart-production \
  --deliver-logs-permission-arn <iam-role-arn>
```

### 5. Enable CloudTrail

```bash
# Create S3 bucket for CloudTrail logs
aws s3 mb s3://shipsmart-cloudtrail-logs

# Enable CloudTrail
aws cloudtrail create-trail \
  --name shipsmart-cloudtrail \
  --s3-bucket-name shipsmart-cloudtrail-logs

aws cloudtrail start-logging --name shipsmart-cloudtrail
```

### 6. Regular Security Audits

- Review IAM policies quarterly
- Rotate secrets every 90 days
- Update container images with security patches monthly
- Review security group rules quarterly
- Monitor AWS Security Hub for findings

---

## Destroying Infrastructure

**WARNING**: This will permanently delete all resources including databases. Ensure backups exist before proceeding.

### Staging Environment

```bash
cd terraform/environments/staging

# Review what will be destroyed
terraform plan -destroy

# Destroy resources
terraform destroy

# Type 'yes' when prompted
```

### Production Environment

**Additional precautions**:

1. Create final database snapshot:
   ```bash
   aws rds create-db-snapshot \
     --db-instance-identifier shipsmart-prod-db \
     --db-snapshot-identifier shipsmart-prod-final-$(date +%Y%m%d)
   ```

2. Download CloudWatch logs if needed:
   ```bash
   aws logs create-export-task \
     --log-group-name /ecs/shipsmart-production \
     --from $(date -u -d '30 days ago' +%s)000 \
     --to $(date +%s)000 \
     --destination shipsmart-log-archive \
     --destination-prefix production-logs
   ```

3. Destroy infrastructure:
   ```bash
   cd terraform/environments/production
   terraform destroy
   ```

---

## Support and Documentation

- **AWS Documentation**: https://docs.aws.amazon.com/
- **Terraform AWS Provider**: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- **ECS Best Practices**: https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/
- **RDS Best Practices**: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html

For project-specific questions, refer to:
- [CLAUDE.md](../.claude/CLAUDE.md) - Development standards
- [Project Architecture Docs](../docs/03-architecture/) - System design

---

**Last Updated**: 2026-01-13

**Terraform Version**: 1.6+

**AWS Provider Version**: 5.0+
