"""
Async Database Connection with Connection Pooling
Optimized for single-digit millisecond latency
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool, AsyncAdaptedQueuePool
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Convert sync URL to async URL
def get_async_database_url() -> str:
    """Convert postgresql:// to postgresql+asyncpg://"""
    url = settings.DATABASE_URL
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url

# Create async engine with optimized settings
async_engine = create_async_engine(
    get_async_database_url(),
    poolclass=AsyncAdaptedQueuePool,
    pool_size=100,              # Increased for high concurrency
    max_overflow=200,           # Handle traffic spikes
    pool_pre_ping=True,         # Verify connections
    pool_recycle=300,           # Recycle connections every 5 min
    pool_timeout=10,            # Connection timeout
    echo=False,                 # Disable SQL logging in production
    # Performance optimizations
    connect_args={
        "server_settings": {
            "jit": "off",                    # Disable JIT for faster short queries
            "statement_timeout": "5000",      # 5s statement timeout
        },
        "prepared_statement_cache_size": 500,  # Cache prepared statements
    }
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,     # Don't expire objects after commit (reduces queries)
    autocommit=False,
    autoflush=False,            # Manual flush for better control
)

# Base class for models
Base = declarative_base()


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Async dependency for getting database session.
    Optimized for minimal overhead.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    """Context manager for database sessions outside of FastAPI deps."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    """Initialize database tables."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Close database connections."""
    await async_engine.dispose()
