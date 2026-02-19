"""Add affects_balance to transactions

Revision ID: b3c4d5e6f7g8
Revises: a2b3c4d5e6f7
Create Date: 2026-02-18 19:10:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'b3c4d5e6f7g8'
down_revision = 'a2b3c4d5e6f7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE transactions ADD COLUMN affects_balance BOOLEAN NOT NULL DEFAULT true")


def downgrade() -> None:
    op.drop_column('transactions', 'affects_balance')
