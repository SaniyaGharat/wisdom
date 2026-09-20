import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Edit,
  RefreshCw,
  Inbox,
  AlertCircle,
} from 'lucide-react';
import { Api } from '../api/endpoints';
import type { ClientDashboardResponse, MatchStatus } from '../api/types';
import { MatchCard } from '../components/MatchCard';
import { MatchCardSkeleton, DashboardStatsSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';

interface ClientDashboardProps {
  clientId: string;
  onNavigate: (path: string) => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  clientId,
  onNavigate,
}) => {
  const { setActiveClientId, setActiveRole } = useSession();
  const { showToast } = useToast();

  const [data, setData] = useState<ClientDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMatching, setIsMatching] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await Api.dashboard.getClientDashboard(clientId);
      setData(res);
      setActiveClientId(clientId);
      setActiveRole('client');
    } catch (err: any) {
      showToast('error', 'Failed to Load Client Dashboard', err.detail || err.message);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, setActiveClientId, setActiveRole, showToast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleRunMatching = async () => {
    setIsMatching(true);
    try {
      await Api.matching.runForClient(clientId, minScoreFilter > 0 ? minScoreFilter : undefined);
      showToast('success', 'Matching Run Complete', 'Updated matches computed by AI engine.');
      await fetchDashboard();
    } catch (err: any) {
      showToast('error', 'Matching Failed', err.detail || err.message);
    } finally {
      setIsMatching(false);
    }
  };

  const handleMatchStatusChange = (matchId: string, newStatus: MatchStatus) => {
    if (!data) return;
    setData({
      ...data,
      matches: data.matches.map((m) =>
        m.id === matchId ? { ...m, status: newStatus } : m
      ),
    });
  };

  const filteredMatches = (data?.matches || []).filter((m) => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (minScoreFilter > 0 && m.match_score < minScoreFilter) return false;
    return true;
  });

  if (isLoading && !data) {
    return (
      <div>
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="skeleton" style={{ width: '40%', height: '32px', marginBottom: '1rem' }} />
          <div className="skeleton" style={{ width: '80%', height: '20px', marginBottom: '1rem' }} />
        </div>
        <DashboardStatsSkeleton />
        <MatchCardSkeleton />
        <MatchCardSkeleton />
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={<AlertCircle size={32} />}
        title="Client Not Found"
        description="The requested client record does not exist or has been removed."
        actionText="Back to Home"
        onAction={() => onNavigate('/')}
      />
    );
  }

  const { client, matches } = data;
  const highestScore = matches.length > 0 ? Math.max(...matches.map((m) => m.match_score)) : 0;
  const avgScore =
    matches.length > 0
      ? matches.reduce((acc, m) => acc + m.match_score, 0) / matches.length
      : 0;

  return (
    <div>
      {/* Client Profile Requirement Banner */}
      <div className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(18, 25, 43, 0.9) 0%, rgba(30, 41, 69, 0.6) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-primary)', background: 'rgba(99, 102, 241, 0.15)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)' }}>
                {client.category}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Client ID: {client.id.substring(0, 8)}...
              </span>
            </div>

            <h1 style={{ fontSize: '1.85rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={24} style={{ color: 'var(--brand-primary)' }} />
              {client.company_name}
            </h1>

            <p style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginTop: '0.35rem', maxWidth: '720px' }}>
              {client.product_requirement}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate(`/clients/edit/${client.id}`)}
            >
              <Edit size={14} /> Edit Requirement
            </button>

            <button
              className="btn btn-primary btn-sm"
              disabled={isMatching}
              onClick={handleRunMatching}
            >
              <RefreshCw size={14} className={isMatching ? 'spin-icon' : ''} />
              {isMatching ? 'Re-scoring...' : 'Re-run AI Matching'}
            </button>
          </div>
        </div>

        {/* Specifications Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem',
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.85rem',
          }}
        >
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Quantity Required</div>
            <div style={{ fontWeight: 700, marginTop: '0.2rem' }}>{client.quantity_required.toLocaleString()} units</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Target Budget</div>
            <div style={{ fontWeight: 700, marginTop: '0.2rem', color: 'var(--match-high)' }}>
              ${Number(client.budget).toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Location</div>
            <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{client.location}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Timeline</div>
            <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{client.delivery_timeline}</div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Matched Suppliers</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.2rem' }}>{matches.length}</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Highest Match Score</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--match-high)' }}>
            {highestScore > 0 ? `${highestScore.toFixed(0)}%` : '—'}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Average Score</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--brand-primary)' }}>
            {avgScore > 0 ? `${avgScore.toFixed(0)}%` : '—'}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unread Alerts</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.2rem', color: data.unread_notifications_count > 0 ? '#f87171' : 'var(--text-secondary)' }}>
            {data.unread_notifications_count}
          </div>
        </div>
      </div>

      {/* Matches List Header & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem' }}>Ranked Supplier Matches</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Sorted descending by composite hybrid match score.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Status:</span>
            <select
              className="form-select"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="notified">Notified</option>
              <option value="accepted">Accepted</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Min Score Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Min Score:</span>
            <select
              className="form-select"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
              value={minScoreFilter}
              onChange={(e) => setMinScoreFilter(Number(e.target.value))}
            >
              <option value="0">All Scores</option>
              <option value="50">≥ 50%</option>
              <option value="70">≥ 70%</option>
              <option value="80">≥ 80% (High Quality)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Match Cards List */}
      {filteredMatches.length === 0 ? (
        <EmptyState
          icon={<Inbox size={32} />}
          title={matches.length === 0 ? 'No Matches Found Yet' : 'No Matches Match Current Filters'}
          description={
            matches.length === 0
              ? 'Click below to run the hybrid AI matching engine against all available suppliers in the database.'
              : 'Try relaxing the status or minimum score filters above.'
          }
          actionText={matches.length === 0 ? 'Run AI Matching' : 'Reset Filters'}
          onAction={matches.length === 0 ? handleRunMatching : () => { setStatusFilter('all'); setMinScoreFilter(0); }}
          isLoadingAction={isMatching}
        />
      ) : (
        filteredMatches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            viewMode="client"
            onStatusChange={handleMatchStatusChange}
          />
        ))
      )}
    </div>
  );
};
