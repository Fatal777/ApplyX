#!/bin/bash
# SSL Certificate Setup Script for ApplyX
# Run this after initial deployment

set -e

DOMAIN="applyx.in"
EMAIL="your-email@example.com"

echo "🔒 Setting up SSL certificates for $DOMAIN"
echo "=========================================="

# Stop nginx temporarily
docker compose -f docker-compose.prod.yml stop nginx

# Get certificates
docker run -it --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN \
    -d api.$DOMAIN

# Start nginx
docker compose -f docker-compose.prod.yml start nginx

echo ""
echo "✅ SSL certificates installed!"
echo ""
echo "Certificates will auto-renew via the certbot container."
echo "To manually renew: docker compose -f docker-compose.prod.yml exec certbot certbot renew"
