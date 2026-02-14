"""Add resume analyses tracking columns to subscriptions

Revision ID: 007_add_analyses_tracking
Revises: 006_add_superadmin_field
Create Date: 2026-02-14

Adds resume_analyses_used and resume_analyses_limit columns to the
subscriptions table for the freemium model. Also updates default limits
for new FREE tier (1 resume, 1 analysis, 1 interview).
"""

from alembic import op
import sqlalchemy as sa


# Revision identifiers
revision = '007_add_analyses_tracking'
down_revision = '006_add_superadmin_field'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new analysis tracking columns
    op.add_column('subscriptions', sa.Column('resume_analyses_used', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('subscriptions', sa.Column('resume_analyses_limit', sa.Integer(), nullable=False, server_default='1'))

    # Update existing FREE users: set new limits (1 resume, 1 analysis, 1 interview)
    op.execute("""
        UPDATE subscriptions
        SET resume_edits_limit = 1,
            resume_analyses_limit = 1,
            interviews_limit = 1
        WHERE lower(plan::text) = 'free'
    """)

    # Update existing BASIC users
    op.execute("""
        UPDATE subscriptions
        SET resume_analyses_limit = 10,
            interviews_limit = 3
        WHERE lower(plan::text) = 'basic'
    """)

    # Update existing PRO users
    op.execute("""
        UPDATE subscriptions
        SET resume_analyses_limit = -1,
            interviews_limit = 10
        WHERE lower(plan::text) = 'pro'
    """)

    # Update existing PRO_PLUS users (unlimited)
    op.execute("""
        UPDATE subscriptions
        SET resume_analyses_limit = -1
        WHERE lower(plan::text) = 'pro_plus'
    """)


def downgrade() -> None:
    op.drop_column('subscriptions', 'resume_analyses_limit')
    op.drop_column('subscriptions', 'resume_analyses_used')

    # Revert FREE limits
    op.execute("""
        UPDATE subscriptions
        SET resume_edits_limit = 2,
            interviews_limit = 0
        WHERE lower(plan::text) = 'free'
    """)
