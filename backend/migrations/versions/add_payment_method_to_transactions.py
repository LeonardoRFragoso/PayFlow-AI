"""Add payment_method to transactions

Revision ID: a2b3c4d5e6f7
Revises: 1bd3de9c1bc8
Create Date: 2026-02-18 14:06:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'a2b3c4d5e6f7'
down_revision = '1bd3de9c1bc8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Criar o enum apenas se não existir
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE paymentmethod AS ENUM ('conta_corrente', 'cartao_credito', 'cartao_debito', 'pix', 'dinheiro', 'outros');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Adicionar a coluna apenas se não existir
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE transactions ADD COLUMN payment_method paymentmethod NOT NULL DEFAULT 'conta_corrente'::paymentmethod;
        EXCEPTION
            WHEN duplicate_column THEN null;
        END $$;
    """)


def downgrade() -> None:
    op.drop_column('transactions', 'payment_method')
    op.execute("DROP TYPE IF EXISTS paymentmethod")
