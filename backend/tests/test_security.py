"""Tests for security features"""

import pytest
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_token,
    encrypt_sensitive_data,
    decrypt_sensitive_data,
    sanitize_filename,
    generate_secure_filename
)


def test_password_hashing():
    """Test password hashing and verification"""
    password = "TestPassword123!"
    hashed = get_password_hash(password)
    
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("WrongPassword", hashed)


def test_jwt_token_creation_and_decoding():
    """Test JWT token creation and decoding"""
    data = {"sub": 1, "email": "test@example.com"}
    token = create_access_token(data)
    
    assert token is not None
    
    decoded = decode_token(token)
    assert decoded["sub"] == 1
    assert decoded["email"] == "test@example.com"
    assert "exp" in decoded


def test_data_encryption():
    """Test data encryption and decryption"""
    sensitive_data = "This is sensitive information"
    
    encrypted = encrypt_sensitive_data(sensitive_data)
    assert encrypted != sensitive_data
    assert "::" in encrypted  # IV separator
    
    decrypted = decrypt_sensitive_data(encrypted)
    assert decrypted == sensitive_data


def test_filename_sanitization():
    """Test filename sanitization"""
    dangerous_filename = "../../../etc/passwd"
    sanitized = sanitize_filename(dangerous_filename)
    
    assert ".." not in sanitized
    assert "/" not in sanitized
    assert "\\" not in sanitized


def test_secure_filename_generation():
    """Test secure filename generation"""
    original = "my resume.pdf"
    secure = generate_secure_filename(original)
    
    assert secure != original
    assert secure.endswith(".pdf")
    assert len(secure) > len(original)
