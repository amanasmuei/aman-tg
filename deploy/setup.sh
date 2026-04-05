#!/usr/bin/env bash
# aman-tg VPS Setup Script
# Run on a fresh Hostinger VPS (Ubuntu 22.04+)
#
# Usage: bash deploy/setup.sh aman-tg.yourdomain.com

set -euo pipefail

DOMAIN="${1:?Usage: bash deploy/setup.sh <domain>}"
APP_DIR="/var/www/aman-tg"
REPO_URL="https://github.com/amanasmuei/aman-tg.git"

echo "=== aman-tg VPS Setup ==="
echo "Domain: $DOMAIN"
echo ""

# 1. System packages
echo "[1/7] Installing system packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq nginx certbot python3-certbot-nginx curl git

# 2. Node.js 22
echo "[2/7] Installing Node.js 22..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi

# 3. pnpm + PM2
echo "[3/7] Installing pnpm and PM2..."
npm install -g pnpm pm2 2>/dev/null || true

# 4. Clone & build
echo "[4/7] Cloning and building..."
sudo mkdir -p "$APP_DIR"
sudo chown "$USER:$USER" "$APP_DIR"

if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR" && git pull
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

pnpm install --frozen-lockfile
pnpm build

# 5. Environment
echo "[5/7] Setting up environment..."
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo ""
  echo "  ⚠️  Edit $APP_DIR/.env with your secrets:"
  echo "     BOT_TOKEN, ANTHROPIC_API_KEY, MINI_APP_URL"
  echo ""
fi

# 6. Nginx
echo "[6/7] Configuring nginx..."
sudo cp "$APP_DIR/deploy/nginx.conf" "/etc/nginx/sites-available/aman-tg"
sudo sed -i "s/aman-tg.yourdomain.com/$DOMAIN/g" "/etc/nginx/sites-available/aman-tg"
sudo ln -sf /etc/nginx/sites-available/aman-tg /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 7. SSL
echo "[7/7] Setting up SSL with Let's Encrypt..."
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" || {
  echo "  ⚠️  SSL setup failed. Run manually: sudo certbot --nginx -d $DOMAIN"
}

# Start services
echo ""
echo "=== Starting services ==="
cd "$APP_DIR"
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup | tail -1 | sudo bash || true

echo ""
echo "=== Setup Complete ==="
echo "  Mini App: https://$DOMAIN"
echo "  API:      https://$DOMAIN/api/agents"
echo "  Health:   https://$DOMAIN/health"
echo ""
echo "  Next steps:"
echo "  1. Edit $APP_DIR/.env with your secrets"
echo "  2. Set Mini App URL in @BotFather: https://$DOMAIN"
echo "  3. pm2 restart all"
echo ""
