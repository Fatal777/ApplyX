"""
High-Performance Redis Cache Layer
Async Redis with connection pooling for sub-millisecond caching
"""

import redis.asyncio as aioredis
from redis.asyncio.connection import ConnectionPool
from typing import Optional, Any, TypeVar, Callable
from functools import wraps
import json
import pickle
import hashlib
import logging
from datetime import timedelta

from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar('T')

# =============================================================================
# ASYNC REDIS CONNECTION POOL
# =============================================================================

_redis_pool: Optional[ConnectionPool] = None
_redis_client: Optional[aioredis.Redis] = None


async def get_redis_pool() -> ConnectionPool:
    """Get or create Redis connection pool."""
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = ConnectionPool.from_url(
            settings.REDIS_URL,
            max_connections=settings.REDIS_MAX_CONNECTIONS,
            decode_responses=False,  # We'll handle encoding ourselves
            socket_timeout=1.0,      # 1 second timeout
            socket_connect_timeout=1.0,
            retry_on_timeout=True,
        )
    return _redis_pool


async def get_redis() -> aioredis.Redis:
    """Get Redis client with connection pool."""
    global _redis_client
    if _redis_client is None:
        pool = await get_redis_pool()
        _redis_client = aioredis.Redis(connection_pool=pool)
    return _redis_client


async def close_redis():
    """Close Redis connections."""
    global _redis_client, _redis_pool
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
    if _redis_pool:
        await _redis_pool.disconnect()
        _redis_pool = None


# =============================================================================
# CACHE KEY GENERATION
# =============================================================================

def make_cache_key(prefix: str, *args, **kwargs) -> str:
    """Generate consistent cache key from arguments."""
    key_parts = [prefix]
    
    for arg in args:
        if isinstance(arg, (dict, list)):
            key_parts.append(hashlib.md5(json.dumps(arg, sort_keys=True).encode()).hexdigest()[:8])
        else:
            key_parts.append(str(arg))
    
    for k, v in sorted(kwargs.items()):
        key_parts.append(f"{k}={v}")
    
    return ":".join(key_parts)


# =============================================================================
# FAST CACHE OPERATIONS
# =============================================================================

class FastCache:
    """
    High-performance cache operations.
    Uses msgpack/pickle for fast serialization.
    """
    
    def __init__(self, prefix: str = "cache"):
        self.prefix = prefix
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache. Returns None if not found or error."""
        try:
            redis = await get_redis()
            full_key = f"{self.prefix}:{key}"
            data = await redis.get(full_key)
            if data:
                return pickle.loads(data)
            return None
        except Exception as e:
            logger.debug(f"Cache get error: {e}")
            return None
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl: int = 300  # 5 minutes default
    ) -> bool:
        """Set value in cache with TTL."""
        try:
            redis = await get_redis()
            full_key = f"{self.prefix}:{key}"
            data = pickle.dumps(value, protocol=pickle.HIGHEST_PROTOCOL)
            await redis.setex(full_key, ttl, data)
            return True
        except Exception as e:
            logger.debug(f"Cache set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        try:
            redis = await get_redis()
            full_key = f"{self.prefix}:{key}"
            await redis.delete(full_key)
            return True
        except Exception as e:
            logger.debug(f"Cache delete error: {e}")
            return False
    
    async def get_many(self, keys: list) -> dict:
        """Get multiple values at once (pipeline)."""
        try:
            redis = await get_redis()
            full_keys = [f"{self.prefix}:{k}" for k in keys]
            
            async with redis.pipeline() as pipe:
                for fk in full_keys:
                    pipe.get(fk)
                results = await pipe.execute()
            
            return {
                keys[i]: pickle.loads(r) if r else None
                for i, r in enumerate(results)
            }
        except Exception as e:
            logger.debug(f"Cache get_many error: {e}")
            return {}
    
    async def set_many(self, items: dict, ttl: int = 300) -> bool:
        """Set multiple values at once (pipeline)."""
        try:
            redis = await get_redis()
            
            async with redis.pipeline() as pipe:
                for key, value in items.items():
                    full_key = f"{self.prefix}:{key}"
                    data = pickle.dumps(value, protocol=pickle.HIGHEST_PROTOCOL)
                    pipe.setex(full_key, ttl, data)
                await pipe.execute()
            
            return True
        except Exception as e:
            logger.debug(f"Cache set_many error: {e}")
            return False


# =============================================================================
# CACHE DECORATOR
# =============================================================================

def cached(
    ttl: int = 300,
    prefix: str = "fn",
    key_builder: Optional[Callable] = None
):
    """
    Decorator for caching async function results.
    
    Usage:
        @cached(ttl=60, prefix="user")
        async def get_user(user_id: int):
            ...
    """
    cache = FastCache(prefix)
    
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            # Generate cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                cache_key = make_cache_key(func.__name__, *args, **kwargs)
            
            # Try cache first
            cached_value = await cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Cache result (don't await, fire and forget)
            await cache.set(cache_key, result, ttl)
            
            return result
        
        # Add cache management methods
        wrapper.cache = cache
        wrapper.invalidate = lambda *a, **kw: cache.delete(
            key_builder(*a, **kw) if key_builder else make_cache_key(func.__name__, *a, **kw)
        )
        
        return wrapper
    
    return decorator


# =============================================================================
# SPECIALIZED CACHES
# =============================================================================

# Pre-configured caches for different data types
user_cache = FastCache("user")
job_cache = FastCache("job")
session_cache = FastCache("session")
api_cache = FastCache("api")


# =============================================================================
# CACHE WARMING
# =============================================================================

async def warm_cache():
    """Pre-warm cache with frequently accessed data."""
    try:
        redis = await get_redis()
        await redis.ping()
        logger.info("Redis cache connected and ready")
    except Exception as e:
        logger.warning(f"Redis cache unavailable: {e}")
