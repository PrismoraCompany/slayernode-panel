# SlayerNode Panel & SlayerWings Engine (v1.0.0)

[![Engine Status](https://img.shields.io/badge/SlayerWings-v1.0.0--active-00D2FF?style=for-the-badge&logo=docker)](https://slayernode.xyz)
[![License](https://img.shields.io/badge/License-Proprietary-090D16?style=for-the-badge)](https://slayernode.xyz)
[![Design System](https://img.shields.io/badge/UI-Apple_Liquid_Glass-FFFFFF?style=for-the-badge)](https://slayernode.xyz)

> **Official Website & Documentation**: [https://slayernode.xyz](https://slayernode.xyz)  
> **Copyright**: © 2026 SlayerNode. All rights reserved. Version 1.0.0

---

## 🌟 Executive Overview

**SlayerNode Panel** is an enterprise-grade game server management platform and container orchestrator built with an **Apple-inspired Liquid Glass** design system (React 19 + TypeScript + Tailwind CSS + Framer Motion) powered by the high-speed **SlayerWings Engine** daemon.

### Key Architectural Highlights
- **Strict 3-Color Visual Identity**: High-contrast, glare-free palette engineered for server administrators (`#00D2FF` electric cyan, `#090D16` deep navy canvas, and `#FFFFFF` specular gloss highlights).
- **Custom Independent Ports & Paths**: Eliminates all legacy directory references.
  - Custom SlayerWings REST/WebSocket API port: `8443`
  - Custom SlayerWings SFTP Subsystem port: `2202`
  - Custom storage & config paths: `/etc/slayerwings`, `/var/lib/slayerwings/volumes`, `/var/log/slayerwings`
  - Custom Docker network bridge: `slayernode_nw` (subnet `172.18.0.0/16`)
- **Nebula-Style Admin Customization Studio**: Live split-screen theme editor with real-time blur, opacity, specular borders, button physics, login background shaders, and CSS overrides.
- **Built-in Blueprint Framework v2.4.0 Engine**: Out-of-the-box extension registry allowing one-click installation and toggling of community addons.
- **Permanent Protected Root Administrator**: Account ID 1 (`admin@slayernode.xyz`) is safeguarded at the database and application levels, preventing accidental lockout, demotion, or deletion.
- **Zero AI-Slop & Zero Stock Templates**: Pure bespoke components, genuine physics-based translucent cards with `backdrop-filter: blur(24px)`, tactile button scale (`1.02`), and tabular metric telemetry.

---

## ⚙️ System Requirements

### SlayerNode Panel (Web Interface & API Gateway)
- **OS**: Ubuntu 22.04 LTS / 24.04 LTS, Debian 12, or RHEL 9
- **Processor**: 2 vCPU Cores minimum
- **Memory**: 2 GB RAM (4 GB recommended for large clusters)
- **Runtime**: Node.js 22 LTS (Active)
- **Database**: MariaDB 10.11+ / MySQL 8.0, Redis 7.0+
- **Reverse Proxy**: Nginx 1.24+ with SSL (Certbot / Let's Encrypt)

### SlayerWings Daemon (Hypervisor Node)
- **OS**: Linux with Kernel 5.15+ (Linux 6.x recommended)
- **Virtualization**: Docker CE 24.0+
- **Network Ports**:
  - `8443/TCP` (SlayerWings REST API & WebSocket Terminal)
  - `2202/TCP` (SlayerWings Embedded SFTP Subsystem)
  - Game port allocations (e.g., `25565-25600/TCP/UDP`, `28015-28020/UDP`)

---

## 🚀 Step-by-Step Installation Guide (From Scratch)

### Part 1: Setting Up the Host & Core Dependencies

Run on your primary Linux server:

```bash
# Update repository lists and upgrade packages
sudo apt update && sudo apt upgrade -y

# Install essential build and utility packages
sudo apt install -y curl wget git tar jq unzip ufw software-properties-common apt-transport-https ca-certificates gnupg

# Install Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify versions
node -v   # Should output v22.x
npm -v    # Should output v10.x or v11.x
```

---

### Part 2: Database & Caching Setup (MariaDB & Redis)

```bash
# Install MariaDB Server and Redis
sudo apt install -y mariadb-server redis-server

# Enable and start services
sudo systemctl enable --now mariadb
sudo systemctl enable --now redis-server

# Create SlayerNode Database & Dedicated User
sudo mysql -u root <<EOF
CREATE DATABASE slayernode CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'slayernode_user'@'127.0.0.1' IDENTIFIED BY 'StrongGeneratedPasswordHere_2026';
GRANT ALL PRIVILEGES ON slayernode.* TO 'slayernode_user'@'127.0.0.1' WITH GRANT OPTION;
FLUSH PRIVILEGES;
EXIT;
EOF
```

---

### Part 3: Deploying SlayerNode Panel

```bash
# Create panel home directory
sudo mkdir -p /var/www/slayerpanel
sudo chown -R $USER:$USER /var/www/slayerpanel

# Clone SlayerNode Panel repository
cd /var/www/slayerpanel
git clone https://github.com/PrismoraCompany/slayernode-panel.git .

# Install dependencies and build production assets
npm install
npm run build

# Create environment configuration
cat <<EOF > /var/www/slayerpanel/.env
NODE_ENV=production
PORT=3001
APP_URL=https://panel.slayernode.xyz
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=slayernode
DB_USERNAME=slayernode_user
DB_PASSWORD=StrongGeneratedPasswordHere_2026
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
EOF
```

---

### Part 4: Configuring Nginx Reverse Proxy with SSL

Create `/etc/nginx/sites-available/slayerpanel.conf`:

```nginx
server {
    listen 80;
    server_name panel.slayernode.xyz;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name panel.slayernode.xyz;

    ssl_certificate /etc/letsencrypt/live/panel.slayernode.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/panel.slayernode.xyz/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /var/www/slayerpanel/dist;
    index index.html;

    client_max_body_size 100M;

    # Static frontend router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # SlayerNode REST & WebSocket Backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Live Console WebSocket Endpoint
    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Enable the Nginx virtual host:
```bash
sudo ln -s /etc/nginx/sites-available/slayerpanel.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### Part 5: Configuring Systemd Service for SlayerNode Panel

Create `/etc/systemd/system/slayerpanel.service`:

```ini
[Unit]
Description=SlayerNode Panel Management Service
After=network.target mariadb.service redis-server.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/slayerpanel
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo chown -R www-data:www-data /var/www/slayerpanel
sudo systemctl daemon-reload
sudo systemctl enable --now slayerpanel
```

---

### Part 6: Installing SlayerWings Daemon on Node Hypervisor

Execute on each bare-metal server or VPS that will host game server containers:

#### 1. Install Docker Engine
```bash
# Add Docker official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin

# Create SlayerNode bridge network
sudo docker network create --driver bridge --subnet 172.18.0.0/16 slayernode_nw
```

#### 2. Create SlayerWings Directories
```bash
sudo mkdir -p /etc/slayerwings
sudo mkdir -p /var/lib/slayerwings/volumes
sudo mkdir -p /var/lib/slayerwings/backups
sudo mkdir -p /var/log/slayerwings
sudo chmod -R 755 /var/lib/slayerwings
```

#### 3. Daemon Configuration (`/etc/slayerwings/config.yml`)
Generate this file automatically from **Admin → Nodes → Configuration** or create manually:

```yaml
# ========================================================
# SlayerWings Engine Daemon Configuration (v1.0.0)
# Generated by SlayerNode Panel
# Documentation: https://slayernode.xyz/docs/slayerwings
# ========================================================
debug: false
uuid: node-9812-4412-ee98
token_id: sn_tok_01
token: sn_wing_secret_master_token_here
api:
  host: 0.0.0.0
  port: 8443
  ssl:
    enabled: true
    cert: /etc/letsencrypt/live/node1.slayernode.xyz/fullchain.pem
    key: /etc/letsencrypt/live/node1.slayernode.xyz/privkey.pem
  upload_limit: 500
system:
  root_directory: /var/lib/slayerwings/volumes
  log_directory: /var/log/slayerwings
  data: /var/lib/slayerwings
  archive_directory: /var/lib/slayerwings/backups
  backup_retention: 7
  sftp:
    bind_port: 2202
allowed_mounts: []
remote: https://panel.slayernode.xyz
docker:
  network:
    name: slayernode_nw
    driver: bridge
    interface: 172.18.0.1
    dns:
      - 1.1.1.1
      - 8.8.8.8
```

#### 4. Configure `slayerwings.service` Systemd Unit
Create `/etc/systemd/system/slayerwings.service`:

```ini
[Unit]
Description=SlayerWings Container Virtualization Daemon
After=docker.service
Requires=docker.service

[Service]
User=root
WorkingDirectory=/etc/slayerwings
LimitNOFILE=65535
ExecStart=/usr/local/bin/slayerwings
Restart=on-failure
RestartSec=5
StartLimitInterval=600

[Install]
WantedBy=multi-user.target
```

Enable and start SlayerWings:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now slayerwings
```

---

### Part 7: Firewall & Port Allocation (UFW)

Ensure all necessary ports are open on the node hypervisor:

```bash
# Allow SSH management
sudo ufw allow 22/tcp

# Allow SlayerWings Daemon API & SFTP Subsystem
sudo ufw allow 8443/tcp comment 'SlayerWings Daemon REST & WS API'
sudo ufw allow 2202/tcp comment 'SlayerWings SFTP Subsystem'

# Allow Minecraft default port allocations
sudo ufw allow 25565:25600/tcp comment 'Minecraft Game Ports'
sudo ufw allow 25565:25600/udp comment 'Minecraft Query/Bedrock Ports'

# Allow Steam Dedicated & Voice Bot allocations
sudo ufw allow 28015:28020/udp comment 'Rust & Steam Server Ports'

# Enable firewall
sudo ufw enable
sudo ufw status verbose
```

---

## 🧪 Verification & Sandbox Test Suite

SlayerNode includes an automated end-to-end sandbox verification engine that tests daemon communication, container power signals, SFTP banner probes, and WebSocket telemetry without requiring external VPS infrastructure.

To run the verification suite:

```bash
# 1. Start SlayerWings Sandbox Daemon (Port 8443 API / Port 2202 SFTP)
node panel/sandbox-wing/daemon.js &

# 2. Run the integration test suite
node panel/sandbox-wing/test-sandbox.js
```

### Expected Output:
```text
========================================================
SLAYERWINGS EXTERNAL SANDBOX DAEMON TEST SUITE
Custom Daemon Port: 8443 | Custom SFTP Port: 2202
========================================================

[PASS] Test 1: Daemon System Probe
       Version: v1.0.0-slayerwings | Kernel: 6.12.1-slayerwings-rt | Network: slayernode_nw
       Data Directory: /var/lib/slayerwings/volumes (Zero ptero paths)

[PASS] Test 2: Daemon Server Container Enumeration
       Found 2 active containers running on node hypervisor

[PASS] Test 3: Container Power Action (Restart)
       Server UUID: 8a9c4b12-9214-4112-aa11-881234567890 | State: running

[PASS] Test 4: Custom SFTP Subsystem Port 2202
       Received banner: "SSH-2.0-SlayerWings_SFTP_1.0.0"
   ✓ WebSocket connection established to SlayerWings daemon

[PASS] Test 5: WebSocket Telemetry & Metrics Stream (Port 8443)
       Received live CPU: 29% | RAM: 2070.8 MB

[PASS] Test 6: SlayerNode Panel Node Association
       Panel has 3 configured nodes with custom ports:
        - Node-01 (Frankfurt Epyc 9654): listen port 8443, SFTP port 2202, base /var/lib/slayerwings/volumes
        - Node-02 (Helsinki Ryzen 9 7950X3D): listen port 8443, SFTP port 2202, base /var/lib/slayerwings/volumes
        - Node-03 (Sandbox Wing): listen port 8443, SFTP port 2202, base /var/lib/slayerwings/volumes

========================================================
RESULTS: 6/6 TESTS PASSED
========================================================
```

---

## 🔒 Security Architecture

1. **Root Administrator Immortality**:
   - The primary administrator account with ID 1 (`admin@slayernode.xyz` / `admin`) cannot be deleted, suspended, or demoted by any user or API token.
2. **Tenant Isolation**:
   - Non-administrative users are strictly restricted to servers they own. Direct URL tampering returns a 403 Forbidden boundary and audit log alert.
3. **Encrypted External Credentials**:
   - Cloudflare API tokens, CurseForge API keys, and SMTP credentials are encrypted at rest using AES-256-CBC.
4. **ANSI Terminal Sanitization**:
   - Live WebSocket output filters malicious terminal escape sequences while preserving full 24-bit TrueColor and Minecraft MOTD formatting.

---

## 📄 License & Legal Notice

```text
© 2026 SlayerNode. All rights reserved. Version 1.0.0 — https://slayernode.xyz
```

This software and associated documentation files are proprietary to SlayerNode. Unauthorized distribution, modification, or removal of the official copyright notice is strictly prohibited.
