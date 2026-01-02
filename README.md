# ApplyX - AI-Powered Career Platform

Complete AI-powered career platform with resume analysis, job matching, mock interviews, and PDF editing tools.

---

## 🚀 Features

- **Resume Analysis & ATS Scoring** - Upload resumes, get AI feedback and ATS compatibility scores
- **AI Mock Interviews** - Real-time voice interviews with AI using Deepgram STT + Gemini AI
- **Job Portal Integration** - Search jobs across multiple platforms (Indeed, LinkedIn, Glassdoor)
- **PDF Resume Editor** - Sejda-like word-level PDF editing with zero artifacts
- **Payment Integration** - Razorpay, Cashfree, and PayPal support
- **High-Performance Search** - Redis-backed inverted index with sub-10ms response times
- **Production-Ready** - Full Docker deployment with monitoring and observability

---

## 📦 Quick Deployment

**Deploy to production in 5 minutes:**

See [DEPLOYMENT_QUICKSTART.md](./DEPLOYMENT_QUICKSTART.md) for complete deployment instructions.

**Quick commands:**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh

# Clone and deploy
git clone https://github.com/Fatal777/ApplyX.git /opt/applyx
cd /opt/applyx/backend
cp .env.production.template .env
nano .env  # Configure environment variables

# Build and start all services
docker compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker compose -f docker-compose.prod.yml exec api python -m alembic upgrade head
```

---

## 🛠️ Local Development

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Configure environment
cp .env.example .env
nano .env

# Start services
uvicorn app.main:app --reload --port 8000
celery -A app.tasks.celery_app worker --loglevel=info  # In another terminal
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:5173`

---

## 🏗️ Architecture

### Tech Stack

**Backend:**
- FastAPI (Python 3.11+)
- PostgreSQL + Redis
- Celery for background tasks
- Deepgram Nova-2 (Speech-to-Text)
- Gemini 2.5 Flash (AI Interview Engine)
- edge-tts (Text-to-Speech - Free)

**Frontend:**
- React + TypeScript
- Vite build tool
- shadcn/ui components
- Tailwind CSS

**Infrastructure:**
- Docker + Docker Compose
- Nginx reverse proxy
- Let's Encrypt SSL
- OpenTelemetry + Prometheus + Sentry

### Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 80/443 | React SPA served by Nginx |
| Backend API | 8000 | FastAPI application |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache + Task Queue |
| Celery Worker | - | Background jobs |
| Celery Beat | - | Scheduled tasks |

---

## 📚 Documentation

- **[Deployment Guide](./DEPLOYMENT_QUICKSTART.md)** - Complete production deployment
- **[Backend README](./backend/README.md)** - Backend API documentation
- **[PDF Editing](./PDF_EDITING_IMPLEMENTATION.md)** - PDF editor implementation details
- **[Tools Implementation](./TOOLS_IMPLEMENTATION.md)** - Annotation tools documentation
- **[PRD](./PRD.md)** - Product requirements document

---

## 🔑 Environment Variables

Key environment variables needed (see `.env.example` for complete list):

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/applyx

# Security
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# Supabase Authentication
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret

# AI Services (Budget-optimized)
GEMINI_API_KEY=your-gemini-key  # ~₹800/month
DEEPGRAM_API_KEY=your-deepgram-key  # ~₹1,500/month
# edge-tts is free, no API key needed

# Payment Gateways
RAZORPAY_KEY_ID=your-razorpay-id
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

---

## 💰 Monthly Cost Estimate

| Service | Cost |
|---------|------|
| DigitalOcean Droplet (4GB RAM) | $24 (~₹2,000) |
| Deepgram STT (500 interviews) | ~$17 (~₹1,500) |
| Gemini AI (500 interviews) | ~$10 (~₹800) |
| edge-tts | Free |
| **Total** | **~₹4,300/month** |

---

## 🛡️ Security Features

- JWT-based authentication with refresh tokens
- Password hashing with bcrypt
- Data encryption at rest (AES-256)
- Rate limiting and DDoS protection
- Security headers middleware
- Malware scanning for uploads
- Audit logging
- Circuit breakers for external services

---

## 📊 Monitoring & Observability

- **OpenTelemetry**: Distributed tracing
- **Prometheus**: Metrics collection
- **Sentry**: Error tracking and performance monitoring
- **Structured Logging**: JSON logs with request context
- **Health Checks**: `/health` and `/metrics` endpoints

---

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest tests/

# Frontend tests
cd frontend
npm run test
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](./backend/CONTRIBUTING.md) for development guidelines.

---

## 📝 License

This project is proprietary software. All rights reserved.

---

## 🆘 Support

For deployment issues, see [DEPLOYMENT_QUICKSTART.md](./DEPLOYMENT_QUICKSTART.md) troubleshooting section.

For other questions, check:
- Backend API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

---

**Production Status**: ✅ Fully deployed and operational

**Server**: `ssh root@139.59.95.13`
