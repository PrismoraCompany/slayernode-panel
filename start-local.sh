#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Clean up any previously running processes
pkill -9 -f "server/index.js" 2>/dev/null || true
pkill -9 -f "sandbox-wing/daemon.js" 2>/dev/null || true
pkill -9 -f "vite" 2>/dev/null || true
sleep 1

echo "Starting SlayerNode API on port 3001..."
node server/index.js &
SERVER_PID=$!

echo "Starting SlayerWings Sandbox Daemon on port 8443..."
node sandbox-wing/daemon.js &
DAEMON_PID=$!

sleep 2

echo "Starting Vite Dev Server on port 3000..."
exec npx vite --host 0.0.0.0 --port 3000
