"""Add is_superadmin field to users

Revision ID: 006_add_superadmin_field
Revises: 005_enhanced_payment_system
Create Date: 2024-12-20
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = '006_add_superadmin_field'
down_revision = '005_enhanced_payment_system'
branch_labels = None
depends_on = None


def upgrade():
    """Add is_superadmin column to users table."""
    op.add_column(
        'users',
        sa.Column('is_superadmin', sa.Boolean(), nullable=False, server_default='false')
    )


def downgrade():
    """Remove is_superadmin column from users table."""
    op.drop_column('users', 'is_superadmin')
