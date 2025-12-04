# Makefile for ApplyX Backend

.PHONY: help install dev test lint format clean docker-build docker-up docker-down deploy

help:
	@echo "ApplyX Backend - Available Commands"
	@echo "===================================="
	@echo "install      - Install dependencies"
	@echo "dev          - Run development server"
	@echo "worker       - Run Celery worker"
	@echo "flower       - Run Celery Flower"
	@echo "test         - Run tests"
	@echo "test-cov     - Run tests with coverage"
	@echo "lint         - Run linters"
	@echo "format       - Format code with Black"
	@echo "clean        - Clean temporary files"
	@echo "docker-build - Build Docker images"
	@echo "docker-up    - Start Docker containers"
	@echo "docker-down  - Stop Docker containers"
	@echo "init-db      - Initialize database"
	@echo "migrate      - Run database migrations"
	@echo "admin        - Create admin user"
	@echo "openapi      - Generate OpenAPI spec"

install:
	pip install -r requirements.txt
	python -m spacy download en_core_web_sm

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

worker:
	celery -A app.tasks.celery_app worker --loglevel=info

flower:
	celery -A app.tasks.celery_app flower --port=5555

test:
	pytest -v

test-cov:
	pytest --cov=app --cov-report=html --cov-report=term

lint:
	flake8 app/
	mypy app/ --ignore-missing-imports

format:
	black app/ tests/

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf .pytest_cache
	rm -rf .mypy_cache
	rm -rf htmlcov
	rm -rf dist
	rm -rf build

docker-build:
	docker build -t applyx-api:latest -f Dockerfile .
	docker build -t applyx-celery:latest -f Dockerfile.celery .

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

init-db:
	python scripts/init_db.py

migrate:
	alembic upgrade head

admin:
	python scripts/create_admin.py

security-scan:
	bandit -r app/ -f json -o bandit-report.json
	safety check

openapi:
	python -c "import json; from app.main import app; print(json.dumps(app.openapi(), indent=2))" > ../openapi.json
	@echo "✅ OpenAPI spec generated at ../openapi.json"

all: install format lint test
