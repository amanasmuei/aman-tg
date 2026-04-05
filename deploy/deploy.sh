#!/usr/bin/env bash
# Quick redeploy script
# Usage: bash deploy/deploy.sh

set -euo pipefail

APP_DIR="/var/www/aman-tg"
cd "$APP_DIR"

echo "Pulling latest code..."
git pull

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Building..."
pnpm build

echo "Restarting services..."
pm2 restart ecosystem.config.cjs

echo "Done! Services restarted."
pm2 status
