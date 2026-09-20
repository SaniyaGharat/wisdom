import React from 'react';
import type { CategoryBreakdownItem } from '../api/types';

interface CategoryChartProps {
  data: CategoryBreakdownItem[];
}

export const CategoryBreakdownChart: React.FC<CategoryChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
        No category distribution data available yet.
      </div>
    );
  }

  const maxMatches = Math.max(...data.map((d) => d.total_matches), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {data.map((item) => {
        const percentage = Math.round((item.total_matches / maxMatches) * 100);
        const avgScore = Math.round(item.average_match_score || 0);

        return (
          <div key={item.category} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{item.category}</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ({item.total_clients} clients, {item.total_suppliers} suppliers)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {item.total_matches} matches
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: avgScore >= 80 ? 'var(--match-high)' : avgScore >= 50 ? 'var(--match-mid)' : 'var(--match-low)',
                  }}
                >
                  {avgScore}% avg score
                </span>
              </div>
            </div>

            <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(8, percentage)}%`,
                  background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.8s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface StatusDistributionProps {
  statusCounts: {
    pending: number;
    notified: number;
    accepted: number;
    rejected: number;
  };
}

export const StatusDistributionBar: React.FC<StatusDistributionProps> = ({ statusCounts }) => {
  const total =
    (statusCounts.pending || 0) +
    (statusCounts.notified || 0) +
    (statusCounts.accepted || 0) +
    (statusCounts.rejected || 0);

  if (total === 0) return null;

  const pct = (val: number) => ((val / total) * 100).toFixed(1);

  return (
    <div>
      {/* Multi-colored Progress Track */}
      <div
        style={{
          display: 'flex',
          height: '10px',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.05)',
          marginBottom: '0.85rem',
        }}
      >
        {statusCounts.accepted > 0 && (
          <div
            style={{ width: `${pct(statusCounts.accepted)}%`, background: 'var(--status-accepted)' }}
            title={`Accepted: ${statusCounts.accepted} (${pct(statusCounts.accepted)}%)`}
          />
        )}
        {statusCounts.notified > 0 && (
          <div
            style={{ width: `${pct(statusCounts.notified)}%`, background: 'var(--status-notified)' }}
            title={`Notified: ${statusCounts.notified} (${pct(statusCounts.notified)}%)`}
          />
        )}
        {statusCounts.pending > 0 && (
          <div
            style={{ width: `${pct(statusCounts.pending)}%`, background: 'var(--status-pending)' }}
            title={`Pending: ${statusCounts.pending} (${pct(statusCounts.pending)}%)`}
          />
        )}
        {statusCounts.rejected > 0 && (
          <div
            style={{ width: `${pct(statusCounts.rejected)}%`, background: 'var(--status-rejected)' }}
            title={`Rejected: ${statusCounts.rejected} (${pct(statusCounts.rejected)}%)`}
          />
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.78rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-accepted)' }} />
          <span>Accepted ({statusCounts.accepted || 0})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-notified)' }} />
          <span>Notified ({statusCounts.notified || 0})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-pending)' }} />
          <span>Pending ({statusCounts.pending || 0})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-rejected)' }} />
          <span>Rejected ({statusCounts.rejected || 0})</span>
        </div>
      </div>
    </div>
  );
};
