# ApplyX Resume Analyzer - Backend API

A secure, scalable backend microservice for resume upload, parsing, NLP analysis, and feedback generation.

## 🚀 Features

- **Secure Authentication**: JWT-based authentication with password strength validation
- **Resume Upload & Processing**: Support for PDF, DOCX, and TXT files
- **NLP Analysis**: Keyword extraction, section identification, skills detection
- **Feedback Generation**: Actionable insights and improvement suggestions
- **Async Processing**: Celery-based background task processing
- **Cloud Storage**: AWS S3, Cloudinary, or local storage support
- **Comprehensive Security**: 
  - File validation and malware scanning
  - Data encryption at rest (AES-256)
  - Rate limiting
  - Security headers
  - Audit logging
- **Scalable Architecture**: Docker and Kubernetes ready
- **API Documentation**: Auto-generated OpenAPI/Swagger docs

## 📋 Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

## 🛠️ Installation

### Local Development

1. **Clone the repository**
```bash
git clone <repository-url>
cd applyx/backend
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

4. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Initialize database**
```bash
# The application will auto-create tables on startup
# Or use Alembic for migrations:
alembic upgrade head
```

6. **Run the application**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

7. **Run Celery worker** (in separate terminal)
```bash
celery -A app.tasks.celery_app worker --loglevel=info
```

### Docker Deployment

1. **Using Docker Compose**
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis cache
- FastAPI application
- Celery worker
- Flower (Celery monitoring)

2. **Access services**
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Flower: http://localhost:5555

### Kubernetes Deployment

1. **Apply Kubernetes manifests**
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/pvc.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml
```

2. **Check deployment status**
```bash
kubectl get pods -n applyx
kubectl get services -n applyx
```

## 🔧 Configuration

### Environment Variables

Key environment variables (see `.env.example` for full list):

```env
# Security
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/applyx

# Redis
REDIS_URL=redis://localhost:6379/0

# Storage (choose one)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
S3_BUCKET_NAME=your-bucket

# File Upload
MAX_FILE_SIZE=5242880  # 5MB
ALLOWED_EXTENSIONS=pdf,docx,doc,txt

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000
```

## 📚 API Documentation

### Authentication

**Register User**
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

**Login**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

Response:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

### Resume Management

**Upload Resume**
```http
POST /api/v1/resumes/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <resume.pdf>
```

**List Resumes**
```http
GET /api/v1/resumes/?skip=0&limit=10
Authorization: Bearer <token>
```

**Get Resume Details**
```http
GET /api/v1/resumes/{resume_id}
Authorization: Bearer <token>
```

**Delete Resume**
```http
DELETE /api/v1/resumes/{resume_id}
Authorization: Bearer <token>
```

**Check Processing Status**
```http
GET /api/v1/resumes/{resume_id}/status
Authorization: Bearer <token>
```

## 🧪 Testing

### Run all tests
```bash
pytest
```

### Run with coverage
```bash
pytest --cov=app --cov-report=html
```

### Run specific test file
```bash
pytest tests/test_auth.py -v
```

### Run security tests
```bash
pytest tests/test_security.py -v
```

## 🔒 Security Features

### File Upload Security
- File type validation (extension + magic bytes)
- File size limits (5MB default)
- Malware scanning
- Filename sanitization
- Secure file storage

### Authentication & Authorization
- JWT tokens with expiration
- Password strength validation
- Bcrypt password hashing
- Token refresh mechanism

### Data Protection
- AES-256 encryption for sensitive data
- HTTPS/TLS enforcement
- Security headers (HSTS, CSP, etc.)
- SQL injection prevention
- XSS protection

### Rate Limiting
- Per-minute and per-hour limits
- IP-based tracking
- Configurable thresholds

### Audit Logging
- All security events logged
- User actions tracked
- Malware detection alerts
- Unauthorized access attempts

## 📊 Monitoring

### Health Check
```http
GET /health
```

### Celery Monitoring (Flower)
Access Flower dashboard at `http://localhost:5555`

### Logs
- Application logs: `logs/app.log`
- Audit logs: `logs/audit.log`

## 🚀 Deployment

### Free Tier Options

1. **Railway**
```bash
railway login
railway init
railway up
```

2. **Heroku**
```bash
heroku create applyx-api
heroku addons:create heroku-postgresql:mini
heroku addons:create heroku-redis:mini
git push heroku main
```

3. **Render**
- Connect GitHub repository
- Configure environment variables
- Deploy automatically on push

### Production Checklist

- [ ] Set `DEBUG=False`
- [ ] Use strong secret keys
- [ ] Configure HTTPS/TLS
- [ ] Set up database backups
- [ ] Configure monitoring/alerting
- [ ] Enable rate limiting
- [ ] Review security headers
- [ ] Set up log aggregation
- [ ] Configure auto-scaling
- [ ] Test disaster recovery

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│   FastAPI    │────▶│  PostgreSQL │
│  (Frontend) │     │     API      │     │  Database   │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    Redis     │
                    │ Cache/Queue  │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐     ┌─────────────┐
                    │    Celery    │────▶│   Storage   │
                    │    Worker    │     │  (S3/Cloud) │
                    └──────────────┘     └─────────────┘
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Code Style
- Follow PEP 8
- Use Black for formatting
- Run Flake8 for linting
- Add type hints where possible
- Write tests for new features

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Open an issue on GitHub
- Check documentation at `/docs`
- Review API specs at `/redoc`

## 🔄 Version History

- **v1.0.0** - Initial release
  - User authentication
  - Resume upload and analysis
  - NLP processing
  - Feedback generation
  - Docker and K8s support

## 🎯 Roadmap

- [ ] Advanced NLP models
- [ ] Multi-language support
- [ ] Resume templates
- [ ] Job matching
- [ ] Interview preparation
- [ ] ATS optimization
- [ ] LinkedIn integration
- [ ] Cover letter generation
