"""Add enhanced payment system with phone verification

Revision ID: 005_enhanced_payment_system
Revises: 004_add_payment_tables
Create Date: 2025-12-19

This migration adds:
- phone_verified field to users table
- phone_verifications table for OTP
- otp_rate_limits table for rate limiting
- BASIC plan to subscription enum
- Usage tracking fields to subscriptions table
- Unique constraint on phone_number
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '005_enhanced_payment_system'
down_revision = '004_add_payment_tables'
branch_labels = None
depends_on = None


def upgrade():
    """Add phone verification and enhanced subscription fields."""
    
    # Add phone_verified to users table
    op.add_column('users', 
        sa.Column('phone_verified', sa.Boolean(), nullable=False, server_default='false')
    )
    
    # Make phone_number unique (if not already)
    # First, handle duplicates by setting them to NULL
    op.execute("""
        UPDATE users u1 SET phone_number = NULL 
        WHERE phone_number IS NOT NULL 
        AND id NOT IN (
            SELECT MIN(id) FROM users WHERE phone_number IS NOT NULL GROUP BY phone_number
        )
    """)
    
    # Now create unique index
    op.create_index('ix_users_phone_unique', 'users', ['phone_number'], unique=True)
    
    # Create phone_verifications table
    op.create_table(
        'phone_verifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('phone_number', sa.String(15), nullable=False),
        sa.Column('otp_hash', sa.String(255), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('verified_at', sa.DateTime(), nullable=True),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_attempts', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_phone_verifications_id', 'phone_verifications', ['id'])
    op.create_index('ix_phone_verifications_phone', 'phone_verifications', ['phone_number'])
    op.create_index('ix_phone_verifications_phone_expires', 'phone_verifications', ['phone_number', 'expires_at'])
    op.create_index('ix_phone_verifications_user', 'phone_verifications', ['user_id'])
    
    # Create otp_rate_limits table
    op.create_table(
        'otp_rate_limits',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('identifier', sa.String(50), nullable=False),
        sa.Column('identifier_type', sa.String(10), nullable=False),
        sa.Column('request_count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('window_start', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('window_hours', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_otp_rate_limits_id', 'otp_rate_limits', ['id'])
    op.create_index('ix_otp_rate_limits_identifier', 'otp_rate_limits', ['identifier'])
    op.create_index('ix_otp_rate_limits_identifier_type', 'otp_rate_limits', ['identifier', 'identifier_type'])
    
    # Add BASIC and PRO_PLUS to subscription plan enum
    # For PostgreSQL, we need to add the new enum values
    op.execute("ALTER TYPE subscriptionplan ADD VALUE IF NOT EXISTS 'basic'")
    op.execute("ALTER TYPE subscriptionplan ADD VALUE IF NOT EXISTS 'pro_plus'")
    
    # Add usage tracking columns to subscriptions table
    op.add_column('subscriptions',
        sa.Column('resume_edits_used', sa.Integer(), nullable=False, server_default='0')
    )
    op.add_column('subscriptions',
        sa.Column('resume_edits_limit', sa.Integer(), nullable=False, server_default='2')
    )
    op.add_column('subscriptions',
        sa.Column('interviews_used', sa.Integer(), nullable=False, server_default='0')
    )
    op.add_column('subscriptions',
        sa.Column('interviews_limit', sa.Integer(), nullable=False, server_default='0')
    )
    
    # Create payment_audits table for comprehensive tracking
    op.create_table(
        'payment_audits',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('payment_id', sa.Integer(), nullable=True),
        sa.Column('subscription_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('gateway', sa.String(20), nullable=False, server_default='razorpay'),
        sa.Column('gateway_order_id', sa.String(255), nullable=True),
        sa.Column('gateway_payment_id', sa.String(255), nullable=True),
        sa.Column('gateway_response', sa.JSON(), nullable=True),
        sa.Column('amount', sa.Integer(), nullable=True),
        sa.Column('currency', sa.String(3), nullable=False, server_default='INR'),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('device_fingerprint', sa.String(255), nullable=True),
        sa.Column('success', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('error_code', sa.String(50), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['subscription_id'], ['subscriptions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_payment_audits_id', 'payment_audits', ['id'])
    op.create_index('ix_payment_audits_user_id', 'payment_audits', ['user_id'])
    op.create_index('ix_payment_audits_action', 'payment_audits', ['action'])
    op.create_index('ix_payment_audits_user_date', 'payment_audits', ['user_id', 'created_at'])
    op.create_index('ix_payment_audits_order', 'payment_audits', ['gateway_order_id'])
    op.create_index('ix_payment_audits_errors', 'payment_audits', ['success', 'created_at'])


def downgrade():
    """Remove phone verification and enhanced subscription fields."""
    
    # Drop payment_audits table
    op.drop_index('ix_payment_audits_errors', 'payment_audits')
    op.drop_index('ix_payment_audits_order', 'payment_audits')
    op.drop_index('ix_payment_audits_user_date', 'payment_audits')
    op.drop_index('ix_payment_audits_action', 'payment_audits')
    op.drop_index('ix_payment_audits_user_id', 'payment_audits')
    op.drop_index('ix_payment_audits_id', 'payment_audits')
    op.drop_table('payment_audits')
    
    # Drop subscription usage columns
    op.drop_column('subscriptions', 'interviews_limit')
    op.drop_column('subscriptions', 'interviews_used')
    op.drop_column('subscriptions', 'resume_edits_limit')
    op.drop_column('subscriptions', 'resume_edits_used')
    
    # Drop otp_rate_limits table
    op.drop_index('ix_otp_rate_limits_identifier_type', 'otp_rate_limits')
    op.drop_index('ix_otp_rate_limits_identifier', 'otp_rate_limits')
    op.drop_index('ix_otp_rate_limits_id', 'otp_rate_limits')
    op.drop_table('otp_rate_limits')
    
    # Drop phone_verifications table
    op.drop_index('ix_phone_verifications_user', 'phone_verifications')
    op.drop_index('ix_phone_verifications_phone_expires', 'phone_verifications')
    op.drop_index('ix_phone_verifications_phone', 'phone_verifications')
    op.drop_index('ix_phone_verifications_id', 'phone_verifications')
    op.drop_table('phone_verifications')
    
    # Drop phone unique index from users
    op.drop_index('ix_users_phone_unique', 'users')
    
    # Drop phone_verified column
    op.drop_column('users', 'phone_verified')
    
    # Note: Cannot remove enum values from PostgreSQL, but it's harmless

