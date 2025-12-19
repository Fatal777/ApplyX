"""Application configuration management"""

from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import validator
import secrets
import os


class Settings(BaseSettings):
    """Application settings with validation"""
    
    # Application
    APP_NAME: str = "ApplyX Resume Analyzer"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    
    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    JWT_SECRET_KEY: str = secrets.token_urlsafe(32)
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ENCRYPTION_KEY: str = secrets.token_urlsafe(32)
    
    # Admin Dashboard Credentials (change in production!)
    ADMIN_USERNAME: str = "applyx_admin"
    ADMIN_PASSWORD: str = "SecureAdminPass2024!"
    
    # Database - Optimized for sub-10ms latency
    DATABASE_URL: str
    DB_POOL_SIZE: int = 100         # High pool for concurrent requests
    DB_MAX_OVERFLOW: int = 200      # Handle traffic spikes
    DB_POOL_TIMEOUT: int = 10       # Connection timeout
    DB_POOL_RECYCLE: int = 300      # Recycle every 5 min
    
    # Redis - Optimized for sub-ms caching
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_MAX_CONNECTIONS: int = 100  # High connection pool
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    
    # AWS S3
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: Optional[str] = None
    S3_ENDPOINT_URL: Optional[str] = None
    
    # Cloudinary
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None
    
    # Supabase
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    SUPABASE_JWT_SECRET: Optional[str] = None
    SUPABASE_PROJECT_REF: Optional[str] = None
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB
    MAX_FILE_SIZE: int = 5 * 1024 * 1024  # 5MB (alias for MAX_UPLOAD_SIZE)
    ALLOWED_EXTENSIONS: str = "pdf,docx,doc,txt"  # Comma-separated string
    UPLOAD_DIR: str = "/app/uploads"
    
    @property
    def allowed_extensions_list(self) -> list:
        """Get allowed extensions as a list."""
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",")]
    
    # ScrapingBee API (Free Tier: 1,000 API calls/month)
    SCRAPINGBEE_API_KEY: Optional[str] = None
    
    # Celery Configuration for Automated Scraping
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    UPLOAD_DIR: str = "/app/uploads"
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:8080,http://127.0.0.1:8080,https://applyx.in,https://www.applyx.in,https://api.applyx.in"
    CORS_ALLOW_CREDENTIALS: bool = True
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    LOG_JSON_FORMAT: bool = True  # JSON logs for production
    
    # Monitoring - Sentry
    SENTRY_DSN: Optional[str] = None
    SENTRY_ENVIRONMENT: str = "development"
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1  # 10% of transactions
    SENTRY_PROFILES_SAMPLE_RATE: float = 0.1  # 10% for profiling
    
    # OpenTelemetry Configuration
    OTEL_ENABLED: bool = True
    OTEL_EXPORTER_OTLP_ENDPOINT: Optional[str] = None  # e.g., "http://otel-collector:4317"
    OTEL_EXPORTER_INSECURE: bool = True
    OTEL_SERVICE_NAME: str = "applyx-api"
    
    # Prometheus Metrics
    PROMETHEUS_ENABLED: bool = True
    PROMETHEUS_MULTIPROC_DIR: Optional[str] = None  # Set for multiprocess mode
    
    # External Services
    CLERK_SECRET_KEY: Optional[str] = None
    CLERK_PUBLISHABLE_KEY: Optional[str] = None
    
    # AI Service Configuration
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    
    # Gemini AI Configuration (Budget-optimized interview platform)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.0-flash-exp"  # Fast and cost-effective
    GEMINI_MAX_CONCURRENT: int = 10  # Concurrency limit
    
    # AgentRouter Configuration (supports both env variable names)
    AGENTROUTER_API_KEY: Optional[str] = None
    AGENT_ROUTER_TOKEN: Optional[str] = None  # Alternative name from AgentRouter docs
    AGENTROUTER_BASE_URL: Optional[str] = None  # AgentRouter base URL
    AGENTROUTER_MODEL: Optional[str] = None  # AgentRouter model name
    
    # Primary AI provider (openai or agentrouter)
    AI_PROVIDER: str = "openai"  # "openai" or "agentrouter"
    
    # Deepgram STT for Interview Platform (Budget-optimized)
    DEEPGRAM_API_KEY: Optional[str] = None
    DEEPGRAM_MODEL: str = "nova-2"  # High-accuracy model
    
    # ElevenLabs TTS for Interview Platform (Legacy - will be replaced with edge-tts)
    ELEVENLABS_API_KEY: Optional[str] = None
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"  # Rachel - professional voice

    # Razorpay Payment Gateway
    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None
    RAZORPAY_WEBHOOK_SECRET: Optional[str] = None

    # OTP Verification Services
    # MSG91 (Primary) - Sign up: https://msg91.com/
    MSG91_AUTH_KEY: Optional[str] = None
    MSG91_SENDER_ID: str = "ApplyX"
    MSG91_TEMPLATE_ID: Optional[str] = None
    
    # Fast2SMS (Fallback) - Sign up: https://fast2sms.com/
    FAST2SMS_API_KEY: Optional[str] = None

    # Cashfree Payment Gateway (Backup) - Sign up: https://cashfree.com/
    CASHFREE_APP_ID: Optional[str] = None
    CASHFREE_SECRET_KEY: Optional[str] = None
    CASHFREE_SANDBOX: bool = True  # Set False for production

    # PayPal (International) - Sign up: https://developer.paypal.com/
    PAYPAL_CLIENT_ID: Optional[str] = None
    PAYPAL_CLIENT_SECRET: Optional[str] = None
    PAYPAL_MODE: str = "sandbox"  # sandbox or live

    # Mobile Payment Deep Linking
    APP_SCHEME: str = "applyx"  # For mobile app deep linking
    PAYMENT_CALLBACK_URL: Optional[str] = None  # Frontend callback URL

    # Job Portal API Keys / Config
    # Adzuna API (free tier: 250 calls/month, supports India)
    ADZUNA_APP_ID: Optional[str] = None
    ADZUNA_APP_KEY: Optional[str] = None
    
    # JSearch RapidAPI (free tier: 200 requests/month, aggregates LinkedIn/Indeed/Glassdoor)
    JSEARCH_RAPIDAPI_KEY: Optional[str] = None
    
    # Unified RapidAPI Key (shared across all RapidAPI sources)
    # Used for: Indeed, Glassdoor, SimplyHired, JSearch
    # Free: 500 req/month, Pro: 10,000 req/month
    RAPIDAPI_KEY: Optional[str] = None
    
    # Remotive API (free, no auth needed)
    # No API key required
    
    # Legacy keys (kept for backward compatibility)
    INDEED_API_KEY: Optional[str] = None
    LINKEDIN_RAPIDAPI_KEY: Optional[str] = None
    INTERNSHALA_API_KEY: Optional[str] = None
    
    # Job portal settings
    JOB_PORTAL_DEFAULT_LOCATION: str = "India"
    JOB_PORTAL_RATE_LIMIT_BUFFER: int = 2  # Additional buffer below hard limit per portal
    JOB_CACHE_TTL_HOURS: int = 4  # How long to cache job listings
    JOB_RECOMMENDATIONS_TTL_HOURS: int = 24  # How long to cache recommendations
    
    @property
    def AGENTROUTER_KEY(self) -> Optional[str]:
        """Return AgentRouter API key from either environment variable"""
        return self.AGENTROUTER_API_KEY or self.AGENT_ROUTER_TOKEN or os.getenv('AGENT_ROUTER_TOKEN') or os.getenv('AGENTROUTER_API_KEY')
    
    @validator("CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: str) -> str:
        """Ensure CORS_ORIGINS is a string"""
        if isinstance(v, list):
            return ",".join(v)
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()