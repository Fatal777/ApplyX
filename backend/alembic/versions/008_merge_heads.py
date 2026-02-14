"""merge migration heads

Revision ID: 008_merge_heads
Revises: 007_add_analyses_tracking, create_resume_builder
Create Date: 2026-02-14

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '008_merge_heads'
down_revision = ('007_add_analyses_tracking', 'create_resume_builder')
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This is a merge migration - no schema changes
    pass


def downgrade() -> None:
    # This is a merge migration - no schema changes
    pass
