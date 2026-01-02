"""Resume Builder API routes - CRUD with optimistic locking for multi-user concurrency"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional
import logging

from app.db.database import get_db
from app.models.user import User
from app.models.resume_builder import ResumeBuilderDocument
from app.schemas.resume_builder import (
    ResumeBuilderCreate,
    ResumeBuilderUpdate,
    ResumeBuilderPatch,
    ResumeBuilderDocumentResponse,
    ResumeBuilderListItem,
    ResumeBuilderListResponse,
)
from app.api.dependencies import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/resume-builder", tags=["Resume Builder"])


@router.post("/", response_model=ResumeBuilderDocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    data: ResumeBuilderCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new resume builder document"""
    
    document = ResumeBuilderDocument(
        user_id=current_user.id,
        title=data.title,
        template_id=data.template_id,
        content=data.content,
        version=1,
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    logger.info(f"Created resume builder document {document.id} for user {current_user.id}")
    return document


@router.get("/", response_model=ResumeBuilderListResponse)
async def list_documents(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all resume builder documents for the current user"""
    
    query = db.query(ResumeBuilderDocument).filter(
        ResumeBuilderDocument.user_id == current_user.id
    )
    
    total = query.count()
    documents = query.order_by(
        ResumeBuilderDocument.updated_at.desc()
    ).offset(skip).limit(limit).all()
    
    return ResumeBuilderListResponse(
        total=total,
        documents=[ResumeBuilderListItem.model_validate(d) for d in documents]
    )


@router.get("/{document_id}", response_model=ResumeBuilderDocumentResponse)
async def get_document(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific resume builder document"""
    
    document = db.query(ResumeBuilderDocument).filter(
        and_(
            ResumeBuilderDocument.id == document_id,
            ResumeBuilderDocument.user_id == current_user.id
        )
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return document


@router.put("/{document_id}", response_model=ResumeBuilderDocumentResponse)
async def update_document(
    document_id: int,
    data: ResumeBuilderUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a resume builder document with optimistic locking
    
    The update will fail with 409 Conflict if the version doesn't match,
    indicating that another user has modified the document.
    """
    
    # Find the document
    document = db.query(ResumeBuilderDocument).filter(
        and_(
            ResumeBuilderDocument.id == document_id,
            ResumeBuilderDocument.user_id == current_user.id
        )
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check version for optimistic locking
    if document.version != data.version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "Conflict",
                "message": "The document was modified by another user. Please refresh and try again.",
                "current_version": document.version,
                "your_version": data.version
            }
        )
    
    # Apply updates
    if data.title is not None:
        document.title = data.title
    if data.template_id is not None:
        document.template_id = data.template_id
    if data.content is not None:
        document.content = data.content
    
    # Increment version
    document.version += 1
    
    db.commit()
    db.refresh(document)
    
    logger.info(f"Updated resume builder document {document_id} to version {document.version}")
    return document


@router.patch("/{document_id}", response_model=ResumeBuilderDocumentResponse)
async def patch_document(
    document_id: int,
    data: ResumeBuilderPatch,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Partial update of document content (e.g., update just 'personal' section)
    
    Uses optimistic locking with version field.
    """
    
    document = db.query(ResumeBuilderDocument).filter(
        and_(
            ResumeBuilderDocument.id == document_id,
            ResumeBuilderDocument.user_id == current_user.id
        )
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check version
    if document.version != data.version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "Conflict",
                "message": "The document was modified by another user. Please refresh and try again.",
                "current_version": document.version,
                "your_version": data.version
            }
        )
    
    # Update the specific path in content
    content = document.content.copy() if document.content else {}
    content[data.path] = data.value
    document.content = content
    
    # Increment version
    document.version += 1
    
    db.commit()
    db.refresh(document)
    
    logger.info(f"Patched resume builder document {document_id} path '{data.path}'")
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a resume builder document"""
    
    document = db.query(ResumeBuilderDocument).filter(
        and_(
            ResumeBuilderDocument.id == document_id,
            ResumeBuilderDocument.user_id == current_user.id
        )
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    db.delete(document)
    db.commit()
    
    logger.info(f"Deleted resume builder document {document_id} for user {current_user.id}")


@router.post("/{document_id}/duplicate", response_model=ResumeBuilderDocumentResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_document(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Duplicate a resume builder document"""
    
    original = db.query(ResumeBuilderDocument).filter(
        and_(
            ResumeBuilderDocument.id == document_id,
            ResumeBuilderDocument.user_id == current_user.id
        )
    ).first()
    
    if not original:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    duplicate = ResumeBuilderDocument(
        user_id=current_user.id,
        title=f"{original.title} (Copy)",
        template_id=original.template_id,
        content=original.content.copy() if original.content else {},
        version=1,
    )
    
    db.add(duplicate)
    db.commit()
    db.refresh(duplicate)
    
    logger.info(f"Duplicated resume builder document {document_id} -> {duplicate.id}")
    return duplicate
