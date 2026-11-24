#!/usr/bin/env bash
# ========================================================
# SlayerNode Panel — GitHub Codespaces & Container Launcher
# ========================================================
set -e

echo "========================================================"
echo "SlayerNode Panel v1.0.0 — Container Quickstart"
echo "========================================================"

# Reset ownership if previously altered
if [ "$(id -u)" -eq 0 ]; then
  chown -R root:root .
fi

echo "1/4 Installing Node.js dependencies..."
npm install

echo "2/4 Building production client assets..."
npm run build

echo "3/4 Launching SlayerNode Backend & SlayerWings Daemon..."
# Kill any existing background processes on ports 3001, 8443, 3000
fuser -k 3001/tcp 2>/dev/null || true
fuser -k 8443/tcp 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true

node server/index.js &
BACKEND_PID=$!
echo " -> SlayerNode API online on http://127.0.0.1:3001 (PID $BACKEND_PID)"

node sandbox-wing/daemon.js &
WING_PID=$!
echo " -> SlayerWings Daemon online on http://127.0.0.1:8443 (PID $WING_PID)"

echo "4/4 Launching Vite Web Interface on port 3000..."
echo "========================================================"
echo "OPEN THE 'PORTS' TAB IN CODESPACES TO VIEW PORT 3000!"
echo "Login credentials:"
echo " Email: admin@slayernode.xyz"
echo " Password: admin"
echo "========================================================"

exec npm run dev -- --host 0.0.0.0
