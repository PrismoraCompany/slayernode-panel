# SlayerNode Panel & SlayerWings Engine (v1.0.0)

[![Engine Status](https://img.shields.io/badge/SlayerWings-v1.0.0--active-DC2626?style=for-the-badge&logo=docker)](https://slayernode.xyz)
[![License](https://img.shields.io/badge/License-Proprietary-111216?style=for-the-badge)](https://slayernode.xyz)
[![Palette](https://img.shields.io/badge/Palette-Blackish--Gray_%26_Red-DC2626?style=for-the-badge)](https://slayernode.xyz)

> **Official Website & Documentation**: [https://slayernode.xyz](https://slayernode.xyz)  
> **Copyright**: © 2026 SlayerNode. All rights reserved. Version 1.0.0

---

## ⚡ 1-Command Automated Installer (VPS, Local & Containers)

Modeled after `pterodactyl-installer.se`, you can install SlayerNode Panel, the SlayerWings Daemon, or both with a single interactive CLI command that automatically detects and adapts to your environment:

```bash
bash <(curl -s https://raw.githubusercontent.com/PrismoraCompany/slayernode-panel/main/install.sh)
```

The installer presents an interactive OS & environment menu:
```text
  [1] Dedicated / Production Linux VPS (Ubuntu 22.04/24.04 LTS, Debian 12 — Systemd & Nginx)
  [2] Local Machine / Desktop (Linux, macOS, WSL2 — Non-systemd, instant local run)
  [3] GitHub Codespaces / Web Sandboxes (Zero systemd, auto-forwarded web ports)
  [4] Cloudflare Zero Trust Tunnel Setup (Ingress routing, WebSocket, & Behind-Proxy)
  [0] Exit
```

---

## 🌟 Executive Overview

**SlayerNode Panel** is an enterprise-grade game server management platform and container orchestrator built with a sleek **Solid Blackish-Gray & Crimson Red** design system (React 19 + TypeScript + Tailwind CSS + Framer Motion) powered by the high-speed **SlayerWings Engine** daemon.

### Key Architectural Highlights
- **Solid Blackish-Gray & Crimson Red Visual Identity**: High-contrast, glare-free palette engineered for server administrators (`#111216` dark charcoal canvas, `#181A20` solid panels, and `#DC2626` crimson red accents).
- **Square Buttons & Bevels**: Removed pill buttons in favor of clean square shapes (`rounded-lg`, 8px bevel) with bold red form error validation.
- **Clean Fresh-Install State**: Zero mock servers, zero pre-filled nodes, and zero telemetry version leak on public pages. New users see: *"There are no servers linked to your account."*
- **Custom Independent Ports & Paths**: Eliminates all legacy directory references.
  - Custom SlayerWings REST/WebSocket API port: `8443`
  - Custom SlayerWings SFTP Subsystem port: `2202`
  - Custom storage & config paths: `/etc/slayerwings`, `/var/lib/slayerwings/volumes`, `/var/log/slayerwings`
  - Custom Docker network bridge: `slayernode_nw` (subnet `172.18.0.0/16`)
- **Nebula-Style Admin Customization Studio**: Live split-screen theme editor with real-time blur, opacity, specular borders, button physics, login background shaders, and CSS overrides.
- **Built-in Blueprint Framework v2.4.0 Engine**: Out-of-the-box extension registry allowing one-click installation and toggling of community addons without crashing.
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

## ⚡ Quick Start for GitHub Codespaces & Dev Containers

> [!IMPORTANT]
> **GitHub Codespaces runs inside a Docker container**, which does not run `systemd` and has no public domain for Let's Encrypt certificates. **Do NOT run `systemctl` or Nginx SSL inside a Codespace.**
>
> Simply run the 1-command launcher from your repository root:
> ```bash
> bash quickstart-codespaces.sh
> ```
> Codespaces will automatically forward port **3000** (Web Panel) and **3001** (Backend API). Click the **Open in Browser** notification or open port **3000** in the **Ports** tab!
>
> **Default Login**: `admin@slayernode.xyz` / `admin`

---

## 🚀 Dedicated Bare-Metal & VPS Production Guide (From Scratch)
*Use this guide when deploying on a standalone Linux VPS or dedicated server (Ubuntu 22.04/24.04 or Debian 12) with a real domain name pointed to your server IP.*

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

---

## 🌐 Cloudflare Zero Trust Tunnels & Behind-Proxy Architecture

SlayerNode natively supports deployment behind **Cloudflare Zero Trust (Tunnels)** without needing public IPv4 addresses, port forwarding on home routers, or exposing host firewall ports.

### 1. Ingress Configuration (`~/.cloudflared/config.yml`)
Configure your Cloudflare Tunnel to route both the Web Panel and the SlayerWings Daemon:

```yaml
tunnel: YOUR_TUNNEL_UUID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_UUID.json

ingress:
  # 1. SlayerNode Web Panel & Client API (HTTP Port 3000)
  - hostname: panel.yourdomain.com
    service: http://localhost:3000
    originRequest:
      noTLSVerify: true

  # 2. SlayerWings Daemon (REST & WebSocket Engine Port 8443)
  - hostname: node.yourdomain.com
    service: http://localhost:8443
    originRequest:
      noTLSVerify: true

  # 3. Catch-all HTTP 404 rule
  - service: http_status:404
```

### 2. Panel Node Settings for Cloudflare Tunnels
When registering or editing a node in the SlayerNode admin panel (`Admin > Nodes > Create Node / Edit Node`):
- **FQDN**: Enter your tunnel hostname (e.g. `node.yourdomain.com`).
- **Communicate Over SSL**: Select `Use SSL Connection` (`https`).
- **Behind Proxy**: Select `Behind Proxy` (`behind_proxy: true`).
- **Daemon Port**: Set to `8443` (Cloudflare connects to the local daemon port).

> **How Behind-Proxy Logic Works**:
> When `Behind Proxy` is enabled, SlayerWings knows that SSL is terminated at Cloudflare's Edge network. The daemon will not look for local SSL certificates, will accept reverse-proxy headers (`X-Forwarded-For`, `X-Forwarded-Proto`), and will permit WebSocket upgrades (`wss://`) through Cloudflare without connection drops.

---

## 🗑️ Node Lifecycle Management & Safety Rules

SlayerNode enforces strict infrastructure safety rules to protect your containers and volume data:

* **Deletion Safeguard**: A node **cannot be deleted** if any server instances are currently assigned to it.
* **HTTP 400 Enforcement**: Attempting to delete an active hypervisor node will return:
  ```json
  { "error": "Cannot delete node: It currently hosts 2 active servers." }
  ```
* **Safe Deletion Procedure**:
  1. Navigate to `Admin > Servers`.
  2. Delete or migrate all server containers currently hosted on that target node.
  3. Navigate to `Admin > Nodes`.
  4. Click the red **Delete** button on the node card or in the node detail header.
  5. The panel will confirm the action and cleanly remove the node and its unassigned allocations.

---

## 🛠️ Comprehensive Connection & Error Troubleshooting Matrix

| Error Message / Status Code | Common Root Cause | Exact Diagnosis & Fix |
|:---|:---|:---|
| **`WebSocket connection to 'ws://...:8443' failed`** | Wings daemon is offline or port 8443 is blocked by firewall. | Run `ss -tulpn \| grep 8443` on the node host. Verify `node sandbox-wing/daemon.js` is running. Check UFW rules: `sudo ufw allow 8443/tcp`. |
| **`Mixed Content: loaded over HTTPS but requested an insecure WebSocket endpoint`** | The panel was accessed over `https://` but the node is set to `http://` / `ws://`. | Edit the node in `Admin > Nodes > Settings`. Toggle **Communicate Over SSL** to `Use SSL Connection` (`https`), or configure a Cloudflare Tunnel with `wss://`. |
| **`400 Bad Request: Cannot delete node: It currently hosts X active servers`** | Protection rule preventing orphaned volume deletion. | Delete or migrate all child game servers assigned to that node before deleting the node itself. |
| **`400 Bad Request: Target node does not exist`** | The server creation form selected a node ID that was removed or invalid. | Refresh the page and pick an active online node from the **Target Infrastructure Node** dropdown. |
| **`403 Forbidden: Direct access to internal database forbidden`** | Security boundary preventing direct download of `storage_db.json`. | Normal security behavior. System database files cannot be downloaded over public HTTP routes. |
| **`401 Unauthenticated: Invalid or revoked API credential`** | An API token has expired, been deleted, or was not passed in the `Authorization: Bearer <token>` header. | Generate a new Client API Key in `/accounts > API Credentials` and verify the Authorization header format. |
| **`Cloudflare Error 521: Web Server Is Down`** | Cloudflare Tunnel cannot reach the local port (e.g. 3000 or 8443). | Verify local processes are listening (`curl -I http://localhost:3000` and `curl -I http://localhost:8443/api/system`). Restart `cloudflared`. |
| **`Cloudflare Error 522: Connection Timed Out`** | Node firewall is dropping Cloudflare edge requests. | If using direct DNS rather than tunnels, allow Cloudflare IP ranges or run `cloudflared tunnel run`. |
| **`Cloudflare Error 525: SSL Handshake Failed`** | Cloudflare SSL encryption mode is set to "Strict" but the origin server does not have a trusted certificate. | In Cloudflare Dashboard, set SSL/TLS mode to **Full** (or use Cloudflare Tunnels with `originRequest.noTLSVerify: true`). In the panel, enable `Behind Proxy`. |
| **`docker.sock: permission denied`** | Current Linux user is not in the `docker` usergroup. | Run `sudo usermod -aG docker $USER` and log out / log back in, or run the daemon with administrative privileges. |
| **`Exit code 1: Java Heap Out of Memory (OOM)`** | Host machine has insufficient free physical RAM for the requested Minecraft container allocation. | Increase host swap (`sudo fallocate -l 4G /swapfile`) or adjust container RAM limits in the Server Creation screen. |
| **`SFTP Port 2202 Connection Refused / Closed`** | Port collision with host SSH daemon or port 2202 closed in firewall. | Do **not** bind SFTP to port 22. SlayerWings runs its embedded SFTP subsystem on custom port `2202`. Run `sudo ufw allow 2202/tcp`. |

---

## 📄 License & Legal Notice

```text
© 2026 SlayerNode. All rights reserved. Version 1.0.0 — https://slayernode.xyz
```

This software and associated documentation files are proprietary to SlayerNode. Unauthorized distribution, modification, or removal of the official copyright notice is strictly prohibited.
