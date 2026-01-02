# ApplyX Production Deployment - Quick Start Guide

Complete Docker-based deployment for ApplyX on DigitalOcean (or any Linux server).

---

## 🚀 Quick Deployment (5 Minutes)

### Prerequisites
- Linux server (Ubuntu 20.04+ recommended)
- Domain name pointed to server IP
- SSH access to server

---

## 📦 Server Deployment Commands

### Step 1: SSH Into Your Server

```bash
ssh root@YOUR_SERVER_IP
```

Example:
```bash
ssh root@139.59.95.13
```

---

### Step 2: Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh && rm get-docker.sh
```

This installs Docker and Docker Compose in one command.

---

### Step 3: Clone Repository

```bash
git clone https://github.com/Fatal777/ApplyX.git /opt/applyx
cd /opt/applyx/backend
```

---

### Step 4: Create Production Environment File

```bash
cp .env.production.template .env
nano .env
```

**Update these critical values in the `.env` file:**

```env
# Database (IMPORTANT: Set a strong password)
DB_PASSWORD=YOUR_STRONG_PASSWORD_HERE
DATABASE_URL=postgresql://applyx:YOUR_STRONG_PASSWORD_HERE@postgres:5432/applyx

# Security Keys (Generate random strings)
SECRET_KEY=generate_random_string_here
JWT_SECRET_KEY=generate_random_string_here
ENCRYPTION_KEY=generate_random_string_here

# Supabase (Get from https://supabase.com dashboard)
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_KEY=your_anon_key_here
SUPABASE_JWT_SECRET=your_jwt_secret_here
SUPABASE_PROJECT_REF=your_project_ref

# API Keys (Optional but recommended for full functionality)
GEMINI_API_KEY=your_gemini_key
DEEPGRAM_API_KEY=your_deepgram_key
OPENAI_API_KEY=your_openai_key
RAZORPAY_KEY_ID=your_razorpay_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

**To generate random strings for secrets:**
```bash
openssl rand -hex 32
```

**Save and exit nano:** 
- Press `Ctrl+O`, then `Enter` to save
- Press `Ctrl+X` to exit

---

### Step 5: Build and Start All Services

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

This command:
- Builds Docker images for backend, frontend, and workers
- Starts PostgreSQL, Redis, API, Celery workers, and Nginx
- Runs everything in detached mode

**Build arguments for frontend are automatically passed from `.env` file.**

---

### Step 6: Wait for Containers & Run Database Migrations

```bash
sleep 30
docker compose -f docker-compose.prod.yml exec api python -m alembic upgrade head
```

This creates all necessary database tables.

---

### Step 7: Verify Deployment

```bash
curl http://localhost:8000/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected",
  "redis": "connected"
}
```

---

## 🔄 Frontend Rebuild Script

If you need to rebuild only the frontend (useful after code changes):

### Create Rebuild Script

```bash
cat > /opt/applyx/rebuild-frontend.sh << 'EOF'
#!/bin/bash
cd /opt/applyx
git pull origin master
cd backend

# Build frontend with Supabase credentials
docker compose --env-file .env.production -f docker-compose.prod.yml build \
  --build-arg VITE_SUPABASE_URL="https://painekyhqncfxjwaonwy.supabase.co" \
  --build-arg VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaW5la3locW5jZnhqd2Fvbnd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NjM4NDAsImV4cCI6MjA3NzMzOTg0MH0.ra3uLHvV7D3BvKImtW8JVDS_o7ywe9HYHuQMoI7Sn1A" \
  frontend

# Restart frontend container
docker compose --env-file .env.production -f docker-compose.prod.yml up -d frontend

# Copy built files to Nginx volume
sleep 3
docker exec applyx-frontend sh -c "cp -r /usr/share/nginx/html/* /app/dist/"

echo "✅ Frontend rebuilt and deployed!"
EOF

chmod +x /opt/applyx/rebuild-frontend.sh
```

### Run Frontend Rebuild

```bash
/opt/applyx/rebuild-frontend.sh
```

---

## 🔐 SSL Setup (After DNS Propagates)

Once your domain points to your server IP:

```bash
cd /opt/applyx/backend/scripts
chmod +x setup-ssl.sh
nano setup-ssl.sh  # Update EMAIL variable to your email
./setup-ssl.sh
```

This script:
- Installs Certbot
- Generates SSL certificates from Let's Encrypt
- Configures Nginx with HTTPS
- Sets up auto-renewal

---

## 🛠️ Useful Commands

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f worker
```

### Restart Services

```bash
# All services
docker compose -f docker-compose.prod.yml restart

# Specific service
docker compose -f docker-compose.prod.yml restart api
```

### Stop Services

```bash
docker compose -f docker-compose.prod.yml down
```

### Pull Latest Code and Rebuild

```bash
cd /opt/applyx
git pull origin master
cd backend
docker compose -f docker-compose.prod.yml up -d --build
```

### Check Container Status

```bash
docker compose -f docker-compose.prod.yml ps
```

### Execute Commands in Container

```bash
# Enter API container
docker compose -f docker-compose.prod.yml exec api bash

# Enter PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres psql -U applyx
```

---

## 📊 Service URLs

After deployment, your services will be available at:

| Service | URL | Notes |
|---------|-----|-------|
| **Frontend** | `http://YOUR_DOMAIN` | Main application |
| **Backend API** | `http://YOUR_DOMAIN/api/v1` | API endpoints |
| **API Docs** | `http://YOUR_DOMAIN/docs` | Swagger UI |
| **Health Check** | `http://YOUR_DOMAIN/health` | System status |

After SSL setup:
- All URLs will use `https://` instead of `http://`

---

## 🐛 Troubleshooting

### Containers Won't Start

```bash
# Check logs for errors
docker compose -f docker-compose.prod.yml logs

# Check if ports are in use
netstat -tulpn | grep -E '8000|5432|6379'
```

### Database Connection Issues

```bash
# Verify database is running
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# Check database credentials in .env file
cat .env | grep DATABASE_URL
```

### Frontend Not Loading

```bash
# Rebuild frontend
/opt/applyx/rebuild-frontend.sh

# Check Nginx logs
docker compose -f docker-compose.prod.yml logs frontend
```

### Out of Memory

```bash
# Check system resources
free -h
docker stats

# Restart containers to free memory
docker compose -f docker-compose.prod.yml restart
```

---

## 🔄 Update Workflow

When you push new code:

1. **Pull latest code:**
   ```bash
   cd /opt/applyx
   git pull origin master
   ```

2. **Rebuild and restart:**
   ```bash
   cd backend
   docker compose -f docker-compose.prod.yml up -d --build
   ```

3. **Run migrations (if any):**
   ```bash
   docker compose -f docker-compose.prod.yml exec api python -m alembic upgrade head
   ```

---

## 💰 Cost Estimate

| Service | Cost (Monthly) |
|---------|----------------|
| DigitalOcean Droplet (4GB RAM, 2 vCPU) | $24 (~₹2,000) |
| Deepgram STT | ~$17 (~₹1,500) |
| Gemini AI | ~$10 (~₹800) |
| edge-tts | Free |
| **Total** | **~₹4,300/month** |

---

## 📝 Architecture Components

All services run in Docker containers:

1. **PostgreSQL** - Database (persistent storage)
2. **Redis** - Cache and task queue
3. **FastAPI Backend** - Main API service
4. **Celery Worker** - Background job processing
5. **Celery Beat** - Scheduled tasks
6. **Frontend (Nginx)** - React SPA with Vite
7. **Nginx Reverse Proxy** - Routes traffic, serves static files

---

## ✅ Post-Deployment Checklist

- [ ] All containers running (`docker compose ps`)
- [ ] Health check returns 200 (`curl http://localhost:8000/health`)
- [ ] Database migrations applied
- [ ] Frontend accessible in browser
- [ ] API docs accessible at `/docs`
- [ ] SSL certificates installed (if domain configured)
- [ ] Environment variables set correctly
- [ ] Backup strategy configured
- [ ] Monitoring setup (optional but recommended)

---

## 🆘 Support

If you encounter issues:

1. Check logs: `docker compose -f docker-compose.prod.yml logs`
2. Verify environment variables: `cat .env`
3. Check container status: `docker compose ps`
4. Review this guide's troubleshooting section

---

**Deployment Status**: ✅ Production-Ready with Docker Compose
