"""create resume_builder_documents table

Revision ID: create_resume_builder
Revises: 
Create Date: 2026-01-03

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = 'create_resume_builder'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'resume_builder_documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False, server_default='Untitled Resume'),
        sa.Column('template_id', sa.String(length=50), nullable=True),
        sa.Column('content', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_resume_builder_documents_id'), 'resume_builder_documents', ['id'], unique=False)
    op.create_index(op.f('ix_resume_builder_documents_user_id'), 'resume_builder_documents', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_resume_builder_documents_user_id'), table_name='resume_builder_documents')
    op.drop_index(op.f('ix_resume_builder_documents_id'), table_name='resume_builder_documents')
    op.drop_table('resume_builder_documents')
