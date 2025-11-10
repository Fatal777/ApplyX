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
    
    # Database - Optimized for 1000+ req/s
    DATABASE_URL: str
    DB_POOL_SIZE: int = 50  # Increased for high concurrency
    DB_MAX_OVERFLOW: int = 100  # Increased overflow capacity
    
    # Redis - Optimized for caching and high throughput
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_MAX_CONNECTIONS: int = 50  # Increased for concurrent requests
    
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
    MAX_FILE_SIZE: int = 5242880  # 5MB
    ALLOWED_EXTENSIONS: str = "pdf,docx,doc,txt"
    UPLOAD_DIR: str = "/app/uploads"
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:8080,http://127.0.0.1:8080"
    CORS_ALLOW_CREDENTIALS: bool = True
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    
    # Monitoring
    SENTRY_DSN: Optional[str] = None
    
    # External Services
    CLERK_SECRET_KEY: Optional[str] = None
    CLERK_PUBLISHABLE_KEY: Optional[str] = None
    
    # AI Service Configuration
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    
    # AgentRouter Configuration (supports both env variable names)
    AGENTROUTER_API_KEY: Optional[str] = None
    AGENT_ROUTER_TOKEN: Optional[str] = None  # Alternative name from AgentRouter docs
    
    # Primary AI provider (openai or agentrouter)
    AI_PROVIDER: str = "openai"  # "openai" or "agentrouter"
    
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
    
    @validator("ALLOWED_EXTENSIONS", pre=True)
    def assemble_allowed_extensions(cls, v: str) -> str:
        """Ensure ALLOWED_EXTENSIONS is a string"""
        if isinstance(v, list):
            return ",".join(v)
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()