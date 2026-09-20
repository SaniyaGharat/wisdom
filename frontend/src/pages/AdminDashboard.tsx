import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Users,
  Briefcase,
  Layers,
  Sparkles,
  TrendingUp,
  Activity,
  RefreshCw,
  Bell,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Api } from '../api/endpoints';
import type {
  DashboardSummaryResponse,
  CategoryBreakdownItem,
  ActivityItem,
  Match,
  PaginatedResponse,
} from '../api/types';
import { StatCard } from '../components/StatCard';
import { CategoryBreakdownChart, StatusDistributionBar } from '../components/Charts';
import { MatchScoreBadge } from '../components/MatchScoreBadge';
import { DashboardStatsSkeleton } from '../components/LoadingSkeleton';
import { useToast } from '../context/ToastContext';

interface AdminDashboardProps {
  onNavigate: (path: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { showToast } = useToast();

  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdownItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [matchesData, setMatchesData] = useState<PaginatedResponse<Match> | null>(null);

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [isTriggeringBatch, setIsTriggeringBatch] = useState(false);

  // Table Filters & Pagination
  const [matchStatusFilter, setMatchStatusFilter] = useState<string>('');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [tableOffset, setTableOffset] = useState<number>(0);
  const tableLimit = 10;

  const fetchOverviewData = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const [sumRes, catRes, actRes] = await Promise.all([
        Api.dashboard.getSummary(),
        Api.dashboard.getCategoryBreakdown(),
        Api.dashboard.getRecentActivity(20),
      ]);
      setSummary(sumRes);
      setCategories(catRes);
      setActivity(actRes.items || []);
    } catch (err: any) {
      showToast('error', 'Dashboard Load Failed', err.detail || err.message);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [showToast]);

  const fetchMatchesTable = useCallback(async () => {
    setIsLoadingMatches(true);
    try {
      const res = await Api.matches.list({
        limit: tableLimit,
        offset: tableOffset,
        status: matchStatusFilter || undefined,
        min_score: minScoreFilter > 0 ? minScoreFilter : undefined,
      });
      setMatchesData(res);
    } catch (err: any) {
      showToast('error', 'Failed to load matches table', err.detail || err.message);
    } finally {
      setIsLoadingMatches(false);
    }
  }, [tableLimit, tableOffset, matchStatusFilter, minScoreFilter, showToast]);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  useEffect(() => {
    fetchMatchesTable();
  }, [fetchMatchesTable]);

  const handleTriggerBatch = async () => {
    setIsTriggeringBatch(true);
    try {
      const res = await Api.matching.runAll(35.0);
      showToast(
        'success',
        'Batch Matching Completed',
        `Evaluated ${res.suppliers_evaluated} suppliers vs ${res.clients_processed} clients. ${res.matches_stored} matches stored.`
      );
      await Promise.all([fetchOverviewData(), fetchMatchesTable()]);
    } catch (err: any) {
      showToast('error', 'Execution Error', err.detail || err.message);
    } finally {
      setIsTriggeringBatch(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'client_created':
        return <Users size={15} style={{ color: 'var(--brand-primary)' }} />;
      case 'supplier_created':
        return <Briefcase size={15} style={{ color: 'var(--match-high)' }} />;
      case 'match_created':
        return <Sparkles size={15} style={{ color: 'var(--match-mid)' }} />;
      case 'notification_sent':
        return <Bell size={15} style={{ color: '#3b82f6' }} />;
      default:
        return <Activity size={15} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--brand-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
            <BarChart3 size={16} /> Platform Executive Intelligence
          </div>
          <h1 style={{ fontSize: '2rem', marginTop: '0.35rem' }}>Platform Operations & Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Real-time aggregate telemetry across buyer demand, supplier inventory, and AI matching efficacy.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              fetchOverviewData();
              fetchMatchesTable();
            }}
          >
            <RefreshCw size={14} /> Refresh Data
          </button>

          <button
            className="btn btn-gradient btn-sm"
            disabled={isTriggeringBatch}
            onClick={handleTriggerBatch}
          >
            <Sparkles size={14} />
            {isTriggeringBatch ? 'Calculating Matrix...' : 'Run Global Batch Matching'}
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      {isLoadingSummary && !summary ? (
        <DashboardStatsSkeleton />
      ) : summary ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          <StatCard
            title="Registered Buyers"
            value={summary.total_clients}
            subtitle="Active procurement demands"
            icon={<Users size={22} />}
            accentColor="var(--brand-primary)"
          />
          <StatCard
            title="Verified Suppliers"
            value={summary.total_suppliers}
            subtitle="Active manufacturing listings"
            icon={<Briefcase size={22} />}
            accentColor="var(--match-high)"
          />
          <StatCard
            title="Total AI Matches"
            value={summary.total_matches}
            subtitle={`${summary.matches_above_threshold_count} above threshold`}
            icon={<Sparkles size={22} />}
            accentColor="var(--match-mid)"
          />
          <StatCard
            title="Avg Composite Score"
            value={`${summary.average_match_score.toFixed(1)}%`}
            subtitle="Cross-platform relevance mean"
            icon={<TrendingUp size={22} />}
            accentColor="var(--match-high)"
          />
        </div>
      ) : null}

      {/* Grid: Category Breakdown + Status Breakdown + Activity Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Category Breakdown Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Layers size={18} style={{ color: 'var(--brand-primary)' }} /> Category Distribution
              </div>
              <div className="card-subtitle">Match volume and average scores per sector</div>
            </div>
          </div>
          <CategoryBreakdownChart data={categories} />
        </div>

        {/* Status Distribution & Live Activity Feed Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div>
              <div className="card-title">
                <Activity size={18} style={{ color: 'var(--match-high)' }} /> Deal Pipeline & Activity Feed
              </div>
              <div className="card-subtitle">Live events stream and match status distribution</div>
            </div>
          </div>

          {summary && (
            <div style={{ marginBottom: '1.25rem' }}>
              <StatusDistributionBar statusCounts={summary.matches_by_status} />
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', flex: 1, overflowY: 'auto', maxHeight: '280px' }}>
            {activity.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No recent events recorded.
              </div>
            ) : (
              activity.map((act) => (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.6rem 0',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    fontSize: '0.82rem',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getActivityIcon(act.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{act.title}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '0.1rem' }}>
                      {act.description}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Browsable All Matches Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div className="card-title">
              <Sparkles size={18} style={{ color: 'var(--match-mid)' }} /> All Platform Matches Explorer
            </div>
            <div className="card-subtitle">
              Filterable and sortable registry of all calculated matchmaking records
            </div>
          </div>

          {/* Table Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>
              <select
                className="form-select"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}
                value={matchStatusFilter}
                onChange={(e) => {
                  setMatchStatusFilter(e.target.value);
                  setTableOffset(0);
                }}
              >
                <option value="">All Statuses</option>
                <option value="notified">Notified</option>
                <option value="accepted">Accepted</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Min Score:</span>
              <select
                className="form-select"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}
                value={minScoreFilter}
                onChange={(e) => {
                  setMinScoreFilter(Number(e.target.value));
                  setTableOffset(0);
                }}
              >
                <option value="0">All Scores</option>
                <option value="50">≥ 50%</option>
                <option value="70">≥ 70%</option>
                <option value="80">≥ 80% (High)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Buyer / Client</th>
                <th>Supplier / Vendor</th>
                <th>Category</th>
                <th>Match Score</th>
                <th>Semantic</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingMatches ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Loading matches table...
                  </td>
                </tr>
              ) : !matchesData || matchesData.items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No matches found matching criteria.
                  </td>
                </tr>
              ) : (
                matchesData.items.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div
                        style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--brand-primary)' }}
                        onClick={() => onNavigate(`/clients/${m.client_id}/dashboard`)}
                        title="View Client Dashboard"
                      >
                        {m.client?.company_name || 'Client ' + m.client_id.substring(0, 6)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {m.client?.location}
                      </div>
                    </td>
                    <td>
                      <div
                        style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--match-high)' }}
                        onClick={() => onNavigate(`/suppliers/${m.supplier_id}/dashboard`)}
                        title="View Supplier Dashboard"
                      >
                        {m.supplier?.supplier_name || 'Supplier ' + m.supplier_id.substring(0, 6)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {m.supplier?.location}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {m.client?.category || m.supplier?.category || '—'}
                      </span>
                    </td>
                    <td>
                      <MatchScoreBadge score={m.match_score} variant="pill" size="sm" />
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                        {m.semantic_score ? `${(m.semantic_score * 100).toFixed(0)}%` : '—'}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-full)',
                          textTransform: 'uppercase',
                          background:
                            m.status === 'accepted'
                              ? 'var(--status-accepted-bg)'
                              : m.status === 'rejected'
                              ? 'var(--status-rejected-bg)'
                              : m.status === 'notified'
                              ? 'var(--status-notified-bg)'
                              : 'var(--status-pending-bg)',
                          color:
                            m.status === 'accepted'
                              ? 'var(--status-accepted)'
                              : m.status === 'rejected'
                              ? 'var(--status-rejected)'
                              : m.status === 'notified'
                              ? 'var(--status-notified)'
                              : 'var(--status-pending)',
                        }}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {matchesData && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1rem',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div>
              Showing {matchesData.items.length > 0 ? tableOffset + 1 : 0} to{' '}
              {Math.min(tableOffset + tableLimit, matchesData.total)} of {matchesData.total} matches
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={tableOffset === 0}
                onClick={() => setTableOffset(Math.max(0, tableOffset - tableLimit))}
              >
                <ChevronLeft size={14} /> Prev
              </button>

              <button
                className="btn btn-secondary btn-sm"
                disabled={!matchesData.has_more}
                onClick={() => setTableOffset(tableOffset + tableLimit)}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
