"""add_failure_tracking_to_generated_assets

Revision ID: f1a2b3c4d5e6
Revises: e9a1b2c3d4e5
Create Date: 2026-11-10 14:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.migration_utils import safe_add_column

# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'e9a1b2c3d4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    safe_add_column('generated_assets', sa.Column('error_code', sa.String(length=50), nullable=True))
    safe_add_column('generated_assets', sa.Column('attempts', sa.Integer(), nullable=True, server_default='1'))
    safe_add_column('generated_assets', sa.Column('used_fallback', sa.Boolean(), nullable=True, server_default='false'))
    safe_add_column('generated_assets', sa.Column('fallback_from', sa.String(length=50), nullable=True))


def downgrade() -> None:
    pass

