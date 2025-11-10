#!/bin/bash

# Test setup script for local development

echo "🚀 ApplyX Backend Setup Test"
echo "=============================="

# Check Python version
echo "✓ Checking Python version..."
python --version

# Check if virtual environment is activated
if [[ "$VIRTUAL_ENV" != "" ]]; then
    echo "✓ Virtual environment is activated"
else
    echo "⚠ Warning: Virtual environment is not activated"
fi

# Check if .env file exists
if [ -f .env ]; then
    echo "✓ .env file exists"
else
    echo "⚠ Warning: .env file not found. Copying from .env.example..."
    cp .env.example .env
fi

# Check PostgreSQL connection
echo "✓ Checking PostgreSQL connection..."
python -c "from app.db.database import engine; engine.connect()" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✓ PostgreSQL connection successful"
else
    echo "✗ PostgreSQL connection failed"
fi

# Check Redis connection
echo "✓ Checking Redis connection..."
python -c "import redis; from app.core.config import settings; r = redis.from_url(settings.REDIS_URL); r.ping()" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✓ Redis connection successful"
else
    echo "✗ Redis connection failed"
fi

# Check if spaCy model is installed
echo "✓ Checking spaCy model..."
python -c "import spacy; spacy.load('en_core_web_sm')" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✓ spaCy model installed"
else
    echo "⚠ spaCy model not found. Installing..."
    python -m spacy download en_core_web_sm
fi

# Run tests
echo "✓ Running tests..."
pytest tests/ -v

echo ""
echo "=============================="
echo "Setup test complete!"
