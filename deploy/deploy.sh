#!/usr/bin/env bash
# Deploy aman-tg to k3s
# Usage: bash deploy/deploy.sh
#
# What it does:
#   1. Back up the sqlite databases (keep last BACKUPS_TO_KEEP)
#   2. Pull latest code
#   3. Install deps + build
#   4. Apply k3s manifests (if changed)
#   5. Rolling restart API + Bot pods (zero downtime)

set -euo pipefail

APP_DIR="/var/www/aman-tg"
DATA_DIR="$APP_DIR/data"
BACKUP_DIR="$DATA_DIR/backups"
NAMESPACE="aman"
BACKUPS_TO_KEEP=3
cd "$APP_DIR"

# ── Pre-deploy backup ───────────────────────────────
# Copies the live sqlite files to a timestamped directory and rotates to keep
# only the last N. Cheap insurance against a bad migration or corrupted deploy.
echo "==> Backing up databases..."
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"
BACKUP_TARGET="$BACKUP_DIR/$TS"
mkdir -p "$BACKUP_TARGET"
for db in aman.db amem.db; do
  if [ -f "$DATA_DIR/$db" ]; then
    cp "$DATA_DIR/$db" "$BACKUP_TARGET/$db"
    echo "  backed up $db"
  fi
done
# Rotate: keep newest $BACKUPS_TO_KEEP, delete the rest
ls -1dt "$BACKUP_DIR"/*/ 2>/dev/null | tail -n +$((BACKUPS_TO_KEEP + 1)) | xargs -r rm -rf
echo "  retained: $(ls -1 "$BACKUP_DIR" | wc -l) backup(s)"

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
