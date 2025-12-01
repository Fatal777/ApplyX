"""Add user profile fields for contact information

Revision ID: 003
Revises: 002
Create Date: 2024-12-01

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add phone_number column
    op.add_column('users', sa.Column('phone_number', sa.String(20), nullable=True))
    
    # Add profile_completed flag
    op.add_column('users', sa.Column('profile_completed', sa.Boolean(), nullable=True, server_default='false'))
    
    # Add contact_source to track where info came from
    op.add_column('users', sa.Column('contact_source', sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'contact_source')
    op.drop_column('users', 'profile_completed')
    op.drop_column('users', 'phone_number')
