#!/bin/bash
cd /home/runner/workspace/backend
export PYTHONUNBUFFERED=1
exec uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level info
