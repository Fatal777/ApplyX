#!/bin/bash
# ApplyX Deployment Script for Digital Ocean
# Run this on your Digital Ocean droplet

set -e

echo "🚀 ApplyX Deployment Script"
echo "=========================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

echo -e "${YELLOW}Step 1: Updating system...${NC}"
apt-get update && apt-get upgrade -y

echo -e "${YELLOW}Step 2: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    rm get-docker.sh
    echo -e "${GREEN}Docker installed!${NC}"
else
    echo -e "${GREEN}Docker already installed${NC}"
fi

echo -e "${YELLOW}Step 3: Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    apt-get install -y docker-compose-plugin
    echo -e "${GREEN}Docker Compose installed!${NC}"
else
    echo -e "${GREEN}Docker Compose already installed${NC}"
fi

echo -e "${YELLOW}Step 4: Creating app directory...${NC}"
mkdir -p /opt/applyx
cd /opt/applyx

echo -e "${YELLOW}Step 5: Cloning/updating repository...${NC}"
if [ -d ".git" ]; then
    git pull origin main
else
    echo "Please clone your repository to /opt/applyx"
    echo "git clone YOUR_REPO_URL ."
    exit 1
fi

echo -e "${YELLOW}Step 6: Setting up environment...${NC}"
cd backend
if [ ! -f ".env" ]; then
    if [ -f ".env.production.template" ]; then
        cp .env.production.template .env
        echo -e "${RED}IMPORTANT: Edit /opt/applyx/backend/.env with your production values!${NC}"
    else
        echo -e "${RED}No .env template found!${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}Step 7: Creating SSL certificates directory...${NC}"
mkdir -p certbot/conf certbot/www

echo -e "${YELLOW}Step 8: Building and starting containers...${NC}"
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

echo -e "${YELLOW}Step 9: Waiting for services to be healthy...${NC}"
sleep 30

echo -e "${YELLOW}Step 10: Running database migrations...${NC}"
docker compose -f docker-compose.prod.yml exec -T api python -m alembic upgrade head

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Update /opt/applyx/backend/.env with production values"
echo "2. Run SSL setup: ./setup-ssl.sh"
echo "3. Verify: curl http://YOUR_IP:8000/health"
echo ""
