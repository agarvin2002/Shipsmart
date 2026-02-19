#!/bin/bash
set -e

# ShipSmart AI API - Deployment Script
# Purpose: Deploy Docker image from ECR to AWS ECS
#
# Usage: bash scripts/deploy.sh <environment> <image_tag>
# Example: bash scripts/deploy.sh production main

ENVIRONMENT=$1
IMAGE_TAG=$2

if [ -z "$ENVIRONMENT" ] || [ -z "$IMAGE_TAG" ]; then
  echo "Usage: bash scripts/deploy.sh <environment> <image_tag>"
  echo "Example: bash scripts/deploy.sh production main"
  exit 1
fi

# AWS Configuration
AWS_REGION="ap-south-1"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-YOUR_AWS_ACCOUNT_ID}"
ECR_IMAGE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/shipsmart-api:${IMAGE_TAG}"

echo "========================================="
echo "ShipSmart AI API - Deployment"
echo "========================================="
echo "Environment: ${ENVIRONMENT}"
echo "Image Tag: ${IMAGE_TAG}"
echo "ECR Image: ${ECR_IMAGE}"
echo "Region: ${AWS_REGION}"
echo "========================================="

# Set environment-specific variables
case $ENVIRONMENT in
  development)
    CLUSTER="shipsmart-dev-cluster"
    SERVICE="shipsmart-dev-service"
    TASK_FAMILY="shipsmart-dev-task"
    CONTAINER_NAME="shipsmart-api"
    ;;
  staging)
    CLUSTER="shipsmart-staging-cluster"
    SERVICE="shipsmart-staging-service"
    TASK_FAMILY="shipsmart-staging-task"
    CONTAINER_NAME="shipsmart-api"
    ;;
  production)
    CLUSTER="shipsmart-prod-cluster"
    SERVICE="shipsmart-prod-service"
    TASK_FAMILY="shipsmart-prod-task"
    CONTAINER_NAME="shipsmart-api"
    ;;
  *)
    echo "ERROR: Unknown environment: ${ENVIRONMENT}"
    echo "Valid environments: development, staging, production"
    exit 1
    ;;
esac

echo "Cluster: ${CLUSTER}"
echo "Service: ${SERVICE}"
echo "Task Family: ${TASK_FAMILY}"
echo ""

# =============================================================================
# STEP 1: Verify AWS credentials
# =============================================================================
echo "Step 1: Verifying AWS credentials..."
if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "ERROR: AWS credentials not configured"
  exit 1
fi
echo "✓ AWS credentials verified"
echo ""

# =============================================================================
# STEP 2: Verify image exists in ECR
# =============================================================================
echo "Step 2: Verifying image exists in ECR..."
if ! aws ecr describe-images \
  --repository-name shipsmart-api \
  --image-ids imageTag=${IMAGE_TAG} \
  --region ${AWS_REGION} >/dev/null 2>&1; then
  echo "ERROR: Image not found in ECR: ${ECR_IMAGE}"
  echo "Run the CI job first to build and push the image"
  exit 1
fi
echo "✓ Image found in ECR"
echo ""

# =============================================================================
# STEP 3: Check if ECS cluster exists
# =============================================================================
echo "Step 3: Checking if ECS cluster exists..."
if aws ecs describe-clusters --clusters ${CLUSTER} --region ${AWS_REGION} \
  | grep -q "ACTIVE"; then
  echo "✓ Cluster exists: ${CLUSTER}"
else
  echo "⚠ Cluster not found: ${CLUSTER}"
  echo "Note: ECS infrastructure needs to be set up first"
  echo "For now, this is expected. Infrastructure will be created via Terraform/CloudFormation."
  exit 0
fi
echo ""

# =============================================================================
# STEP 4: Get current task definition
# =============================================================================
echo "Step 4: Getting current task definition..."
TASK_DEFINITION_ARN=$(aws ecs describe-task-definition \
  --task-definition ${TASK_FAMILY} \
  --region ${AWS_REGION} \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text 2>/dev/null || echo "")

if [ -z "$TASK_DEFINITION_ARN" ]; then
  echo "⚠ Task definition not found: ${TASK_FAMILY}"
  echo "Note: Task definition needs to be created first"
  echo "For now, this is expected. Infrastructure will be created via Terraform/CloudFormation."
  exit 0
fi
echo "✓ Task definition found: ${TASK_DEFINITION_ARN}"
echo ""

# =============================================================================
# STEP 5: Update task definition with new image
# =============================================================================
echo "Step 5: Updating task definition with new image..."

# Get current task definition
TASK_DEF_JSON=$(aws ecs describe-task-definition \
  --task-definition ${TASK_FAMILY} \
  --region ${AWS_REGION} \
  --query 'taskDefinition')

# Extract relevant fields and update image
NEW_TASK_DEF=$(echo $TASK_DEF_JSON | jq --arg IMAGE "$ECR_IMAGE" \
  'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy) |
  .containerDefinitions[0].image = $IMAGE')

# Register new task definition
NEW_TASK_DEF_ARN=$(echo $NEW_TASK_DEF | \
  aws ecs register-task-definition \
    --cli-input-json file:///dev/stdin \
    --region ${AWS_REGION} \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

echo "✓ New task definition registered: ${NEW_TASK_DEF_ARN}"
echo ""

# =============================================================================
# STEP 6: Update ECS service
# =============================================================================
echo "Step 6: Updating ECS service..."
aws ecs update-service \
  --cluster ${CLUSTER} \
  --service ${SERVICE} \
  --task-definition ${NEW_TASK_DEF_ARN} \
  --force-new-deployment \
  --region ${AWS_REGION} \
  >/dev/null

echo "✓ ECS service update triggered"
echo ""

# =============================================================================
# STEP 7: Monitor deployment progress
# =============================================================================
echo "Step 7: Monitoring deployment progress..."
echo "Waiting for service to stabilize (this may take 2-5 minutes)..."

# Wait for service to be stable (timeout: 10 minutes)
if aws ecs wait services-stable \
  --cluster ${CLUSTER} \
  --services ${SERVICE} \
  --region ${AWS_REGION}; then
  echo "✓ Service deployment successful!"
else
  echo "⚠ Service stabilization timeout"
  echo "Check ECS console for deployment status"
  exit 1
fi
echo ""

# =============================================================================
# DEPLOYMENT COMPLETE
# =============================================================================
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo "Environment: ${ENVIRONMENT}"
echo "Image: ${ECR_IMAGE}"
echo "Cluster: ${CLUSTER}"
echo "Service: ${SERVICE}"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Verify application health: Check ECS console"
echo "  2. Test API endpoints"
echo "  3. Monitor CloudWatch logs"
echo ""
