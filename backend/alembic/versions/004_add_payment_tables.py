"""Add payment and subscription tables

Revision ID: 004_add_payment_tables
Revises: 003_add_user_profile_fields
Create Date: 2025-12-19

This migration adds:
- subscriptions table for tracking user subscription plans
- payments table for payment transaction history
- resume_analysis_count column to user_credits table
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '004_add_payment_tables'
down_revision = '003_add_user_profile_fields'
branch_labels = None
depends_on = None


def upgrade():
    """Create payment-related tables and add resume analysis tracking."""
    
    # Add resume_analysis_count to user_credits
    op.add_column('user_credits', 
        sa.Column('resume_analysis_count', sa.Integer(), nullable=False, server_default='0')
    )
    
    # Create subscription plan enum
    subscription_plan = sa.Enum('free', 'pro', 'enterprise', name='subscriptionplan')
    subscription_plan.create(op.get_bind(), checkfirst=True)
    
    # Create subscription status enum
    subscription_status = sa.Enum('active', 'cancelled', 'expired', 'past_due', 'trialing', name='subscriptionstatus')
    subscription_status.create(op.get_bind(), checkfirst=True)
    
    # Create payment status enum
    payment_status = sa.Enum('pending', 'completed', 'failed', 'refunded', name='paymentstatus')
    payment_status.create(op.get_bind(), checkfirst=True)
    
    # Create subscriptions table
    op.create_table(
        'subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('plan', sa.Enum('free', 'pro', 'enterprise', name='subscriptionplan', create_type=False), 
                  nullable=False, server_default='free'),
        sa.Column('status', sa.Enum('active', 'cancelled', 'expired', 'past_due', 'trialing', 
                  name='subscriptionstatus', create_type=False), nullable=False, server_default='active'),
        sa.Column('razorpay_subscription_id', sa.String(255), nullable=True),
        sa.Column('razorpay_customer_id', sa.String(255), nullable=True),
        sa.Column('current_period_start', sa.DateTime(), nullable=True),
        sa.Column('current_period_end', sa.DateTime(), nullable=True),
        sa.Column('cancel_at_period_end', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
        sa.UniqueConstraint('razorpay_subscription_id'),
    )
    op.create_index('ix_subscriptions_id', 'subscriptions', ['id'])
    op.create_index('ix_subscriptions_plan', 'subscriptions', ['plan'])
    op.create_index('ix_subscriptions_status', 'subscriptions', ['status'])
    
    # Create payments table
    op.create_table(
        'payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('subscription_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('razorpay_order_id', sa.String(255), nullable=True),
        sa.Column('razorpay_payment_id', sa.String(255), nullable=True),
        sa.Column('razorpay_signature', sa.String(500), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='INR'),
        sa.Column('status', sa.Enum('pending', 'completed', 'failed', 'refunded', 
                  name='paymentstatus', create_type=False), nullable=False, server_default='pending'),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('receipt_id', sa.String(100), nullable=True),
        sa.Column('plan_purchased', sa.Enum('free', 'pro', 'enterprise', name='subscriptionplan', create_type=False), 
                  nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('paid_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['subscription_id'], ['subscriptions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('razorpay_payment_id'),
    )
    op.create_index('ix_payments_id', 'payments', ['id'])
    op.create_index('ix_payments_order_id', 'payments', ['razorpay_order_id'])
    op.create_index('ix_payments_user_id', 'payments', ['user_id'])
    op.create_index('ix_payments_status', 'payments', ['status'])


def downgrade():
    """Remove payment-related tables and columns."""
    
    # Drop payments table
    op.drop_index('ix_payments_status', 'payments')
    op.drop_index('ix_payments_user_id', 'payments')
    op.drop_index('ix_payments_order_id', 'payments')
    op.drop_index('ix_payments_id', 'payments')
    op.drop_table('payments')
    
    # Drop subscriptions table
    op.drop_index('ix_subscriptions_status', 'subscriptions')
    op.drop_index('ix_subscriptions_plan', 'subscriptions')
    op.drop_index('ix_subscriptions_id', 'subscriptions')
    op.drop_table('subscriptions')
    
    # Drop resume_analysis_count column
    op.drop_column('user_credits', 'resume_analysis_count')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS paymentstatus')
    op.execute('DROP TYPE IF EXISTS subscriptionstatus')
    op.execute('DROP TYPE IF EXISTS subscriptionplan')
