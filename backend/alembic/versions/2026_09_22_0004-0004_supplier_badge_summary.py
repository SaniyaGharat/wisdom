"""supplier_badge_summary

Revision ID: 0004_supplier_badge_summary
Revises: 0003_add_notifications_table
Create Date: 2026-09-22 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0004_supplier_badge_summary'
down_revision: Union[str, None] = '0003_add_notifications_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add match_summary column to matches table
    op.add_column('matches', sa.Column('match_summary', sa.Text(), nullable=True))

    # Add verification_status and certifications columns to suppliers table
    op.add_column(
        'suppliers',
        sa.Column('verification_status', sa.String(length=50), nullable=False, server_default='unverified')
    )
    op.add_column('suppliers', sa.Column('certifications', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('suppliers', 'certifications')
    op.drop_column('suppliers', 'verification_status')
    op.drop_column('matches', 'match_summary')
