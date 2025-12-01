"""Resume upload and management routes"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import tempfile
import logging
from app.db.database import get_db
from app.models.user import User
from app.models.resume import Resume
from app.schemas.resume import (
    ResumeUploadResponse,
    ResumeResponse,
    ResumeDetailResponse,
    ResumeListResponse
)
from app.api.dependencies import get_current_active_user
from app.core.config import settings
from app.core.security import validate_file_type, sanitize_filename, generate_secure_filename
from app.services.storage import get_storage_service
from app.tasks.resume_tasks import process_resume_task
from app.middleware.security import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/resumes", tags=["Resumes"])


@router.post("/upload", response_model=ResumeUploadResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")  # Rate limit file uploads
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    job_description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Upload a resume file for analysis
    - Validates file type and size
    - Stores file securely
    - Triggers async processing
    - Optional: Job description for targeted analysis
    """
    
    # Validate file extension
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )
    
    file_ext = file.filename.rsplit('.', 1)[-1].lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Validate file size
    if file_size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    
    if file_size < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is too small or empty"
        )
    
    # Validate file type by magic bytes
    if not validate_file_type(file.filename, content):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type or corrupted file"
        )
    
    # Generate secure filename
    secure_filename = generate_secure_filename(file.filename)
    
    # Save file temporarily
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, secure_filename)
    storage_service = None
    
    try:
        with open(temp_path, 'wb') as f:
            f.write(content)
        
        # Upload to cloud storage
        storage_service = get_storage_service()
        storage_path = f"resumes/{current_user.id}/{secure_filename}"
        file_url = storage_service.upload_file(temp_path, storage_path)
        
        # Create resume record
        resume = Resume(
            user_id=current_user.id,
            original_filename=sanitize_filename(file.filename),
            stored_filename=secure_filename,
            file_path=file_url,  # file_url contains the correct path for all storage services
            file_size=file_size,
            file_type=file_ext,
            status="uploaded",
            job_description=job_description if job_description else None
        )
        
        db.add(resume)
        db.commit()
        db.refresh(resume)
        
        # Trigger async processing
        process_resume_task.delay(resume.id)
        
        logger.info(f"Resume uploaded: {resume.id} by user {current_user.id}")
        
        return ResumeUploadResponse(
            id=resume.id,
            original_filename=resume.original_filename,
            file_size=resume.file_size,
            status=resume.status,
            message="Resume uploaded successfully and queued for processing"
        )
        
    except Exception as e:
        logger.error(f"Error uploading resume: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload resume: {str(e)}"
        )
    finally:
        # Clean up temp file if using cloud storage
        if storage_service and os.path.exists(temp_path) and storage_service.__class__.__name__ != 'LocalStorageService':
            try:
                os.remove(temp_path)
            except:
                pass


@router.get("/", response_model=ResumeListResponse)
async def list_resumes(
    skip: int = 0,
    limit: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get list of user's resumes"""
    
    total = db.query(Resume).filter(Resume.user_id == current_user.id).count()
    resumes = db.query(Resume).filter(
        Resume.user_id == current_user.id
    ).order_by(Resume.created_at.desc()).offset(skip).limit(limit).all()
    
    return ResumeListResponse(
        total=total,
        resumes=resumes
    )


@router.get("/{resume_id}", response_model=ResumeDetailResponse)
async def get_resume(
    resume_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get detailed resume analysis"""
    
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    return resume


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(
    resume_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a resume"""
    
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    try:
        # Delete file from storage - reconstruct the storage path with user_id
        storage_service = get_storage_service()
        storage_path = f"resumes/{resume.user_id}/{resume.stored_filename}"
        storage_service.delete_file(storage_path)
        
        # Delete from database
        db.delete(resume)
        db.commit()
        
        logger.info(f"Resume deleted: {resume_id} by user {current_user.id}")
        
    except Exception as e:
        logger.error(f"Error deleting resume: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete resume"
        )


@router.get("/{resume_id}/status")
async def get_resume_status(
    resume_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get resume processing status"""
    
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    return {
        "id": resume.id,
        "status": resume.status,
        "created_at": resume.created_at,
        "processed_at": resume.processed_at
    }


@router.post("/{resume_id}/generate-suggestions")
@limiter.limit("5/minute")  # Rate limit AI-intensive operations
async def generate_ai_suggestions(
    request: Request,
    resume_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate AI-powered suggestions for a resume using GPT-5
    """
    from app.services.ai_service import ai_service
    from app.core.security import decrypt_sensitive_data
    import asyncio
    
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    if not resume.extracted_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume has not been processed yet. Please wait for processing to complete."
        )
    
    # Check if extracted_text is not just empty after decryption
    try:
        resume_text = decrypt_sensitive_data(resume.extracted_text)
        if not resume_text or len(resume_text.strip()) < 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume text extraction failed or insufficient content. Please re-upload the resume."
            )
    except Exception as e:
        logger.error(f"Error decrypting resume text: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error accessing resume content"
        )
    
    try:
        # Decrypt the resume text
        resume_text = decrypt_sensitive_data(resume.extracted_text)
        
        # Prepare analysis data
        analysis_data = {
            'overall_score': resume.analysis_score or 0,
            'ats_score': resume.analysis_score or 0,
            'completeness_score': 0,
            'impact_score': 0,
            'skills_score': 0
        }
        
        # Generate AI suggestions
        suggestions = await ai_service.generate_resume_suggestions(
            resume_text,
            analysis_data,
            resume.job_description
        )
        
        # Update resume with new suggestions
        if resume.suggestions:
            resume.suggestions.extend(suggestions)
        else:
            resume.suggestions = suggestions
        
        db.commit()
        
        logger.info(f"Generated {len(suggestions)} AI suggestions for resume {resume_id}")
        
        return {
            "success": True,
            "suggestions": suggestions,
            "count": len(suggestions)
        }
        
    except Exception as e:
        logger.error(f"Error generating AI suggestions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate suggestions: {str(e)}"
        )


@router.get("/{resume_id}/download")
async def download_resume(
    resume_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Download the original resume file
    """
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    # Get the file path
    storage_service = get_storage_service()
    
    logger.info(f"Resume ID: {resume.id}, User ID: {resume.user_id}")
    logger.info(f"Stored filename: {resume.stored_filename}")
    logger.info(f"File path from DB: {resume.file_path}")
    
    # For LocalStorageService, file_path is the full path on disk
    # For cloud services, file_path is the URL
    if resume.file_path and os.path.exists(resume.file_path):
        file_path = resume.file_path
        logger.info(f"Using file_path from DB: {file_path}")
    else:
        # Fallback: reconstruct the storage path with user_id
        storage_path = f"resumes/{resume.user_id}/{resume.stored_filename}"
        file_path = storage_service.get_file_path(storage_path)
        logger.info(f"Reconstructed path: {file_path}")
    
    logger.info(f"Final file path: {file_path}")
    logger.info(f"File exists: {os.path.exists(file_path)}")
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume file not found at: {file_path}"
        )
    
    # Return the file
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=resume.original_filename
    )
