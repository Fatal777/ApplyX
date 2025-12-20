"""File storage service for uploading to cloud storage"""

import boto3
from botocore.exceptions import ClientError
import cloudinary
import cloudinary.uploader
from typing import Optional, Tuple
import os
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """Abstract storage service"""
    
    def upload_file(self, file_path: str, destination: str) -> str:
        """Upload file and return URL"""
        raise NotImplementedError
    
    def delete_file(self, file_url: str) -> bool:
        """Delete file from storage"""
        raise NotImplementedError
    
    def get_file(self, file_url: str) -> bytes:
        """Download file from storage"""
        raise NotImplementedError


class S3StorageService(StorageService):
    """AWS S3 storage service"""
    
    def __init__(self):
        # Only use endpoint_url if it's set and not empty
        endpoint_url = settings.S3_ENDPOINT_URL if settings.S3_ENDPOINT_URL else None
        
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
            endpoint_url=endpoint_url
        )
        self.bucket_name = settings.S3_BUCKET_NAME
    
    def get_file_path(self, filename: str) -> str:
        """Get S3 key for file"""
        return filename
    
    def upload_file(self, file_path: str, destination: str) -> str:
        """Upload file to S3 and return URL"""
        try:
            self.s3_client.upload_file(
                file_path,
                self.bucket_name,
                destination,
                ExtraArgs={'ServerSideEncryption': 'AES256'}  # Encrypt at rest
            )
            
            # Generate URL
            url = f"https://{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{destination}"
            logger.info(f"File uploaded to S3: {destination}")
            return url
            
        except ClientError as e:
            logger.error(f"S3 upload error: {str(e)}")
            raise Exception(f"Failed to upload file: {str(e)}")
    
    def delete_file(self, file_key: str) -> bool:
        """Delete file from S3"""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=file_key)
            logger.info(f"File deleted from S3: {file_key}")
            return True
        except ClientError as e:
            logger.error(f"S3 delete error: {str(e)}")
            return False
    
    def get_file(self, file_key: str) -> bytes:
        """Download file from S3"""
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=file_key)
            return response['Body'].read()
        except ClientError as e:
            logger.error(f"S3 download error: {str(e)}")
            raise Exception(f"Failed to download file: {str(e)}")


class CloudinaryStorageService(StorageService):
    """Cloudinary storage service"""
    
    def __init__(self):
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET
        )
    
    def get_file_path(self, filename: str) -> str:
        """Get Cloudinary public_id"""
        return filename
    
    def upload_file(self, file_path: str, destination: str) -> str:
        """Upload file to Cloudinary and return URL"""
        try:
            result = cloudinary.uploader.upload(
                file_path,
                public_id=destination,
                resource_type="raw"
            )
            logger.info(f"File uploaded to Cloudinary: {destination}")
            return result['secure_url']
        except Exception as e:
            logger.error(f"Cloudinary upload error: {str(e)}")
            raise Exception(f"Failed to upload file: {str(e)}")
    
    def delete_file(self, public_id: str) -> bool:
        """Delete file from Cloudinary"""
        try:
            cloudinary.uploader.destroy(public_id, resource_type="raw")
            logger.info(f"File deleted from Cloudinary: {public_id}")
            return True
        except Exception as e:
            logger.error(f"Cloudinary delete error: {str(e)}")
            return False
    
    def get_file(self, file_url: str) -> bytes:
        """Download file from Cloudinary"""
        import requests
        try:
            response = requests.get(file_url)
            response.raise_for_status()
            return response.content
        except Exception as e:
            logger.error(f"Cloudinary download error: {str(e)}")
            raise Exception(f"Failed to download file: {str(e)}")


class LocalStorageService(StorageService):
    """Local file system storage (for development/testing)"""
    
    def __init__(self):
        self.storage_dir = settings.UPLOAD_DIR
        os.makedirs(self.storage_dir, exist_ok=True)
    
    def get_file_path(self, filename: str) -> str:
        """Get full file path for a stored file"""
        return os.path.join(self.storage_dir, filename)
    
    def upload_file(self, file_path: str, destination: str) -> str:
        """Copy file to local storage and return path"""
        import shutil
        try:
            dest_path = os.path.join(self.storage_dir, destination)
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            shutil.copy2(file_path, dest_path)
            logger.info(f"File stored locally: {dest_path}")
            return dest_path
        except Exception as e:
            logger.error(f"Local storage error: {str(e)}")
            raise Exception(f"Failed to store file: {str(e)}")
    
    def delete_file(self, file_path: str) -> bool:
        """Delete file from local storage"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"File deleted: {file_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"Local delete error: {str(e)}")
            return False
    
    def get_file(self, file_path: str) -> bytes:
        """Read file from local storage"""
        try:
            with open(file_path, 'rb') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Local read error: {str(e)}")
            raise Exception(f"Failed to read file: {str(e)}")


def get_storage_service() -> StorageService:
    """Get appropriate storage service based on configuration"""
    logger.info(f"Storage config - S3_BUCKET: {settings.S3_BUCKET_NAME}, AWS_KEY: {bool(settings.AWS_ACCESS_KEY_ID)}, Cloudinary: {bool(settings.CLOUDINARY_CLOUD_NAME)}")
    
    if settings.S3_BUCKET_NAME and settings.AWS_ACCESS_KEY_ID:
        logger.info("Using S3StorageService")
        return S3StorageService()
    elif settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY:
        logger.info("Using CloudinaryStorageService")
        return CloudinaryStorageService()
    else:
        logger.info("Using LocalStorageService")
        return LocalStorageService()
