"""Add interview platform tables

Revision ID: 002_add_interview_tables
Revises: 002_add_application_tracking
Create Date: 2025-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_add_interview_tables'
down_revision = '002_add_application_tracking'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create interview_type enum
    interview_type_enum = postgresql.ENUM(
        'behavioral', 'technical_theory', 'mixed', 'custom',
        name='interviewtype',
        create_type=False
    )
    interview_type_enum.create(op.get_bind(), checkfirst=True)
    
    # Create interview_status enum
    interview_status_enum = postgresql.ENUM(
        'scheduled', 'in_progress', 'completed', 'cancelled', 'failed',
        name='interviewstatus',
        create_type=False
    )
    interview_status_enum.create(op.get_bind(), checkfirst=True)
    
    # Create difficulty_level enum
    difficulty_enum = postgresql.ENUM(
        'beginner', 'intermediate', 'advanced', 'expert',
        name='difficultylevel',
        create_type=False
    )
    difficulty_enum.create(op.get_bind(), checkfirst=True)
    
    # Create interview_sessions table
    op.create_table(
        'interview_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('resume_id', sa.Integer(), nullable=True),
        sa.Column('interview_type', sa.Enum('behavioral', 'technical_theory', 'mixed', 'custom', name='interviewtype'), nullable=False, server_default='mixed'),
        sa.Column('status', sa.Enum('scheduled', 'in_progress', 'completed', 'cancelled', 'failed', name='interviewstatus'), nullable=False, server_default='scheduled'),
        sa.Column('config', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_interview_sessions_user_id', 'interview_sessions', ['user_id'])
    op.create_index('ix_interview_sessions_status', 'interview_sessions', ['status'])
    op.create_index('ix_interview_sessions_created_at', 'interview_sessions', ['created_at'])
    
    # Create interview_questions table (predefined questions bank)
    op.create_table(
        'interview_questions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('subcategory', sa.String(100), nullable=True),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('difficulty', sa.Enum('beginner', 'intermediate', 'advanced', 'expert', name='difficultylevel'), nullable=False, server_default='intermediate'),
        sa.Column('expected_skills', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('evaluation_criteria', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('follow_up_hints', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_interview_questions_category', 'interview_questions', ['category'])
    op.create_index('ix_interview_questions_difficulty', 'interview_questions', ['difficulty'])
    
    # Create interview_responses table
    op.create_table(
        'interview_responses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('question_number', sa.Integer(), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('transcript', sa.Text(), nullable=True),
        sa.Column('audio_duration', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('ai_analysis', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('scores', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['session_id'], ['interview_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_interview_responses_session_id', 'interview_responses', ['session_id'])
    
    # Create interview_feedback table
    op.create_table(
        'interview_feedback',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('overall_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('category_scores', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('strengths', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('improvements', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('detailed_feedback', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('recommendations', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('generated_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['session_id'], ['interview_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('session_id')
    )


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('interview_feedback')
    op.drop_table('interview_responses')
    op.drop_table('interview_questions')
    op.drop_index('ix_interview_sessions_created_at', 'interview_sessions')
    op.drop_index('ix_interview_sessions_status', 'interview_sessions')
    op.drop_index('ix_interview_sessions_user_id', 'interview_sessions')
    op.drop_table('interview_sessions')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS difficultylevel')
    op.execute('DROP TYPE IF EXISTS interviewstatus')
    op.execute('DROP TYPE IF EXISTS interviewtype')
