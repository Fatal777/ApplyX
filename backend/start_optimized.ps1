# Production startup script for optimized backend (Windows)
# Target: Sub-10ms API response times

# Set production environment
$env:ENVIRONMENT = "production"
$env:DEBUG = "false"
$env:LOG_LEVEL = "WARNING"

# Performance tuning
$env:PYTHONDONTWRITEBYTECODE = "1"
$env:PYTHONUNBUFFERED = "1"

# Start with optimized settings
# Note: uvloop is not available on Windows, using default loop
uvicorn app.main_optimized:app `
    --host 0.0.0.0 `
    --port 8000 `
    --workers 4 `
    --http httptools `
    --no-access-log `
    --log-level warning `
    --timeout-keep-alive 30 `
    --limit-concurrency 1000 `
    --backlog 2048
