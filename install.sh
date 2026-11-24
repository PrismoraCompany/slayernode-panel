#!/usr/bin/env bash
# ==============================================================================
# SlayerNode Panel & SlayerWings Engine — Production Installation Script
# Modeled after pterodactyl-installer.se | Version: 1.0.0
# Copyright (C) 2026 SlayerNode (https://slayernode.xyz)
# ==============================================================================

set -e

# Colors
C_RED='\033[0;31m'
C_BOLD_RED='\033[1;31m'
C_GREEN='\033[0;32m'
C_BOLD_GREEN='\033[1;32m'
C_YELLOW='\033[1;33m'
C_GRAY='\033[0;90m'
C_WHITE='\033[1;37m'
C_RESET='\033[0m'

REPO_URL="https://github.com/PrismoraCompany/slayernode-panel.git"
INSTALL_DIR="/var/www/slayerpanel"

print_banner() {
  clear 2>/dev/null || true
  echo -e "${C_BOLD_RED}"
  echo "  ███████╗██╗      █████╗ ██╗   ██╗███████╗██████╗ ███╗   ██╗ ██████╗ ██████╗ ███████╗"
  echo "  ██╔════╝██║     ██╔══██╗╚██╗ ██╔╝██╔════╝██╔══██╗████╗  ██║██╔═══██╗██╔══██╗██╔════╝"
  echo "  ███████╗██║     ███████║ ╚████╔╝ █████╗  ██████╔╝██╔██╗ ██║██║   ██║██║  ██║█████╗  "
  echo "  ╚════██║██║     ██╔══██║  ╚██╔╝  ██╔══╝  ██╔══██╗██║╚██╗██║██║   ██║██║  ██║██╔══╝  "
  echo "  ███████║███████╗██║  ██║   ██║   ███████╗██║  ██║██║ ╚████║╚██████╔╝██████╔╝███████╗"
  echo "  ╚══════╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚══════╝"
  echo -e "${C_RESET}"
  echo -e "${C_WHITE}               SlayerNode Panel & SlayerWings Interactive Installer${C_RESET}"
  echo -e "${C_GRAY}                           https://slayernode.xyz • v1.0.0${C_RESET}"
  echo -e "${C_RED}================================================================================${C_RESET}"
}

log_info() {
  echo -e "${C_GRAY}[${C_RESET}${C_WHITE}INFO${C_RESET}${C_GRAY}]${C_RESET} $1"
}

log_success() {
  echo -e "${C_GRAY}[${C_RESET}${C_BOLD_GREEN}OK${C_RESET}${C_GRAY}]${C_RESET} $1"
}

log_warn() {
  echo -e "${C_GRAY}[${C_RESET}${C_YELLOW}WARN${C_RESET}${C_GRAY}]${C_RESET} $1"
}

log_error() {
  echo -e "${C_GRAY}[${C_RESET}${C_BOLD_RED}ERROR${C_RESET}${C_GRAY}]${C_RESET} $1"
}

check_root() {
  if [ "$(id -u)" -ne 0 ]; then
    log_error "This installer must be run as root (or via sudo bash install.sh)."
    exit 1
  fi
}

detect_container() {
  if [ -n "$CODESPACES" ] || [ -f /.dockerenv ] || [ ! -d /run/systemd/system ]; then
    return 0
  fi
  return 1
}

install_node() {
  log_info "Verifying Node.js runtime environment..."
  local need_install=0

  if ! command -v node &>/dev/null; then
    need_install=1
  else
    local ver
    ver=$(node -v | tr -d 'v' | cut -d'.' -f1)
    if [ "$ver" -lt 20 ]; then
      log_warn "Node.js version is v$ver (< 20). Upgrading to Node.js 22 LTS..."
      need_install=1
    fi
  fi

  if [ "$need_install" -eq 1 ]; then
    log_info "Installing Node.js 22 LTS from NodeSource..."
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
    apt-get update -y
    apt-get install -y nodejs
  fi
  log_success "Node.js $(node -v) and npm $(npm -v) are ready."
}

install_panel() {
  check_root
  print_banner
  echo -e "${C_BOLD_RED}>>> 1. SLAYERNODE PANEL INSTALLATION${C_RESET}"
  echo ""

  # Prompt Domain
  read -r -p "Enter your FQDN or IP for SlayerNode Panel [default: localhost]: " PANEL_FQDN
  PANEL_FQDN=${PANEL_FQDN:-localhost}

  read -r -p "Configure Let's Encrypt SSL certificate for $PANEL_FQDN? (y/N): " USE_SSL
  USE_SSL=${USE_SSL:-N}

  # 1. System packages
  log_info "Updating system packages and installing dependencies..."
  apt-get update -y
  apt-get install -y curl git tar unzip nginx psmisc certbot python3-certbot-nginx ufw
  install_node

  # 2. Setup directory
  log_info "Setting up SlayerNode Panel in $INSTALL_DIR..."
  if [ -d "$INSTALL_DIR/.git" ]; then
    log_info "Existing repository detected. Pulling latest release..."
    cd "$INSTALL_DIR"
    git fetch origin
    git reset --hard origin/main
  else
    log_info "Cloning SlayerNode repository..."
    mkdir -p "$INSTALL_DIR"
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
  fi

  # 3. NPM Dependencies & Build
  log_info "Installing npm packages and building production bundle..."
  npm install
  npm run build

  # 4. Systemd service (if systemd is available)
  if [ -d /run/systemd/system ]; then
    log_info "Configuring systemd service /etc/systemd/system/slayerpanel.service..."
    cat > /etc/systemd/system/slayerpanel.service <<EOF
[Unit]
Description=SlayerNode Panel Management Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable --now slayerpanel
    log_success "SlayerNode Panel service active and enabled on boot."
  else
    log_warn "Systemd not running in this environment. Starting panel via background process..."
    nohup node server/index.js > /var/log/slayerpanel.log 2>&1 &
    log_success "SlayerNode Panel running in background."
  fi

  # 5. Nginx Configuration
  log_info "Configuring Nginx reverse proxy..."
  cat > /etc/nginx/sites-available/slayerpanel.conf <<EOF
server {
    listen 80;
    server_name $PANEL_FQDN;

    root $INSTALL_DIR/dist;
    index index.html;

    client_max_body_size 500M;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}
EOF

  ln -sf /etc/nginx/sites-available/slayerpanel.conf /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

  if nginx -t; then
    if [ -d /run/systemd/system ]; then
      systemctl reload nginx || systemctl restart nginx
    else
      service nginx reload || service nginx restart || nginx -s reload || true
    fi
    log_success "Nginx proxy configuration applied."
  else
    log_warn "Nginx config test returned a warning. Please verify /etc/nginx/sites-available/slayerpanel.conf."
  fi

  # 6. SSL with Certbot
  if [[ "$USE_SSL" =~ ^[Yy]$ ]] && [ "$PANEL_FQDN" != "localhost" ] && [ "$PANEL_FQDN" != "127.0.0.1" ]; then
    log_info "Requesting Let's Encrypt SSL certificate for $PANEL_FQDN..."
    certbot --nginx -d "$PANEL_FQDN" --non-interactive --agree-tos --register-unsafely-without-email || {
      log_warn "Certbot failed to obtain SSL certificate. Running on HTTP port 80."
    }
  fi

  echo ""
  echo -e "${C_BOLD_GREEN}================================================================================${C_RESET}"
  echo -e "${C_BOLD_GREEN}✔ SLAYERNODE PANEL INSTALLATION COMPLETE!${C_RESET}"
  echo -e "${C_WHITE}Access URL : http://$PANEL_FQDN (or https if SSL was enabled)${C_RESET}"
  echo -e "${C_WHITE}Default Admin Credentials:${C_RESET}"
  echo -e "   Email    : ${C_YELLOW}admin@slayernode.xyz${C_RESET}"
  echo -e "   Password : ${C_YELLOW}admin${C_RESET}"
  echo -e "${C_BOLD_GREEN}================================================================================${C_RESET}"
}

install_wings() {
  check_root
  print_banner
  echo -e "${C_BOLD_RED}>>> 2. SLAYERWINGS DAEMON INSTALLATION${C_RESET}"
  echo ""

  log_info "Installing Docker Virtualization Engine..."
  if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | bash
  fi

  if [ -d /run/systemd/system ]; then
    systemctl enable --now docker
  fi
  log_success "Docker Engine $(docker --version) active."

  install_node

  log_info "Creating SlayerWings system paths..."
  mkdir -p /etc/slayerwings
  mkdir -p /var/lib/slayerwings/volumes

  # Deploy daemon code
  mkdir -p "$INSTALL_DIR"
  if [ ! -f "$INSTALL_DIR/sandbox-wing/daemon.js" ]; then
    git clone "$REPO_URL" "$INSTALL_DIR" || true
  fi

  # Default config if not present
  if [ ! -f /etc/slayerwings/config.yml ]; then
    cat > /etc/slayerwings/config.yml <<EOF
debug: false
uuid: $(cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "11223344-5566-7788-99aa-bbccddeeff00")
token_id: "slayer_$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 16)"
token: "slayer_secret_$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)"
api:
  host: 0.0.0.0
  port: 8443
  ssl:
    enabled: false
system:
  data: /var/lib/slayerwings/volumes
  sftp:
    bind_port: 2202
EOF
    log_success "Generated initial /etc/slayerwings/config.yml."
  fi

  # Systemd service for SlayerWings
  if [ -d /run/systemd/system ]; then
    log_info "Configuring systemd service /etc/systemd/system/slayerwings.service..."
    cat > /etc/systemd/system/slayerwings.service <<EOF
[Unit]
Description=SlayerWings Virtualization Engine Daemon
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/sandbox-wing
ExecStart=/usr/bin/node daemon.js
Restart=always
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable --now slayerwings
    log_success "SlayerWings Daemon service active on ports 8443 (API) and 2202 (SFTP)."
  else
    log_warn "Systemd not running in this environment. Starting SlayerWings via background process..."
    nohup node "$INSTALL_DIR/sandbox-wing/daemon.js" > /var/log/slayerwings.log 2>&1 &
    log_success "SlayerWings running in background."
  fi

  # Firewall rules
  if command -v ufw &>/dev/null; then
    log_info "Configuring UFW firewall rules for SlayerWings..."
    ufw allow 8443/tcp comment "SlayerWings API" 2>/dev/null || true
    ufw allow 2202/tcp comment "SlayerWings SFTP" 2>/dev/null || true
    ufw allow 25565:25585/tcp comment "SlayerNode Game Allocations" 2>/dev/null || true
    ufw allow 25565:25585/udp comment "SlayerNode Game Allocations" 2>/dev/null || true
  fi

  echo ""
  echo -e "${C_BOLD_GREEN}================================================================================${C_RESET}"
  echo -e "${C_BOLD_GREEN}✔ SLAYERWINGS DAEMON INSTALLATION COMPLETE!${C_RESET}"
  echo -e "${C_WHITE}Daemon API  : http://YOUR_VPS_IP:8443${C_RESET}"
  echo -e "${C_WHITE}SFTP Server : YOUR_VPS_IP:2202${C_RESET}"
  echo -e "${C_WHITE}Data Root   : /var/lib/slayerwings/volumes${C_RESET}"
  echo -e "${C_WHITE}Config File : /etc/slayerwings/config.yml${C_RESET}"
  echo -e "${C_BOLD_GREEN}================================================================================${C_RESET}"
}

install_standalone() {
  print_banner
  echo -e "${C_BOLD_RED}>>> 3. STANDALONE INSTALLATION (PANEL + SLAYERWINGS)${C_RESET}"
  echo ""
  install_panel
  install_wings
  echo ""
  log_success "Standalone setup complete! Panel and Wings are fully operational on this server."
}

launch_codespaces() {
  print_banner
  echo -e "${C_BOLD_RED}>>> 4. GITHUB CODESPACES / DEV CONTAINER LAUNCHER${C_RESET}"
  echo ""
  log_info "Setting up container environment without systemd..."

  # If running in repo directory:
  local target_dir="."
  if [ -f "server/index.js" ]; then
    target_dir="."
  elif [ -f "$INSTALL_DIR/server/index.js" ]; then
    target_dir="$INSTALL_DIR"
  elif [ -d "panel" ] && [ -f "panel/server/index.js" ]; then
    target_dir="panel"
  else
    target_dir="/var/www/slayerpanel"
    mkdir -p "$target_dir"
    git clone "$REPO_URL" "$target_dir" || true
  fi

  cd "$target_dir"
  install_node

  log_info "Installing dependencies..."
  npm install

  log_info "Building production client bundle..."
  npm run build

  log_info "Stopping any previous background processes on ports 3001, 8443, 3000..."
  fuser -k 3001/tcp 2>/dev/null || true
  fuser -k 8443/tcp 2>/dev/null || true
  fuser -k 3000/tcp 2>/dev/null || true

  log_info "Starting SlayerNode Backend API on port 3001..."
  node server/index.js &
  BACKEND_PID=$!

  log_info "Starting SlayerWings Daemon on port 8443 / SFTP 2202..."
  node sandbox-wing/daemon.js &
  WING_PID=$!

  echo ""
  echo -e "${C_BOLD_GREEN}================================================================================${C_RESET}"
  echo -e "${C_BOLD_GREEN}✔ CODESPACES / DEV ENVIRONMENT ACTIVE!${C_RESET}"
  echo -e "${C_WHITE}Backend API  : Port 3001 (PID $BACKEND_PID)${C_RESET}"
  echo -e "${C_WHITE}SlayerWings  : Port 8443 (API) • Port 2202 (SFTP) (PID $WING_PID)${C_RESET}"
  echo -e "${C_WHITE}Web Frontend : Starting on Port 3000...${C_RESET}"
  echo -e "${C_YELLOW}>>> In Codespaces, open the 'PORTS' tab at the bottom to view Port 3000! <<<${C_RESET}"
  echo -e "Login: ${C_YELLOW}admin@slayernode.xyz${C_RESET} | Password: ${C_YELLOW}admin${C_RESET}"
  echo -e "${C_BOLD_GREEN}================================================================================${C_RESET}"
  echo ""

  exec npm run dev -- --host 0.0.0.0 --port 3000
}

# ==============================================================================
# MAIN MENU ENTRYPOINT
# ==============================================================================
print_banner

if detect_container; then
  echo -e "${C_YELLOW}[NOTICE] Container / Codespaces detected (No systemd overhead).${C_RESET}"
  echo -e "${C_GRAY}Quickstart mode [4] is recommended for Codespaces.${C_RESET}"
  echo ""
fi

echo -e "Please select an installation mode:"
echo -e "  ${C_BOLD_RED}[1]${C_RESET} Install SlayerNode Panel ${C_GRAY}(Web UI, API, Nginx & SSL)${C_RESET}"
echo -e "  ${C_BOLD_RED}[2]${C_RESET} Install SlayerWings Daemon ${C_GRAY}(Docker Engine, Volumes & SFTP)${C_RESET}"
echo -e "  ${C_BOLD_RED}[3]${C_RESET} Install Both (Standalone Host: Panel + SlayerWings)${C_RESET}"
echo -e "  ${C_BOLD_RED}[4]${C_RESET} GitHub Codespaces / Dev Container Launcher ${C_GRAY}(Zero systemd, instant)${C_RESET}"
echo -e "  ${C_BOLD_RED}[0]${C_RESET} Exit"
echo ""

read -r -p "Enter choice [1-4, default: 1]: " CHOICE
CHOICE=${CHOICE:-1}

case "$CHOICE" in
  1)
    install_panel
    ;;
  2)
    install_wings
    ;;
  3)
    install_standalone
    ;;
  4)
    launch_codespaces
    ;;
  0)
    echo "Exiting."
    exit 0
    ;;
  *)
    log_error "Invalid option selected."
    exit 1
    ;;
esac
