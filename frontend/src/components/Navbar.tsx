import React, { useState } from 'react';
import {
  Sparkles,
  Users,
  Briefcase,
  BarChart3,
  Plus,
  ChevronDown,
  Building,
} from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { NotificationDropdown } from './NotificationDropdown';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate }) => {
  const {
    activeRole,
    setActiveRole,
    activeClientId,
    setActiveClientId,
    activeSupplierId,
    setActiveSupplierId,
    clients,
    suppliers,
    health,
  } = useSession();

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const activeClient = clients.find((c) => c.id === activeClientId);
  const activeSupplier = suppliers.find((s) => s.id === activeSupplierId);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Brand Logo */}
        <div
          className="brand-logo"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.65rem' }}
          onClick={() => onNavigate('/')}
        >
          <div className="brand-icon-wrapper">
            <Sparkles size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              MatchIQ <span style={{ color: 'var(--brand-primary)' }}>AI</span>
            </span>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Client–Supplier Matchmaking
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <ul className="nav-links">
          <li>
            <button
              className={`nav-link ${currentPath === '/' ? 'active' : ''}`}
              onClick={() => onNavigate('/')}
            >
              Home
            </button>
          </li>
          <li>
            <button
              className={`nav-link ${
                currentPath.startsWith('/clients') && !currentPath.includes('/new')
                  ? 'active'
                  : ''
              }`}
              onClick={() => {
                setActiveRole('client');
                if (activeClientId) {
                  onNavigate(`/clients/${activeClientId}/dashboard`);
                } else {
                  onNavigate('/clients/new');
                }
              }}
            >
              <Users size={16} /> Client Portal
            </button>
          </li>
          <li>
            <button
              className={`nav-link ${
                currentPath.startsWith('/suppliers') && !currentPath.includes('/new')
                  ? 'active'
                  : ''
              }`}
              onClick={() => {
                setActiveRole('supplier');
                if (activeSupplierId) {
                  onNavigate(`/suppliers/${activeSupplierId}/dashboard`);
                } else {
                  onNavigate('/suppliers/new');
                }
              }}
            >
              <Briefcase size={16} /> Supplier Portal
            </button>
          </li>
          <li>
            <button
              className={`nav-link ${currentPath === '/admin' ? 'active' : ''}`}
              onClick={() => {
                setActiveRole('admin');
                onNavigate('/admin');
              }}
            >
              <BarChart3 size={16} /> Platform Admin
            </button>
          </li>
        </ul>

        {/* Right Controls */}
        <div className="nav-actions">
          {/* Active Profile Switcher Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
              style={{ fontSize: '0.8rem', gap: '0.4rem' }}
              title="Switch Simulated Active Profile"
            >
              <Building size={14} />
              <span>
                {activeRole === 'client'
                  ? activeClient?.company_name || 'Select Client'
                  : activeRole === 'supplier'
                  ? activeSupplier?.supplier_name || 'Select Supplier'
                  : 'Platform Admin'}
              </span>
              <ChevronDown size={12} />
            </button>

            {isSwitcherOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '280px',
                  background: '#0f172a',
                  border: '1px solid var(--border-hover)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-elevated)',
                  zIndex: 250,
                  padding: '0.5rem',
                }}
              >
                {/* Role Toggle Tabs */}
                <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.5rem' }}>
                  <button
                    className={`btn btn-sm ${activeRole === 'client' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, fontSize: '0.75rem', padding: '0.3rem' }}
                    onClick={() => setActiveRole('client')}
                  >
                    Clients ({clients.length})
                  </button>
                  <button
                    className={`btn btn-sm ${activeRole === 'supplier' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, fontSize: '0.75rem', padding: '0.3rem' }}
                    onClick={() => setActiveRole('supplier')}
                  >
                    Suppliers ({suppliers.length})
                  </button>
                </div>

                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {activeRole === 'client' ? (
                    clients.length === 0 ? (
                      <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        No clients registered yet.
                      </div>
                    ) : (
                      clients.map((c) => (
                        <div
                          key={c.id}
                          style={{
                            padding: '0.5rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            background: c.id === activeClientId ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                            color: c.id === activeClientId ? '#fff' : 'var(--text-secondary)',
                          }}
                          onClick={() => {
                            setActiveClientId(c.id);
                            setIsSwitcherOpen(false);
                            onNavigate(`/clients/${c.id}/dashboard`);
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{c.company_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.category}</div>
                        </div>
                      ))
                    )
                  ) : (
                    suppliers.length === 0 ? (
                      <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        No suppliers registered yet.
                      </div>
                    ) : (
                      suppliers.map((s) => (
                        <div
                          key={s.id}
                          style={{
                            padding: '0.5rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            background: s.id === activeSupplierId ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                            color: s.id === activeSupplierId ? '#fff' : 'var(--text-secondary)',
                          }}
                          onClick={() => {
                            setActiveSupplierId(s.id);
                            setIsSwitcherOpen(false);
                            onNavigate(`/suppliers/${s.id}/dashboard`);
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{s.supplier_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.category}</div>
                        </div>
                      ))
                    )
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ width: '100%', fontSize: '0.78rem', justifyContent: 'center' }}
                    onClick={() => {
                      setIsSwitcherOpen(false);
                      onNavigate(activeRole === 'client' ? '/clients/new' : '/suppliers/new');
                    }}
                  >
                    <Plus size={14} /> Register New {activeRole === 'client' ? 'Client' : 'Supplier'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          <NotificationDropdown />

          {/* Health Pill Indicator */}
          <div
            className={`health-pill ${health?.status === 'ok' ? '' : 'degraded'}`}
            title={`Backend: ${health?.database || 'Connecting...'} | Model: ${health?.embedding_model || 'Loading...'}`}
          >
            <span className="health-dot" />
            <span>{health?.status === 'ok' ? 'API LIVE' : 'CONNECTING'}</span>
          </div>

          {/* Fast CTA */}
          <button
            className="btn btn-gradient btn-sm"
            onClick={() => onNavigate('/clients/new')}
          >
            <Plus size={15} /> Find Suppliers
          </button>
        </div>
      </div>
    </nav>
  );
};
