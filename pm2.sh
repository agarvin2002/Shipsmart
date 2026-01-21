#!/bin/sh

ulimit -S -c 0

#nginx conf (Alpine Linux)
nginx

#Restart PM2
cd /root/shipsmart-ai-api/

# Ensure logs directory exists
mkdir -p ./logs

# Kill existing processes
killall -9 /usr/bin/node
npx pm2 delete all

# Start PM2 processes with explicit log files
npx pm2 start service/bin/server --update-env \
  --name shipsmart-api \
  --error ./logs/api-error.log \
  --output ./logs/api-out.log \
  --time

npx pm2 start service/bin/worker --update-env \
  --name shipsmart-worker \
  --error ./logs/worker-error.log \
  --output ./logs/worker-out.log \
  --time

npx pm2 start service/bin/arena --update-env \
  --name shipsmart-arena \
  --error ./logs/arena-error.log \
  --output ./logs/arena-out.log \
  --time

# Save PM2 process list
npx pm2 save

#Not Sleep
sleep infinity
