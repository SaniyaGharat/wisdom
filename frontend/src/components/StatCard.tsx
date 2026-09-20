import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  accentColor = 'var(--brand-primary)',
}) => {
  return (
    <div className="card card-hoverable" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {title}
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.35rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {value}
          </div>
          {subtitle && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {subtitle}
            </div>
          )}
        </div>

        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            background: `rgba(255, 255, 255, 0.04)`,
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accentColor,
          }}
        >
          {icon}
        </div>
      </div>

      {trend && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--match-high)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {trend}
        </div>
      )}
    </div>
  );
};
