"""Database connection and session management"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings

# Create database engine (sync)
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,  # Verify connections before using
    echo=settings.DEBUG
)

# Create session factory (sync)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# ASYNC DATABASE SUPPORT
# ============================================================================

def get_async_database_url() -> str:
    """Convert sync database URL to async format"""
    url = settings.DATABASE_URL
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


# Create async engine
try:
    async_engine = create_async_engine(
        get_async_database_url(),
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_pre_ping=True,
        pool_recycle=settings.DB_POOL_RECYCLE,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        echo=settings.DEBUG,
    )
    
    # Create async session factory
    AsyncSessionLocal = async_sessionmaker(
        bind=async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
except Exception as e:
    # Async engine not available (missing asyncpg or other issue)
    async_engine = None
    AsyncSessionLocal = None
    import logging
    logging.getLogger(__name__).warning(f"Async database not available: {e}")


async def get_async_db():
    """Dependency for getting async database session"""
    if AsyncSessionLocal is None:
        raise RuntimeError("Async database not configured")
    
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
