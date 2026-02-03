#!/bin/bash

# Emergency Port Cleanup Script
# Usage: ./scripts/kill-port.sh [PORT]
# Example: ./scripts/kill-port.sh 3001

set -e

PORT=${1:-3001}

echo "🔍 Checking port $PORT..."

# Find process on port
PID=$(lsof -ti :$PORT 2>/dev/null || echo "")

if [ -z "$PID" ]; then
  echo "✅ Port $PORT is free"
  exit 0
fi

echo "⚠️  Found process $PID using port $PORT"

# Show process details
ps -p $PID -o pid,ppid,command= 2>/dev/null || echo "Unknown process"

# Kill process
echo "🔪 Killing process $PID..."
kill -9 $PID 2>/dev/null || true

# Wait a moment
sleep 1

# Verify
if lsof -ti :$PORT >/dev/null 2>&1; then
  echo "❌ Failed to kill process on port $PORT"
  exit 1
else
  echo "✅ Port $PORT is now free"
  exit 0
fi
