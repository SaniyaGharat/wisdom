"""add_match_breakdown_columns

Revision ID: 0002_add_match_breakdown_columns
Revises: 0001_initial_schema
Create Date: 2026-09-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002_add_match_breakdown_columns'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add score breakdown columns and metadata to matches table
    op.add_column('matches', sa.Column('semantic_score', sa.Float(), nullable=True))
    op.add_column('matches', sa.Column('category_score', sa.Float(), nullable=True))
    op.add_column('matches', sa.Column('location_score', sa.Float(), nullable=True))
    op.add_column('matches', sa.Column('quantity_score', sa.Float(), nullable=True))
    op.add_column('matches', sa.Column('budget_score', sa.Float(), nullable=True))
    op.add_column('matches', sa.Column('delivery_score', sa.Float(), nullable=True))
    op.add_column('matches', sa.Column('match_reason', sa.Text(), nullable=True))
    op.add_column('matches', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))

    op.create_index(op.f('ix_matches_match_score'), 'matches', ['match_score'], unique=False)
    op.create_index(op.f('ix_matches_status'), 'matches', ['status'], unique=False)
    op.create_unique_constraint('uq_client_supplier_match', 'matches', ['client_id', 'supplier_id'])


def downgrade() -> None:
    op.drop_constraint('uq_client_supplier_match', 'matches', type_='unique')
    op.drop_index(op.f('ix_matches_status'), table_name='matches')
    op.drop_index(op.f('ix_matches_match_score'), table_name='matches')
    op.drop_column('matches', 'updated_at')
    op.drop_column('matches', 'match_reason')
    op.drop_column('matches', 'delivery_score')
    op.drop_column('matches', 'budget_score')
    op.drop_column('matches', 'quantity_score')
    op.drop_column('matches', 'location_score')
    op.drop_column('matches', 'category_score')
    op.drop_column('matches', 'semantic_score')
