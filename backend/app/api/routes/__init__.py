"""API route modules"""

from app.api.routes import auth, resumes, pdf_edit, jobs, interview, profile, applications

__all__ = [
    "auth",
    "resumes",
    "pdf_edit",
    "jobs",
    "interview",
    "profile",
    "applications",
]
