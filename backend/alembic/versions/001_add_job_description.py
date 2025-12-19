"""Add job_description to resumes

Revision ID: 001_add_job_description
Revises: 
Create Date: 2025-10-31 16:25:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001_add_job_description'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add job_description column to resumes table
    op.add_column('resumes', sa.Column('job_description', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove job_description column from resumes table
    op.drop_column('resumes', 'job_description')
