"""
Structured Logging Configuration
JSON-formatted logs for production observability
"""

import logging
import sys
import json
from datetime import datetime
from typing import Any, Dict
from pythonjsonlogger import jsonlogger


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """Custom JSON formatter with additional context"""
    
    def add_fields(self, log_record: Dict[str, Any], record: logging.LogRecord, message_dict: Dict[str, Any]) -> None:
        super().add_fields(log_record, record, message_dict)
        
        # Add timestamp
        log_record['timestamp'] = datetime.utcnow().isoformat() + 'Z'
        
        # Add service info
        log_record['service'] = 'applyx-backend'
        log_record['environment'] = 'production'  # Can be configured
        
        # Add log level
        log_record['level'] = record.levelname
        
        # Add source location
        log_record['logger'] = record.name
        log_record['file'] = record.filename
        log_record['line'] = record.lineno
        
        # Add thread/process info for debugging
        log_record['thread'] = record.thread
        log_record['process'] = record.process


def setup_logging(log_level: str = "INFO", json_logs: bool = True) -> None:
    """
    Configure structured logging for the application
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        json_logs: If True, use JSON format. If False, use human-readable format
    """
    
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    # Remove existing handlers
    root_logger.handlers = []
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, log_level.upper()))
    
    if json_logs:
        # JSON formatter for production
        formatter = CustomJsonFormatter(
            '%(timestamp)s %(level)s %(name)s %(message)s'
        )
    else:
        # Human-readable formatter for development
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # Quiet down noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


class StructuredLogger:
    """Wrapper for structured logging with context"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
    
    def _log_with_context(self, level: str, message: str, **kwargs):
        """Log with additional context fields"""
        extra = {"extra_fields": kwargs} if kwargs else {}
        getattr(self.logger, level)(message, extra=extra)
    
    def debug(self, message: str, **kwargs):
        self._log_with_context("debug", message, **kwargs)
    
    def info(self, message: str, **kwargs):
        self._log_with_context("info", message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        self._log_with_context("warning", message, **kwargs)
    
    def error(self, message: str, **kwargs):
        self._log_with_context("error", message, **kwargs)
    
    def critical(self, message: str, **kwargs):
        self._log_with_context("critical", message, **kwargs)
    
    # Convenience methods for common operations
    def log_request(self, method: str, path: str, status_code: int, duration_ms: float, **kwargs):
        """Log HTTP request"""
        self.info(
            f"{method} {path} - {status_code}",
            method=method,
            path=path,
            status_code=status_code,
            duration_ms=duration_ms,
            **kwargs
        )
    
    def log_interview_event(self, event: str, session_id: int, user_id: int, **kwargs):
        """Log interview-related event"""
        self.info(
            f"Interview {event}",
            event=event,
            session_id=session_id,
            user_id=user_id,
            **kwargs
        )
    
    def log_api_call(self, service: str, endpoint: str, latency_ms: float, success: bool, **kwargs):
        """Log external API call"""
        level = "info" if success else "error"
        self._log_with_context(
            level,
            f"{service} API call",
            service=service,
            endpoint=endpoint,
            latency_ms=latency_ms,
            success=success,
            **kwargs
        )
    
    def log_error(self, error: Exception, context: str, **kwargs):
        """Log error with stack trace"""
        self.error(
            f"Error in {context}: {str(error)}",
            error_type=type(error).__name__,
            error_message=str(error),
            context=context,
            **kwargs,
            exc_info=True
        )


# Example usage logger
def get_logger(name: str) -> StructuredLogger:
    """Get a structured logger instance"""
    return StructuredLogger(name)
