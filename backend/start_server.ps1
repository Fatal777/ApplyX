# Backend server startup script - Minimal PDF Editor
Set-Location $PSScriptRoot
C:/Python314/python.exe -m uvicorn app.main_minimal:app --reload --port 8000
