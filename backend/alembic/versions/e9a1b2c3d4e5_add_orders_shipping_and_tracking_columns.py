"""add_orders_shipping_and_tracking_columns

Revision ID: e9a1b2c3d4e5
Revises: d8f4e21a0b3c
Create Date: 2026-11-06 15:05:00.000000

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
revision: str = 'e9a1b2c3d4e5'
down_revision: Union[str, Sequence[str], None] = 'd8f4e21a0b3c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    safe_add_column('orders', sa.Column('tracking_number', sa.String(length=100), nullable=True))
    safe_add_column('orders', sa.Column('shipping_carrier', sa.String(length=100), nullable=True))
    safe_add_column('orders', sa.Column('tracking_url', sa.String(length=500), nullable=True))
    safe_add_column('orders', sa.Column('shipped_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    pass

