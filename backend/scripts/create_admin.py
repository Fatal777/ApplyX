"""Create admin user"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

def create_admin():
    """Create admin user"""
    db = SessionLocal()
    
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.email == "admin@applyx.com").first()
        
        if admin:
            print("Admin user already exists!")
            return
        
        # Create admin user
        admin = User(
            email="admin@applyx.com",
            username="admin",
            full_name="Admin User",
            hashed_password=get_password_hash("Admin123!"),
            is_active=True,
            is_verified=True
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print(f"Admin user created successfully!")
        print(f"Email: admin@applyx.com")
        print(f"Password: Admin123!")
        print(f"Please change the password after first login!")
        
    except Exception as e:
        print(f"Error creating admin user: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
