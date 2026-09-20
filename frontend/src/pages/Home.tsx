import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Users,
  Briefcase,
  Brain,
  ShieldCheck,
  Zap,
  ArrowRight,
  BarChart3,
  Play,
} from 'lucide-react';
import { Api } from '../api/endpoints';
import type { DashboardSummaryResponse } from '../api/types';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';

interface HomeProps {
  onNavigate: (path: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { setActiveRole, refreshSessions } = useSession();
  const { showToast } = useToast();
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [isRunningBatch, setIsRunningBatch] = useState(false);

  useEffect(() => {
    Api.dashboard.getSummary().then(setSummary).catch(() => {});
  }, []);

  const handleRunAllMatching = async () => {
    setIsRunningBatch(true);
    try {
      const res = await Api.matching.runAll(35.0);
      showToast(
        'success',
        'Batch Matching Executed',
        `Evaluated ${res.suppliers_evaluated} suppliers against ${res.clients_processed} clients. ${res.matches_stored} matches stored.`
      );
      await refreshSessions();
      const updatedSummary = await Api.dashboard.getSummary();
      setSummary(updatedSummary);
    } catch (err: any) {
      showToast('error', 'Batch Execution Failed', err.detail || err.message);
    } finally {
      setIsRunningBatch(false);
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section
        style={{
          textAlign: 'center',
          padding: '4rem 1rem 3.5rem',
          maxWidth: '860px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: 'var(--radius-full)',
            color: 'var(--brand-primary)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.5rem',
          }}
        >
          <Sparkles size={16} /> Hybrid AI Semantic & Multi-Criteria Matchmaking
        </div>

        <h1
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
            lineHeight: 1.15,
            marginBottom: '1.25rem',
            letterSpacing: '-0.03em',
          }}
        >
          Connect High-Intent Buyers with Verified Industrial Suppliers
        </h1>

        <p
          style={{
            fontSize: '1.15rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: '680px',
            margin: '0 auto 2.5rem',
          }}
        >
          Replace archaic keyword search with dense neural semantic embeddings and multi-variable business scoring—evaluating budget, capacity, category, and lead times in milliseconds.
        </p>

        {/* Dual Primary CTAs */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '1rem',
          }}
        >
          <button
            className="btn btn-gradient btn-lg"
            onClick={() => {
              setActiveRole('client');
              onNavigate('/clients/new');
            }}
          >
            <Users size={19} /> I'm a Buyer / Client <ArrowRight size={17} />
          </button>

          <button
            className="btn btn-secondary btn-lg"
            onClick={() => {
              setActiveRole('supplier');
              onNavigate('/suppliers/new');
            }}
          >
            <Briefcase size={19} /> I'm a Supplier / Vendor <ArrowRight size={17} />
          </button>
        </div>
      </section>

      {/* Live Platform Stats Pill Banner */}
      {summary && (
        <section
          style={{
            maxWidth: '1000px',
            margin: '0 auto 4rem',
            padding: '1.5rem 2rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-card)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1.5rem',
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Active Buyers
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {summary.total_clients}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Verified Suppliers
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {summary.total_suppliers}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              AI Matches Created
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '0.25rem' }}>
              {summary.total_matches}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Avg Match Quality
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--match-high)', marginTop: '0.25rem' }}>
              {summary.average_match_score.toFixed(0)}%
            </div>
          </div>
        </section>
      )}

      {/* 3 Core Architecture Pillars */}
      <section style={{ maxWidth: '1080px', margin: '0 auto 4rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Why Hybrid Matchmaking Outperforms Keyword Search</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            A 100% semantic text match is useless if the supplier's price exceeds budget by 3x or lead times take 60 days.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Pillar 1 */}
          <div className="card card-hoverable">
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Brain size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Dense Semantic Embeddings (35%)</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Powered by SentenceTransformers (<code>all-MiniLM-L6-v2</code>). Resolves technical variance like "Rigid-Flex PCB Assembly" vs "Multilayer SMD Circuit Boards".
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="card card-hoverable">
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--match-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <ShieldCheck size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Multi-Variable Feasibility (65%)</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Evaluates Category alignment (20%), Location proximity (15%), Capacity volume (10%), Budget feasibility (10%), and Delivery timelines (10%).
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="card card-hoverable">
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--match-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Zap size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Automated Notifications & Actions</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Qualifying matches immediately trigger in-app alerts to both parties with clear explainability reasons and one-click Accept/Reject deal workflows.
            </p>
          </div>
        </div>
      </section>

      {/* Admin Quick Action Banner */}
      <section
        style={{
          maxWidth: '1080px',
          margin: '0 auto',
          padding: '2rem 2.5rem',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.35rem' }}>
            Run Global Matchmaking Across All Registered Entities
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '560px' }}>
            Executes the hybrid AI matching engine matrix across all clients and suppliers in the database, updating matches and notification feeds.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            disabled={isRunningBatch}
            onClick={handleRunAllMatching}
          >
            <Play size={16} /> {isRunningBatch ? 'Evaluating Matrix...' : 'Trigger Batch Matching'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => onNavigate('/admin')}
          >
            <BarChart3 size={16} /> Open Admin Dashboard
          </button>
        </div>
      </section>
    </div>
  );
};
