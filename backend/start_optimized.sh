#!/bin/bash
# Production startup script for optimized backend
# Target: Sub-10ms API response times

# Set production environment
export ENVIRONMENT=production
export DEBUG=false
export LOG_LEVEL=WARNING

# Performance tuning
export PYTHONDONTWRITEBYTECODE=1
export PYTHONUNBUFFERED=1

# Start with optimized settings
uvicorn app.main_optimized:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4 \
    --loop uvloop \
    --http httptools \
    --no-access-log \
    --log-level warning \
    --timeout-keep-alive 30 \
    --limit-concurrency 1000 \
    --backlog 2048
