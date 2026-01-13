#!/bin/bash
set -e

echo "========================================="
echo "LocalStack Initialization for Jenkins"
echo "========================================="

# Create S3 bucket (single bucket like marauders-map)
echo "Creating S3 bucket..."
awslocal s3 mb s3://shipsmart-config || true

echo "S3 bucket created:"
awslocal s3 ls

# Upload config files for all environments (no .env files needed)
echo "Uploading config files..."
awslocal s3 cp /etc/localstack/init/ready.d/config.development.json \
  s3://shipsmart-config/config.development.json

awslocal s3 cp /etc/localstack/init/ready.d/config.staging.json \
  s3://shipsmart-config/config.staging.json

awslocal s3 cp /etc/localstack/init/ready.d/config.production.json \
  s3://shipsmart-config/config.production.json

awslocal s3 cp /etc/localstack/init/ready.d/config.localhost.json \
  s3://shipsmart-config/config.localhost.json

echo "Config files uploaded:"
awslocal s3 ls s3://shipsmart-config/

echo "========================================="
echo "LocalStack initialization complete!"
echo "  S3 Bucket: s3://shipsmart-config"
echo "  Config files: config.{development,staging,production,localhost}.json"
echo ""
echo "Note: ECR not available in LocalStack free tier"
echo "      Using local Docker registry at localhost:5000 instead"
echo "========================================="
