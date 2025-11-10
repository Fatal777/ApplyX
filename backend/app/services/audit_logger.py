"""Audit logging service for security events"""

import logging
from datetime import datetime
from typing import Dict, Any, Optional
import json
from enum import Enum

logger = logging.getLogger(__name__)


class AuditEventType(str, Enum):
    """Types of audit events"""
    USER_REGISTERED = "user_registered"
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    LOGIN_FAILED = "login_failed"
    FILE_UPLOADED = "file_uploaded"
    FILE_DELETED = "file_deleted"
    FILE_SCANNED = "file_scanned"
    MALWARE_DETECTED = "malware_detected"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    PERMISSION_DENIED = "permission_denied"
    DATA_ACCESSED = "data_accessed"
    DATA_MODIFIED = "data_modified"
    SECURITY_ALERT = "security_alert"


class AuditLogger:
    """Service for logging security and audit events"""
    
    def __init__(self):
        self.logger = logging.getLogger("audit")
        
        # Create separate audit log handler
        audit_handler = logging.FileHandler("logs/audit.log")
        audit_handler.setFormatter(
            logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        )
        self.logger.addHandler(audit_handler)
        self.logger.setLevel(logging.INFO)
    
    def log_event(
        self,
        event_type: AuditEventType,
        user_id: Optional[int] = None,
        username: Optional[str] = None,
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        severity: str = "INFO"
    ):
        """Log an audit event"""
        
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type.value,
            "user_id": user_id,
            "username": username,
            "ip_address": ip_address,
            "details": details or {},
            "severity": severity
        }
        
        log_message = json.dumps(event)
        
        if severity == "CRITICAL":
            self.logger.critical(log_message)
        elif severity == "ERROR":
            self.logger.error(log_message)
        elif severity == "WARNING":
            self.logger.warning(log_message)
        else:
            self.logger.info(log_message)
    
    def log_user_registration(self, user_id: int, username: str, email: str, ip_address: str):
        """Log user registration event"""
        self.log_event(
            AuditEventType.USER_REGISTERED,
            user_id=user_id,
            username=username,
            ip_address=ip_address,
            details={"email": email}
        )
    
    def log_user_login(self, user_id: int, username: str, ip_address: str, success: bool):
        """Log user login attempt"""
        event_type = AuditEventType.USER_LOGIN if success else AuditEventType.LOGIN_FAILED
        severity = "INFO" if success else "WARNING"
        
        self.log_event(
            event_type,
            user_id=user_id,
            username=username,
            ip_address=ip_address,
            details={"success": success},
            severity=severity
        )
    
    def log_file_upload(self, user_id: int, filename: str, file_size: int, file_type: str):
        """Log file upload event"""
        self.log_event(
            AuditEventType.FILE_UPLOADED,
            user_id=user_id,
            details={
                "filename": filename,
                "file_size": file_size,
                "file_type": file_type
            }
        )
    
    def log_malware_detection(
        self,
        user_id: int,
        filename: str,
        file_hash: str,
        reason: str,
        ip_address: str
    ):
        """Log malware detection event"""
        self.log_event(
            AuditEventType.MALWARE_DETECTED,
            user_id=user_id,
            ip_address=ip_address,
            details={
                "filename": filename,
                "file_hash": file_hash,
                "reason": reason
            },
            severity="CRITICAL"
        )
    
    def log_rate_limit_exceeded(self, ip_address: str, endpoint: str):
        """Log rate limit exceeded event"""
        self.log_event(
            AuditEventType.RATE_LIMIT_EXCEEDED,
            ip_address=ip_address,
            details={"endpoint": endpoint},
            severity="WARNING"
        )
    
    def log_unauthorized_access(
        self,
        user_id: Optional[int],
        ip_address: str,
        endpoint: str,
        reason: str
    ):
        """Log unauthorized access attempt"""
        self.log_event(
            AuditEventType.UNAUTHORIZED_ACCESS,
            user_id=user_id,
            ip_address=ip_address,
            details={
                "endpoint": endpoint,
                "reason": reason
            },
            severity="WARNING"
        )
    
    def log_security_alert(self, alert_type: str, details: Dict[str, Any]):
        """Log security alert"""
        self.log_event(
            AuditEventType.SECURITY_ALERT,
            details={
                "alert_type": alert_type,
                **details
            },
            severity="ERROR"
        )


# Singleton instance
audit_logger = AuditLogger()
