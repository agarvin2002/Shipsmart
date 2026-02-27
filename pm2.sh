#!/bin/sh

ulimit -S -c 0

# =============================================================================
# Step 1: Pull environment-specific config from S3
# Skipped for development/test (those use local config files)
# =============================================================================
if [ -n "$NODE_ENV" ] && [ "$NODE_ENV" != "development" ] && [ "$NODE_ENV" != "test" ]; then
  echo "=== Pulling config.${NODE_ENV}.json from S3 ==="
  aws s3 cp s3://shipsmart-config/config.${NODE_ENV}.json \
    /root/shipsmart-ai-api/config/config.${NODE_ENV}.json \
    --region ${AWS_REGION:-ap-south-1} \
    && echo "Config pulled successfully for ${NODE_ENV}" \
    || echo "Warning: Could not pull config from S3, using existing config"
fi

# =============================================================================
# Step 2: Copy nginx config for this environment
# =============================================================================
if [ -f "/root/shipsmart-ai-api/nginx/nginx.${NODE_ENV}.conf" ]; then
  cp /root/shipsmart-ai-api/nginx/nginx.${NODE_ENV}.conf /etc/nginx/nginx.conf
  echo "Nginx config loaded for ${NODE_ENV}"
elif [ -f "/root/shipsmart-ai-api/nginx/nginx.production.conf" ]; then
  cp /root/shipsmart-ai-api/nginx/nginx.production.conf /etc/nginx/nginx.conf
  echo "Warning: No nginx config for ${NODE_ENV}, using production default"
fi

# =============================================================================
# Step 3: Start Nginx
# =============================================================================
nginx

# =============================================================================
# Step 4: Start application processes via PM2
# =============================================================================
cd /root/shipsmart-ai-api/

# Ensure logs directory exists
mkdir -p ./logs

# Kill existing processes
killall -9 /usr/bin/node
npx pm2 delete all

# Start PM2 processes (stdout/stderr forwarded to container stdout for CloudWatch)
npx pm2 start service/bin/server --update-env \
  --name shipsmart-api \
  --error /proc/1/fd/2 \
  --output /proc/1/fd/1 \
  --time

npx pm2 start service/bin/worker --update-env \
  --name shipsmart-worker \
  --error /proc/1/fd/2 \
  --output /proc/1/fd/1 \
  --time

npx pm2 start service/bin/arena --update-env \
  --name shipsmart-arena \
  --error /proc/1/fd/2 \
  --output /proc/1/fd/1 \
  --time

# Save PM2 process list
npx pm2 save

# Pre-create log files so tail starts immediately (Winston writes here)
touch /root/shipsmart-ai-api/logs/api.log \
      /root/shipsmart-ai-api/logs/worker.log \
      /root/shipsmart-ai-api/logs/arena.log

# Tail log files to container stdout so awslogs driver sends them to CloudWatch.
# This also keeps the container alive (replaces sleep infinity).
exec tail -F /root/shipsmart-ai-api/logs/api.log \
             /root/shipsmart-ai-api/logs/worker.log \
             /root/shipsmart-ai-api/logs/arena.log
