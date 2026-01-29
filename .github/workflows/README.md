# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD automation of the ShipSmart AI API.

## Workflows Overview

### 1. CI - Build and Push to ECR (`ci.yml`)

**Purpose**: Build, test, lint, and push Docker images to AWS ECR

**Triggers**:
- Push to `main`, `develop`, or `feature/*` branches
- Pull requests to `main` or `develop`
- Manual dispatch (workflow_dispatch)
- Called by other workflows (workflow_call)

**What it does**:
1. Checks out code
2. Sets up Node.js 22 with Yarn 3.6.1
3. Pulls configuration from S3 (`s3://shipsmart-config/`)
4. Installs dependencies
5. Runs linting (ESLint)
6. Runs tests
7. Builds Docker image with appropriate `NODE_ENV`
8. Pushes to ECR with tags: branch name, git SHA, and `latest` (for main only)

**Environment Variables**:
- Automatically determined based on branch:
  - `main` → `production`
  - `develop` → `staging`
  - Others → `development`

**Outputs**:
- `image_tag`: Docker image tag (branch name)
- `image_uri`: Full ECR image URI

---

### 2. CD - Deploy to ECS (`cd.yml`)

**Purpose**: Deploy Docker images from ECR to AWS ECS

**Triggers**:
- Manual dispatch (workflow_dispatch)
- Called by other workflows (workflow_call)

**Inputs**:
- `environment`: Target environment (development | staging | production)
- `image_tag`: Docker image tag to deploy

**What it does**:
1. Verifies image exists in ECR
2. Runs `scripts/deploy.sh` to update ECS task definition
3. Waits for ECS service to stabilize
4. Posts deployment status to PR (if applicable)

**GitHub Environments**:
- Uses GitHub environment protection rules
- Production environment requires manual approval
- Each environment can have specific secrets

---

### 3. CI/CD - Build and Deploy (`ci-cd.yml`)

**Purpose**: Automated build and deployment pipeline

**Triggers**:
- Push to `main` → auto-deploy to **production**
- Push to `develop` → auto-deploy to **staging**

**What it does**:
1. Calls `ci.yml` to build and push image
2. Calls `cd.yml` to deploy to environment
3. Posts success/failure summary

**Deployment Flow**:
```
Push to main/develop
    ↓
Build & Test (ci.yml)
    ↓
Build & Push Docker Image to ECR
    ↓
Deploy to ECS (cd.yml)
    ↓
Wait for Service Stabilization
    ↓
✅ Deployment Complete
```

---

### 4. Manual Deployment (`manual-deploy.yml`)

**Purpose**: On-demand deployment to any environment with any image tag

**Triggers**: Manual workflow dispatch only

**Inputs**:
- `environment`: Target environment dropdown
- `image_tag`: Image tag to deploy (e.g., `main`, `v1.0.0`, commit SHA)
- `skip_verification`: Skip image verification (use with caution)

**Use Cases**:
- Deploying specific versions to development for testing
- Rollback to previous working version
- Hotfix deployment
- Testing deployment process

---

## Setup Instructions

### Step 1: Configure GitHub Secrets

Add the following secrets in **Settings → Secrets and variables → Actions → Repository secrets**:

```
AWS_ACCESS_KEY_ID       # AWS IAM user access key
AWS_SECRET_ACCESS_KEY   # AWS IAM user secret key
```

**Note**: For enhanced security, use GitHub OIDC instead of long-lived credentials (see Security section below).

---

### Step 2: Create GitHub Environments

Create three environments in **Settings → Environments**:

#### Development Environment
- **Name**: `development`
- **Protection Rules**: None (auto-deploy)
- **Environment Variables**:
  - `NODE_ENV=development`

#### Staging Environment
- **Name**: `staging`
- **Protection Rules**: None (auto-deploy)
- **Environment Variables**:
  - `NODE_ENV=staging`

#### Production Environment
- **Name**: `production`
- **Protection Rules**:
  - ✅ Required reviewers: Select team members who can approve deployments
  - ✅ Wait timer: 0 minutes (or set delay if desired)
  - ✅ Deployment branches: Limit to `main` branch only
- **Environment Variables**:
  - `NODE_ENV=production`
- **Environment URL**: `https://api.shipsmart.com`

---

### Step 3: Configure AWS IAM Permissions

The GitHub Actions workflows require an IAM user/role with the following permissions:

**ECR Permissions** (Push images):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeImages",
        "ecr:DescribeRepositories"
      ],
      "Resource": "*"
    }
  ]
}
```

**S3 Permissions** (Read config files):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::shipsmart-config",
        "arn:aws:s3:::shipsmart-config/*"
      ]
    }
  ]
}
```

**ECS Permissions** (Deploy services):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeClusters",
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition",
        "ecs:UpdateService",
        "ecs:ListTasks",
        "ecs:DescribeTasks"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::*:role/ecsTaskExecutionRole"
    }
  ]
}
```

---

## Usage Examples

### Automatic Deployment

**Scenario**: Deploy to staging automatically

```bash
git checkout develop
git add .
git commit -m "feat: add new feature"
git push origin develop
```

Result: CI/CD workflow triggers → builds → deploys to staging

---

**Scenario**: Deploy to production automatically (with approval)

```bash
git checkout main
git merge develop
git push origin main
```

Result: CI/CD workflow triggers → builds → waits for approval → deploys to production

---

### Manual Deployment

**Scenario**: Deploy specific version to development for testing

1. Go to **Actions** tab
2. Select **Manual Deployment** workflow
3. Click **Run workflow**
4. Configure:
   - Environment: `development`
   - Image tag: `feature-new-payment-flow`
5. Click **Run workflow**

---

**Scenario**: Rollback production to previous version

1. Find previous working commit SHA (e.g., `abc123f`)
2. Go to **Actions** → **Manual Deployment**
3. Configure:
   - Environment: `production`
   - Image tag: `abc123f`
4. Click **Run workflow**
5. Approve deployment (if protection rules enabled)

---

## Workflow Monitoring

### View Workflow Runs
- Go to **Actions** tab
- Select workflow from left sidebar
- Click on specific run to see logs

### Check Deployment Status
- Each workflow creates a **Summary** with deployment details
- Check environment page for deployment history
- Review PR comments for deployment status (if triggered from PR)

### Debugging Failed Workflows
1. Click on failed workflow run
2. Expand failed job
3. Review step logs
4. Common issues:
   - Image not found in ECR → Run CI workflow first
   - ECS service timeout → Check ECS console for errors
   - AWS credentials invalid → Verify GitHub secrets

---

## Security Best Practices

### GitHub OIDC (Recommended for Production)

Instead of storing long-lived AWS credentials, use GitHub's OIDC provider:

**Step 1**: Create IAM OIDC Provider in AWS
```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

**Step 2**: Create IAM Role with Trust Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/shipsmart-ai-api:*"
        }
      }
    }
  ]
}
```

**Step 3**: Update Workflow Files

Replace credential configuration:
```yaml
# BEFORE (IAM user)
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1

# AFTER (OIDC)
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::ACCOUNT_ID:role/GitHubActionsRole
    aws-region: us-east-1
```

**Step 4**: Add Required Permissions to Workflows

Add to each workflow that uses AWS:
```yaml
permissions:
  id-token: write   # Required for OIDC
  contents: read    # Required for checkout
```

---

## Concurrency Control

### CI Workflow
- **Group**: `ci-${{ github.ref }}`
- **Cancel in progress**: `true`
- **Behavior**: New pushes cancel old builds on same branch

### CD Workflow
- **Group**: `deploy-${{ inputs.environment }}`
- **Cancel in progress**: `false`
- **Behavior**: Deployments never cancelled (prevents partial deployments)

---

## Workflow Comparison: Jenkins vs GitHub Actions

| Feature | Jenkins | GitHub Actions |
|---------|---------|----------------|
| **Infrastructure** | Self-hosted server | GitHub-hosted (serverless) |
| **Configuration** | Groovy (jenkinsFile) | YAML (workflow files) |
| **Webhooks** | Manual setup required | Built-in |
| **Secrets** | Jenkins credential store | GitHub encrypted secrets |
| **Approval Flow** | Plugins required | Native environments |
| **UI** | Separate Jenkins interface | Integrated in GitHub |
| **Cost** | Server hosting | Free tier: 2000 min/month |
| **Maintenance** | Server updates, plugins | Managed by GitHub |

---

## Troubleshooting

### Issue: "Image not found in ECR"

**Cause**: CD workflow triggered before CI workflow completed

**Solution**:
1. Wait for CI workflow to complete
2. Verify image exists: `aws ecr describe-images --repository-name shipsmart-api`
3. Check CI workflow logs for push errors

---

### Issue: "ECS service failed to stabilize"

**Cause**: Application failed health checks or couldn't start

**Solution**:
1. Check ECS console for task failures
2. Review CloudWatch logs for application errors
3. Verify environment variables in task definition
4. Check if database/Redis are accessible

---

### Issue: "AWS credentials not configured"

**Cause**: GitHub secrets missing or invalid

**Solution**:
1. Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in repo secrets
2. Test credentials: `aws sts get-caller-identity`
3. Check IAM user has required permissions

---

### Issue: "Workflow failed at 'Pull configuration from S3'"

**Cause**: S3 bucket not accessible or doesn't exist

**Solution**:
1. Verify bucket exists: `aws s3 ls s3://shipsmart-config/`
2. Check IAM permissions for S3 read access
3. Ensure config files exist in bucket

---

## Advanced Usage

### Running Workflows Locally (Act)

You can test workflows locally using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act

# Run CI workflow locally
act push -W .github/workflows/ci.yml

# Run with secrets
act push -W .github/workflows/ci.yml --secret-file .secrets
```

---

### Custom Workflow Triggers

Add custom triggers to workflows:

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  repository_dispatch:
    types: [deploy-hotfix]
```

---

## Support

For issues or questions:
1. Check workflow logs in Actions tab
2. Review this documentation
3. Contact DevOps team
4. Create issue in repository

---

**Last Updated**: 2026-01-29
**Maintained by**: DevOps Team
