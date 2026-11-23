"""add_cover_page_and_format_type_columns

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-11-12 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, Sequence[str], None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    st_cols = [c['name'] for c in inspector.get_columns('story_templates')]
    if 'hardcover_cover_image_path' not in st_cols:
        op.add_column('story_templates', sa.Column('hardcover_cover_image_path', sa.String(length=500), nullable=True))
    if 'hardcover_cover_face_points' not in st_cols:
        op.add_column('story_templates', sa.Column('hardcover_cover_face_points', sa.Text(), nullable=True))

    pj_cols = [c['name'] for c in inspector.get_columns('personalization_jobs')]
    if 'format_type' not in pj_cols:
        op.add_column('personalization_jobs', sa.Column('format_type', sa.String(length=30), server_default='digital', nullable=True))
    if 'cover_asset_path' not in pj_cols:
        op.add_column('personalization_jobs', sa.Column('cover_asset_path', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('personalization_jobs', 'cover_asset_path')
    op.drop_column('personalization_jobs', 'format_type')
    op.drop_column('story_templates', 'hardcover_cover_face_points')
    op.drop_column('story_templates', 'hardcover_cover_image_path')

