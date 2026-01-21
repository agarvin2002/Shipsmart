#!/bin/bash

# ShipSmart AI API - Pre-process Script
# Purpose: Ensure Node.js 22 and Yarn are installed on Jenkins agent
#
# This script is called by Jenkins pipeline (Stage 2: Pre-process)
# It verifies that the build environment has the required tools installed
#
# Requirements:
#   - Node.js 22.x
#   - Yarn (latest stable)
#
# If Node.js or Yarn are missing, this script will install them

set -e

echo "========================================="
echo "ShipSmart AI API - Pre-process"
echo "========================================="

# =============================================================================
# CHECK AND INSTALL NODE.JS 22
# =============================================================================

echo "Checking Node.js installation..."
echo "---"

nodeVar=$(type "node" 2>&1)
echo "Node check: ${nodeVar}"

if [[ "$nodeVar" == *"not found"* ]] || [ -z "$nodeVar" ]; then
  echo "Node.js not found, installing Node.js 22..."

  # Detect OS
  if [ -f /etc/debian_version ]; then
    # Debian/Ubuntu
    echo "Detected Debian/Ubuntu system"
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
  elif [ -f /etc/redhat-release ]; then
    # RHEL/CentOS/Fedora
    echo "Detected RHEL/CentOS/Fedora system"
    curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
    sudo yum install -y nodejs
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "Detected macOS system"
    if command -v brew &> /dev/null; then
      brew install node@22
      brew link --overwrite node@22
    else
      echo "Homebrew not found. Please install Node.js 22 manually."
      exit 1
    fi
  else
    echo "Unsupported OS. Please install Node.js 22 manually."
    exit 1
  fi

  echo "Node.js 22 installed successfully!"
else
  echo "Node.js found"
  node --version

  # Verify Node.js version is 22.x
  nodeVersion=$(node --version)
  if [[ ! "$nodeVersion" == v22* ]]; then
    echo "WARNING: Node.js version is $nodeVersion, expected v22.x"
    echo "The build may fail if Node.js 22 is required"
    echo "Consider upgrading to Node.js 22"

    # Optionally fail the build if wrong version
    # exit 1
  else
    echo "Node.js version check passed: $nodeVersion"
  fi
fi

echo "---"

# =============================================================================
# CHECK AND INSTALL YARN
# =============================================================================

echo "Checking Yarn installation..."
echo "---"

yarnVar=$(type "yarn" 2>&1)

if [[ "$yarnVar" == *"not found"* ]] || [ -z "$yarnVar" ]; then
  echo "Yarn not found, installing Yarn..."

  # Install Yarn via npm
  npm install --global yarn

  echo "Yarn installed successfully!"
else
  echo "Yarn found"
  yarn --version
fi

echo "---"

# =============================================================================
# VERIFY INSTALLATIONS
# =============================================================================

echo "========================================="
echo "Pre-process Complete!"
echo "========================================="
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Yarn version: $(yarn --version)"
echo "========================================="

exit 0
