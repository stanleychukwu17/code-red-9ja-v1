#!/bin/bash

# Print every command and its arguments to the log before executing it for easier debugging
set -x # set -x prints every command and its arguments to the log before executing i

# Redirect output to user-data.log
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "=== Starting user_data execution ==="

# Update packages
dnf update -y

# Install Docker
dnf install -y docker

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Allow ec2-user to run Docker commands (we added the "ec2-user" to the "docker" group)
usermod -aG docker ec2-user

# Install Docker Compose CLI plugin
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Verify Installations
docker --version
docker compose version

# Install Nginx directly on the host (for easy Certbot certificate integration)
dnf install -y nginx

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx

# Install certbot using python3 venv as recommended for Amazon Linux 2023
dnf install -y python3-pip
python3 -m venv /opt/certbot/
/opt/certbot/bin/pip install --upgrade pip
/opt/certbot/bin/pip install certbot certbot-nginx
ln -sf /opt/certbot/bin/certbot /usr/bin/certbot

# Setup persistent data volume
DEVICE="/dev/nvme1n1"
MOUNT_DIR="/mnt/data"

echo "Waiting for data volume $DEVICE to be attached..."
while [ ! -b $DEVICE ]; do
  sleep 5
done

# Check if the volume is formatted (if it outputs 'data', it's unformatted)
FS_TYPE=$(file -s $DEVICE | awk '{print $2}')
if [ "$FS_TYPE" = "data" ]; then
  echo "Formatting $DEVICE..."
  mkfs -t xfs $DEVICE
fi

# Create mount point and mount
mkdir -p $MOUNT_DIR
mount $DEVICE $MOUNT_DIR

# Add to /etc/fstab so the volume automatically remounts if the EC2 instance is rebooted.
# Breakdown of parameters:
# - defaults: use default mount options (rw, suid, dev, exec, auto, nouser, async)
# - nofail: if the volume is detached, don't crash the boot process, just skip it
# - 0: dump utility shouldn't backup this filesystem
# - 2: fsck (file system check) should check this drive after the root drive during boot
echo "$DEVICE $MOUNT_DIR xfs defaults,nofail 0 2" >> /etc/fstab

# Create subdirectories for pgdata and redisdata
mkdir -p $MOUNT_DIR/pgdata
mkdir -p $MOUNT_DIR/redisdata
# Set permissions so Docker containers can read/write
chmod 777 $MOUNT_DIR/pgdata
chmod 777 $MOUNT_DIR/redisdata

# Create application directory
mkdir -p /app

# Write Docker Compose configuration file
cat << 'EOF' > /app/docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16.3-alpine3.20
    container_name: ${website}-${environment}-db
    hostname: ${website}-${environment}-db
    environment:
      POSTGRES_DB: ${db_name}
      POSTGRES_USER: ${db_user}
      POSTGRES_PASSWORD: ${db_password}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      # Bind to 127.0.0.1 to prevent external access and Docker iptables bypass
      - "127.0.0.1:5432:5432"
    restart: always
    networks:
      - free9ja-network

  redis:
    image: redis:7.2.13-alpine
    container_name: ${website}-${environment}-redis
    hostname: ${website}-${environment}-redis
    volumes:
      - redisdata:/data
    ports:
      # Bind to 127.0.0.1 to prevent external access and Docker iptables bypass
      - "127.0.0.1:6379:6379"
    restart: always
    networks:
      - free9ja-network

  api:
    image: ${ecr_api_repo_url}:latest
    container_name: ${website}-${environment}-api
    hostname: ${website}-${environment}-api
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=${db_name}
      - DB_USER=${db_user}
      - DB_PASSWORD=${db_password}
      - DB_SSLMODE=disable
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=
      - JWT_SECRET=${jwt_secret}
      - JWT_ACCESS_EXPIRATION=${jwt_access_expiration}
      - JWT_REFRESH_EXPIRATION=${jwt_refresh_expiration}
      - PORT=4000
      - ENV=production
      - RUN_MIGRATIONS=${run_migrations}
    depends_on:
      - postgres
      - redis
    restart: always
    networks:
      - free9ja-network

  ip-service:
    image: ${ecr_ip_repo_url}:latest
    container_name: ${website}-${environment}-ip
    hostname: ${website}-${environment}-ip
    environment:
      - APP_ENV=production
      - REDIS_ADDR=redis:6379
      - REDIS_PASSWORD=
      - REDIS_DB=0
      - PORT=8081
    depends_on:
      - redis
    restart: always
    networks:
      - free9ja-network

volumes:
  pgdata:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /mnt/data/pgdata
  redisdata:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /mnt/data/redisdata

networks:
  free9ja-network:
    driver: bridge
EOF

# Write initial HTTP-only Nginx configuration (which handles Acme challenges for Certbot)
cat << 'EOF' > /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /run/nginx.pid;

# Load dynamic modules. See /usr/share/doc/nginx/README.dynamic.
include /usr/share/nginx/modules/*.conf;

events {
    worker_connections 1024;
}

http {
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile            on;
    tcp_nopush          on;
    keepalive_timeout   65;
    types_hash_max_size 4096;

    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;

    # Security Hardening
    server_tokens off;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip Compression
    # gzip on;
    # gzip_vary on;
    # gzip_proxied any;
    # gzip_comp_level 6;
    # gzip_types text/plain application/json;

    # Load modular configuration files from the /etc/nginx/conf.d directory.
    # See http://nginx.org/en/docs/ngx_core_module.html#include
    include /etc/nginx/conf.d/*.conf;
}
EOF

# Create Nginx server blocks for both API and IP services (supporting HTTP-01 challenge)
cat << 'EOF' > /etc/nginx/conf.d/free9ja.conf
server {
    listen 80;
    server_name ${backend_subdomain}.${domain_name};

    # Certbot challenge path
    location /.well-known/acme-challenge/ {
        root /usr/share/nginx/html;
    }

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $$host;
        proxy_set_header X-Real-IP $$remote_addr;
        proxy_set_header X-Forwarded-For $$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $$scheme;
    }
}

server {
    listen 80;
    server_name ${ip_subdomain}.${domain_name};

    # Certbot challenge path
    location /.well-known/acme-challenge/ {
        root /usr/share/nginx/html;
    }

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $$host;
        proxy_set_header X-Real-IP $$remote_addr;
        proxy_set_header X-Forwarded-For $$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $$scheme;
    }
}
EOF

# we did not listen to port 443 because certbot will do it for us, see ./certbot_port_80_explanation.txt

# Reload Nginx to apply server blocks
systemctl reload nginx

# Set proper ownership for /app
chown -R ec2-user:ec2-user /app

# Pull database and redis container and start them
cd /app
docker compose up -d postgres redis

echo "=== Finished user_data execution ==="
