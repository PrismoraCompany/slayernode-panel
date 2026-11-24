#!/usr/bin/env bash
# ==============================================================================
# SlayerNode — 1-Command Docker Installation for Arch Linux Host
# ==============================================================================
set -e

echo -e "\033[1;31m[SlayerNode]\033[0m Installing Docker engine and enabling service on Arch Linux..."

if [ "$EUID" -ne 0 ]; then
  echo -e "\033[1;33m[Notice]\033[0m Elevating permissions with sudo..."
  sudo pacman -S --needed --noconfirm docker docker-compose
  sudo systemctl enable --now docker
  sudo usermod -aG docker "$USER"
else
  pacman -S --needed --noconfirm docker docker-compose
  systemctl enable --now docker
fi

echo -e "\033[1;32m[✔ Success]\033[0m Docker engine installed and listening on /var/run/docker.sock!"
echo -e "\033[1;36m[Info]\033[0m SlayerWings daemon will automatically detect and bind to the Docker socket."
