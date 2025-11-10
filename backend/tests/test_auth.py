"""Tests for authentication endpoints"""

import pytest
from fastapi import status


def test_user_registration(client, test_user_data):
    """Test user registration"""
    response = client.post("/api/v1/auth/register", json=test_user_data)
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == test_user_data["email"]
    assert data["username"] == test_user_data["username"]
    assert "id" in data


def test_duplicate_email_registration(client, test_user_data):
    """Test registration with duplicate email"""
    # First registration
    client.post("/api/v1/auth/register", json=test_user_data)
    
    # Second registration with same email
    response = client.post("/api/v1/auth/register", json=test_user_data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already registered" in response.json()["detail"].lower()


def test_weak_password_registration(client, test_user_data):
    """Test registration with weak password"""
    test_user_data["password"] = "weak"
    response = client.post("/api/v1/auth/register", json=test_user_data)
    
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_user_login(client, test_user_data):
    """Test user login"""
    # Register user
    client.post("/api/v1/auth/register", json=test_user_data)
    
    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        }
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client, test_user_data):
    """Test login with wrong password"""
    # Register user
    client.post("/api/v1/auth/register", json=test_user_data)
    
    # Login with wrong password
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user_data["email"],
            "password": "WrongPassword123!"
        }
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_nonexistent_user(client):
    """Test login with non-existent user"""
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "Password123!"
        }
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
