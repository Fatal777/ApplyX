"""Pydantic schemas for Resume Builder API"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


# =========== Request Schemas ===========

class ResumeBuilderCreate(BaseModel):
    """Schema for creating a new resume builder document"""
    title: str = Field(default="Untitled Resume", max_length=255)
    template_id: Optional[str] = None
    content: Dict[str, Any] = Field(default_factory=dict)


class ResumeBuilderUpdate(BaseModel):
    """Schema for updating a resume builder document
    
    Requires `version` for optimistic locking - the update will fail
    if the version doesn't match the current database version.
    """
    title: Optional[str] = Field(default=None, max_length=255)
    template_id: Optional[str] = None
    content: Optional[Dict[str, Any]] = None
    version: int = Field(..., description="Current version for optimistic locking")


class ResumeBuilderPatch(BaseModel):
    """Schema for partial content update (e.g., updating just personal info)
    
    Useful for real-time autosave of individual sections.
    """
    path: str = Field(..., description="JSON path to update, e.g., 'personal' or 'education'")
    value: Any = Field(..., description="New value for the path")
    version: int = Field(..., description="Current version for optimistic locking")


# =========== Response Schemas ===========

class ResumeBuilderDocumentResponse(BaseModel):
    """Response schema for a single resume builder document"""
    id: int
    user_id: int
    title: str
    template_id: Optional[str]
    content: Dict[str, Any]
    version: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        

class ResumeBuilderListItem(BaseModel):
    """Lightweight response for document lists (without full content)"""
    id: int
    title: str
    template_id: Optional[str]
    version: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ResumeBuilderListResponse(BaseModel):
    """Response schema for listing documents"""
    total: int
    documents: List[ResumeBuilderListItem]


class ConflictErrorResponse(BaseModel):
    """Response when optimistic locking fails (version conflict)"""
    error: str = "Conflict"
    message: str = "The document was modified by another user. Please refresh and try again."
    current_version: int
    your_version: int
