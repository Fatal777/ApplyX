"""Add application tracking and credits models

Revision ID: 002_add_application_tracking
Revises: 001_add_job_description
Create Date: 2025-01-24

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '002_add_application_tracking'
down_revision = '001_add_job_description'
branch_labels = None
depends_on = None


def upgrade():
    # Create ApplicationStatus enum
    application_status_enum = sa.Enum(
        'saved', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn',
        name='applicationstatus'
    )
    application_status_enum.create(op.get_bind(), checkfirst=True)
    
    # Create job_applications table
    op.create_table(
        'job_applications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('resume_id', sa.Integer(), nullable=True),
        sa.Column('job_external_id', sa.String(255), nullable=False),
        sa.Column('job_title', sa.String(500), nullable=False),
        sa.Column('company', sa.String(255), nullable=False),
        sa.Column('company_logo', sa.String(1000), nullable=True),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('job_url', sa.String(2000), nullable=False),
        sa.Column('job_portal', sa.String(50), nullable=False),
        sa.Column('job_type', sa.String(50), nullable=True),
        sa.Column('salary_min', sa.Integer(), nullable=True),
        sa.Column('salary_max', sa.Integer(), nullable=True),
        sa.Column('is_remote', sa.Boolean(), default=False),
        sa.Column('job_description', sa.Text(), nullable=True),
        sa.Column('match_score', sa.Float(), nullable=True),
        sa.Column('match_breakdown', sa.JSON(), nullable=True),
        sa.Column('matched_skills', sa.JSON(), nullable=True),
        sa.Column('missing_skills', sa.JSON(), nullable=True),
        sa.Column('status', application_status_enum, default='saved', nullable=False),
        sa.Column('applied_at', sa.DateTime(), nullable=True),
        sa.Column('status_updated_at', sa.DateTime(), server_default=sa.text('now()'), onupdate=sa.text('now()')),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_favorite', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), onupdate=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('user_id', 'job_external_id', 'job_portal', name='uq_user_job'),
    )
    op.create_index('ix_job_applications_id', 'job_applications', ['id'])
    op.create_index('ix_job_applications_user_status', 'job_applications', ['user_id', 'status'])
    op.create_index('ix_job_applications_user_created', 'job_applications', ['user_id', 'created_at'])
    
    # Create customized_resumes table
    op.create_table(
        'customized_resumes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('base_resume_id', sa.Integer(), nullable=True),
        sa.Column('original_content', sa.Text(), nullable=True),
        sa.Column('customized_content', sa.Text(), nullable=True),
        sa.Column('section_order', sa.JSON(), nullable=True),
        sa.Column('original_score', sa.Float(), nullable=True),
        sa.Column('improved_score', sa.Float(), nullable=True),
        sa.Column('changes_summary', sa.JSON(), nullable=True),
        sa.Column('skills_added', sa.JSON(), nullable=True),
        sa.Column('keywords_added', sa.JSON(), nullable=True),
        sa.Column('pdf_path', sa.String(500), nullable=True),
        sa.Column('docx_path', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), onupdate=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['application_id'], ['job_applications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['base_resume_id'], ['resumes.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('application_id'),
    )
    op.create_index('ix_customized_resumes_id', 'customized_resumes', ['id'])
    
    # Create user_credits table
    op.create_table(
        'user_credits',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('daily_credits_remaining', sa.Integer(), default=3, nullable=False),
        sa.Column('daily_credits_max', sa.Integer(), default=3, nullable=False),
        sa.Column('bonus_credits', sa.Integer(), default=0, nullable=False),
        sa.Column('tier', sa.String(20), default='free', nullable=False),
        sa.Column('last_reset_date', sa.Date(), server_default=sa.text('CURRENT_DATE'), nullable=False),
        sa.Column('total_credits_used', sa.Integer(), default=0, nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), onupdate=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_index('ix_user_credits_id', 'user_credits', ['id'])
    
    # Create credit_usage table
    op.create_table(
        'credit_usage',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_credits_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('credits_used', sa.Integer(), default=1, nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=True),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_credits_id'], ['user_credits.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['application_id'], ['job_applications.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_credit_usage_id', 'credit_usage', ['id'])


def downgrade():
    # Drop tables in reverse order
    op.drop_index('ix_credit_usage_id', table_name='credit_usage')
    op.drop_table('credit_usage')
    
    op.drop_index('ix_user_credits_id', table_name='user_credits')
    op.drop_table('user_credits')
    
    op.drop_index('ix_customized_resumes_id', table_name='customized_resumes')
    op.drop_table('customized_resumes')
    
    op.drop_index('ix_job_applications_user_created', table_name='job_applications')
    op.drop_index('ix_job_applications_user_status', table_name='job_applications')
    op.drop_index('ix_job_applications_id', table_name='job_applications')
    op.drop_table('job_applications')
    
    # Drop enum
    sa.Enum(name='applicationstatus').drop(op.get_bind(), checkfirst=True)
