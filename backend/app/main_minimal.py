"""Minimal FastAPI app for PDF editing only"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import pdf_edit

app = FastAPI(
    title="ApplyX PDF Editor",
    description="PDF editing API",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(pdf_edit.router, prefix="/api/v1", tags=["pdf"])

@app.get("/")
async def root():
    return {"message": "PDF Editor API is running", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
