#!/usr/bin/env bash
set -euo pipefail

# ── VibeCheck Ultra — Oracle Cloud Free Tier Deployment Script ──
# Usage on a fresh Ubuntu VM:
#   curl -fsSL https://raw.githubusercontent.com/roeeash/VibeCheck/main/deploy.sh | sudo bash
#   or clone the repo and run: sudo bash deploy.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[vibecheck]${NC} $1"; }
ok()    { echo -e "${GREEN}[✓]${NC} $1"; }
fail()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

REPO="https://github.com/roeeash/VibeCheck.git"
APP_DIR="/opt/vibecheck"

# Must run as root (creates unprivileged user automatically)
if [ "$EUID" -ne 0 ]; then
  fail "Please run with sudo: sudo bash $0"
fi

info "Starting VibeCheck Ultra deployment..."
echo

# ── 1. Create unprivileged service user ──────────────────────
info "Creating service user..."
useradd -r -m -s /bin/bash vibecheck 2>/dev/null || true
chown vibecheck:vibecheck /opt/vibecheck 2>/dev/null || true
ok "User 'vibecheck' ready"

# ── 2. System dependencies ───────────────────────────────────
info "Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq \
  curl git build-essential ca-certificates gnupg \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
  libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
  libx11-xcb1 libx11-6 fonts-liberation xdg-utils \
  > /dev/null 2>&1
ok "System dependencies installed"

# ── 3. Node.js 20 ────────────────────────────────────────────
if command -v node &>/dev/null && [ "$(node -v | cut -d. -f1 | tr -d 'v')" -ge 20 ]; then
  ok "Node.js $(node -v) already installed"
else
  info "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs > /dev/null 2>&1
  ok "Node.js $(node -v)"
fi

# ── 4. pnpm ──────────────────────────────────────────────────
if command -v pnpm &>/dev/null; then
  ok "pnpm $(pnpm --version 2>/dev/null || echo 'installed') already available"
else
  info "Installing pnpm..."
  npm install -g pnpm > /dev/null 2>&1
  ok "pnpm $(pnpm --version 2>/dev/null || echo 'installed')"
fi

# ── 5. Clone or update repo ──────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  info "Updating existing checkout..."
  git -C "$APP_DIR" pull
else
  info "Cloning repository..."
  git clone --depth 1 "$REPO" "$APP_DIR"
fi
chown -R vibecheck:vibecheck "$APP_DIR"
ok "Repository at $APP_DIR"

# ── 6. Install deps + Playwright + Build ─────────────────────
info "Installing dependencies, Playwright, and building..."
su - vibecheck -c "cd $APP_DIR && pnpm install --frozen-lockfile && npx playwright install --with-deps chromium && pnpm build"
ok "Build complete"

# ── 7. Systemd service ───────────────────────────────────────
info "Setting up systemd service..."
cat > /etc/systemd/system/vibecheck.service <<'SVC'
[Unit]
Description=VibeCheck Ultra — Black-box web performance auditor
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=vibecheck
Group=vibecheck
WorkingDirectory=/opt/vibecheck
ExecStart=/usr/bin/node /opt/vibecheck/apps/api/dist/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=PLAYWRIGHT_BROWSERS_PATH=/opt/vibecheck/node_modules/.cache/ms-playwright
LimitNOFILE=65536
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
SVC

systemctl daemon-reload
systemctl enable vibecheck
systemctl restart vibecheck
ok "Systemd service running"

# ── 8. Firewall ──────────────────────────────────────────────
info "Opening port 3000..."
if command -v ufw &>/dev/null; then
  ufw allow 3000/tcp 2>/dev/null || true
else
  iptables -A INPUT -p tcp --dport 3000 -j ACCEPT 2>/dev/null || true
fi
ok "Port 3000 open"

# ── 9. Done ──────────────────────────────────────────────────
echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  VibeCheck Ultra is running!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
VM_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR-VM-IP")
echo "  Access:  http://${VM_IP}:3000"
echo "  Logs:    sudo journalctl -u vibecheck -f"
echo "  Stop:    sudo systemctl stop vibecheck"
echo "  Restart: sudo systemctl restart vibecheck"
echo "  Update:  cd $APP_DIR && sudo -u vibecheck git pull && sudo -u vibecheck pnpm install && sudo -u vibecheck pnpm build && sudo systemctl restart vibecheck"
echo
