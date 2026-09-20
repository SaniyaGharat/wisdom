import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Brain,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { Match, MatchStatus } from '../api/types';
import { MatchScoreBadge } from './MatchScoreBadge';
import { Api } from '../api/endpoints';
import { useToast } from '../context/ToastContext';

interface MatchCardProps {
  match: Match;
  viewMode: 'client' | 'supplier' | 'admin';
  onStatusChange?: (matchId: string, newStatus: MatchStatus) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  viewMode,
  onStatusChange,
}) => {
  const { showToast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<MatchStatus>(match.status);
  const [isUpdating, setIsUpdating] = useState(false);

  const targetName =
    viewMode === 'client'
      ? match.supplier?.supplier_name || 'Verified Supplier'
      : match.client?.company_name || 'Procurement Client';

  const targetProduct =
    viewMode === 'client'
      ? match.supplier?.product_offered
      : match.client?.product_requirement;

  const targetCategory =
    viewMode === 'client'
      ? match.supplier?.category
      : match.client?.category;

  const targetLocation =
    viewMode === 'client'
      ? match.supplier?.location
      : match.client?.location;

  const targetTimeline =
    viewMode === 'client'
      ? match.supplier?.delivery_capability
      : match.client?.delivery_timeline;

  const targetPriceOrBudget =
    viewMode === 'client'
      ? match.supplier?.pricing_details
        ? `$${Number(match.supplier.pricing_details).toFixed(2)} / unit`
        : null
      : match.client?.budget
      ? `$${Number(match.client.budget).toLocaleString()} budget`
      : null;

  const handleStatusUpdate = async (newStatus: MatchStatus) => {
    setIsUpdating(true);
    try {
      await Api.matches.updateStatus(match.id, newStatus);
      setCurrentStatus(newStatus);
      showToast(
        'success',
        `Match ${newStatus.toUpperCase()}`,
        `Match status updated to "${newStatus}".`
      );
      if (onStatusChange) {
        onStatusChange(match.id, newStatus);
      }
    } catch (err: any) {
      showToast('error', 'Update Failed', err.detail || err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const tier =
    match.match_score >= 80 ? 'high' : match.match_score >= 50 ? 'mid' : 'low';

  const getSubscoreColor = (val: number | null | undefined) => {
    const score = val || 0;
    if (score >= 0.8) return 'var(--match-high)';
    if (score >= 0.5) return 'var(--match-mid)';
    return 'var(--match-low)';
  };

  return (
    <div className={`card match-card ${tier} card-hoverable`} style={{ marginBottom: '1.25rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--brand-primary)',
                background: 'rgba(99, 102, 241, 0.12)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-full)',
              }}
            >
              <Layers size={13} /> {targetCategory || 'General Category'}
            </span>

            {/* Status Pill */}
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                background:
                  currentStatus === 'accepted'
                    ? 'var(--status-accepted-bg)'
                    : currentStatus === 'rejected'
                    ? 'var(--status-rejected-bg)'
                    : currentStatus === 'notified'
                    ? 'var(--status-notified-bg)'
                    : 'var(--status-pending-bg)',
                color:
                  currentStatus === 'accepted'
                    ? 'var(--status-accepted)'
                    : currentStatus === 'rejected'
                    ? 'var(--status-rejected)'
                    : currentStatus === 'notified'
                    ? 'var(--status-notified)'
                    : 'var(--status-pending)',
              }}
            >
              {currentStatus}
            </span>
          </div>

          <h3 style={{ fontSize: '1.25rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={20} style={{ color: 'var(--text-secondary)' }} />
            {targetName}
          </h3>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.25rem', lineHeight: 1.4 }}>
            {targetProduct}
          </p>
        </div>

        {/* Radial / Pill Score Badge */}
        <div>
          <MatchScoreBadge score={match.match_score} variant="radial" size="md" />
        </div>
      </div>

      {/* Meta Specs Pill Row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.25rem',
          margin: '1rem 0 0.85rem',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}
      >
        {targetLocation && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <MapPin size={15} style={{ color: 'var(--text-muted)' }} />
            <span>{targetLocation}</span>
          </div>
        )}
        {targetPriceOrBudget && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <DollarSign size={15} style={{ color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{targetPriceOrBudget}</span>
          </div>
        )}
        {targetTimeline && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Clock size={15} style={{ color: 'var(--text-muted)' }} />
            <span>{targetTimeline}</span>
          </div>
        )}
      </div>

      {/* Match Reason Text Box */}
      {match.match_reason && (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderLeft: `3px solid ${tier === 'high' ? 'var(--match-high)' : 'var(--border-subtle)'}`,
            padding: '0.75rem 1rem',
            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
            fontSize: '0.85rem',
            lineHeight: 1.45,
            color: 'var(--text-secondary)',
            margin: '0.85rem 0',
          }}
        >
          <strong style={{ color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <Sparkles size={14} style={{ color: 'var(--match-mid)' }} /> AI Match Analysis:
          </strong>{' '}
          {match.match_reason}
        </div>
      )}

      {/* Expandable Sub-scores Breakdown */}
      {isExpanded && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
            <Brain size={15} /> Multi-Criteria Scoring Breakdown
          </div>

          <div className="subscore-grid">
            {/* Semantic */}
            <div className="subscore-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span className="subscore-label">Semantic AI (35%)</span>
                <strong>{((match.semantic_score || 0) * 100).toFixed(0)}%</strong>
              </div>
              <div className="subscore-bar-bg">
                <div
                  className="subscore-bar-fill"
                  style={{
                    width: `${Math.max(5, (match.semantic_score || 0) * 100)}%`,
                    backgroundColor: getSubscoreColor(match.semantic_score),
                  }}
                />
              </div>
            </div>

            {/* Category */}
            <div className="subscore-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span className="subscore-label">Category (20%)</span>
                <strong>{((match.category_score || 0) * 100).toFixed(0)}%</strong>
              </div>
              <div className="subscore-bar-bg">
                <div
                  className="subscore-bar-fill"
                  style={{
                    width: `${Math.max(5, (match.category_score || 0) * 100)}%`,
                    backgroundColor: getSubscoreColor(match.category_score),
                  }}
                />
              </div>
            </div>

            {/* Location */}
            <div className="subscore-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span className="subscore-label">Location (15%)</span>
                <strong>{((match.location_score || 0) * 100).toFixed(0)}%</strong>
              </div>
              <div className="subscore-bar-bg">
                <div
                  className="subscore-bar-fill"
                  style={{
                    width: `${Math.max(5, (match.location_score || 0) * 100)}%`,
                    backgroundColor: getSubscoreColor(match.location_score),
                  }}
                />
              </div>
            </div>

            {/* Quantity */}
            <div className="subscore-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span className="subscore-label">Capacity (10%)</span>
                <strong>{((match.quantity_score || 0) * 100).toFixed(0)}%</strong>
              </div>
              <div className="subscore-bar-bg">
                <div
                  className="subscore-bar-fill"
                  style={{
                    width: `${Math.max(5, (match.quantity_score || 0) * 100)}%`,
                    backgroundColor: getSubscoreColor(match.quantity_score),
                  }}
                />
              </div>
            </div>

            {/* Budget */}
            <div className="subscore-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span className="subscore-label">Budget (10%)</span>
                <strong>{((match.budget_score || 0) * 100).toFixed(0)}%</strong>
              </div>
              <div className="subscore-bar-bg">
                <div
                  className="subscore-bar-fill"
                  style={{
                    width: `${Math.max(5, (match.budget_score || 0) * 100)}%`,
                    backgroundColor: getSubscoreColor(match.budget_score),
                  }}
                />
              </div>
            </div>

            {/* Delivery */}
            <div className="subscore-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span className="subscore-label">Delivery (10%)</span>
                <strong>{((match.delivery_score || 0) * 100).toFixed(0)}%</strong>
              </div>
              <div className="subscore-bar-bg">
                <div
                  className="subscore-bar-fill"
                  style={{
                    width: `${Math.max(5, (match.delivery_score || 0) * 100)}%`,
                    backgroundColor: getSubscoreColor(match.delivery_score),
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card Footer Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ paddingLeft: 0 }}
        >
          {isExpanded ? (
            <>
              <ChevronUp size={16} /> Hide Scoring Details
            </>
          ) : (
            <>
              <ChevronDown size={16} /> View Scoring Details
            </>
          )}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {currentStatus !== 'accepted' && (
            <button
              className="btn btn-success btn-sm"
              disabled={isUpdating}
              onClick={() => handleStatusUpdate('accepted')}
            >
              <CheckCircle size={15} /> Accept Match
            </button>
          )}

          {currentStatus !== 'rejected' && (
            <button
              className="btn btn-danger btn-sm"
              disabled={isUpdating}
              onClick={() => handleStatusUpdate('rejected')}
            >
              <XCircle size={15} /> Reject
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
