#!/usr/bin/env bash
# Deploy aman-tg to k3s
# Usage: bash deploy/deploy.sh
#
# What it does:
#   1. Pull latest code
#   2. Install deps + build
#   3. Apply k3s manifests (if changed)
#   4. Rolling restart API + Bot pods (zero downtime)

set -euo pipefail

APP_DIR="/var/www/aman-tg"
NAMESPACE="aman"
cd "$APP_DIR"

echo "==> Pulling latest code..."
git pull

echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

echo "==> Building all packages..."
pnpm --filter @aman-tg/shared run build
pnpm --filter @aman-tg/api run build
pnpm --filter @aman-tg/web run build
pnpm --filter @aman-tg/bot run build 2>/dev/null || true

echo "==> Applying k3s manifests..."
kubectl apply -f deploy/k3s/service.yaml
kubectl apply -f deploy/k3s/api-deployment.yaml
kubectl apply -f deploy/k3s/bot-deployment.yaml
kubectl apply -f deploy/k3s/ingress.yaml
kubectl apply -f deploy/k3s/hpa.yaml

echo "==> Rolling restart (zero downtime)..."
kubectl rollout restart deployment/aman-api -n "$NAMESPACE"
kubectl rollout restart deployment/aman-bot -n "$NAMESPACE"

echo "==> Waiting for rollout..."
kubectl rollout status deployment/aman-api -n "$NAMESPACE" --timeout=120s
kubectl rollout status deployment/aman-bot -n "$NAMESPACE" --timeout=120s

echo ""
echo "==> Status:"
kubectl get pods -n "$NAMESPACE"
echo ""
kubectl get hpa -n "$NAMESPACE" 2>/dev/null || true
echo ""
echo "Deploy complete!"
