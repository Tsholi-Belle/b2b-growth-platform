#!/usr/bin/env bash
# ==============================================================================
# Google Compute Engine (GCE) e2-micro Free Tier Startup Script
# Automatically provisions Docker, clones repository, and runs ArchEngine AI
# ==============================================================================
set -euo pipefail

echo "==> [GCE Init] Updating system packages..."
apt-get update -y && apt-get upgrade -y
apt-get install -y git curl ufw

echo "==> [GCE Init] Installing Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  systemctl enable docker
  systemctl start docker
fi

echo "==> [GCE Init] Setting up ArchEngine repository..."
APP_DIR="/opt/archengine"
mkdir -p "$APP_DIR"

if [ ! -d "$APP_DIR/.git" ]; then
  git clone https://github.com/Tsholi-Belle/b2b-growth-platform.git "$APP_DIR"
else
  cd "$APP_DIR" && git pull origin main
fi

cd "$APP_DIR"

echo "==> [GCE Init] Building Production Docker Container..."
docker build -t archengine-app:latest .

echo "==> [GCE Init] Starting Container on Port 80 (HTTP) & 3001..."
docker stop archengine-live || true
docker rm archengine-live || true

docker run -d \
  --name archengine-live \
  --restart always \
  -p 80:3001 \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e SERVE_STATIC=true \
  archengine-app:latest

echo "==> [GCE Init] Configuring Firewall..."
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw allow 22/tcp || true

echo "==> [GCE Init] ArchEngine Solutions successfully deployed and active on Port 80!"
