import React from 'react';

export const MatchCardSkeleton: React.FC = () => {
  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: '120px', height: '22px', marginBottom: '0.6rem' }} />
          <div className="skeleton" style={{ width: '60%', height: '28px', marginBottom: '0.4rem' }} />
          <div className="skeleton" style={{ width: '85%', height: '18px' }} />
        </div>
        <div className="skeleton" style={{ width: '56px', height: '56px', borderRadius: '50%' }} />
      </div>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
        <div className="skeleton" style={{ width: '100px', height: '16px' }} />
        <div className="skeleton" style={{ width: '120px', height: '16px' }} />
        <div className="skeleton" style={{ width: '90px', height: '16px' }} />
      </div>
    </div>
  );
};

export const DashboardStatsSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card" style={{ padding: '1.25rem' }}>
          <div className="skeleton" style={{ width: '80px', height: '14px', marginBottom: '0.75rem' }} />
          <div className="skeleton" style={{ width: '60px', height: '32px' }} />
        </div>
      ))}
    </div>
  );
};
