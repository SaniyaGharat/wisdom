import React, { useState, useEffect } from 'react';
import {
  Users,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Api } from '../api/endpoints';
import type { ClientCreateInput, Client } from '../api/types';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';

interface ClientFormProps {
  clientId?: string | null;
  onNavigate: (path: string) => void;
}

const CATEGORY_PRESETS = [
  'Electronics',
  'Packaging',
  'Raw Materials',
  'Manufacturing',
  'Textiles',
  'Chemicals',
  'Automotive',
  'Hardware',
];

export const ClientForm: React.FC<ClientFormProps> = ({
  clientId,
  onNavigate,
}) => {
  const { setActiveClientId, setActiveRole, refreshSessions } = useSession();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<ClientCreateInput>({
    company_name: '',
    product_requirement: '',
    category: 'Electronics',
    quantity_required: 1000,
    budget: 25000,
    location: '',
    delivery_timeline: 'within 3 weeks',
    additional_notes: '',
  });

  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [createdClient, setCreatedClient] = useState<Client | null>(null);
  const [isFindingMatches, setIsFindingMatches] = useState(false);

  // If editing, load existing client
  useEffect(() => {
    if (clientId) {
      setIsLoadingExisting(true);
      Api.clients
        .get(clientId)
        .then((client) => {
          setFormData({
            company_name: client.company_name,
            product_requirement: client.product_requirement,
            category: client.category,
            quantity_required: client.quantity_required,
            budget: Number(client.budget),
            location: client.location,
            delivery_timeline: client.delivery_timeline,
            additional_notes: client.additional_notes || '',
          });
          if (!CATEGORY_PRESETS.includes(client.category)) {
            setIsCustomCategory(true);
          }
        })
        .catch((err) => {
          showToast('error', 'Failed to Load Client', err.detail || err.message);
        })
        .finally(() => setIsLoadingExisting(false));
    }
  }, [clientId, showToast]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.company_name.trim()) {
      errors.company_name = 'Company name is required';
    }
    if (!formData.product_requirement.trim()) {
      errors.product_requirement = 'Product requirement description is required';
    }
    if (!formData.category.trim()) {
      errors.category = 'Category is required';
    }
    if (formData.quantity_required <= 0) {
      errors.quantity_required = 'Quantity must be greater than 0';
    }
    if (formData.budget < 0) {
      errors.budget = 'Budget cannot be negative';
    }
    if (!formData.location.trim()) {
      errors.location = 'Location is required (e.g. Austin, TX, USA)';
    }
    if (!formData.delivery_timeline.trim()) {
      errors.delivery_timeline = 'Delivery timeline is required (e.g. within 3 weeks)';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showToast('warning', 'Validation Warning', 'Please fix the highlighted fields.');
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});

    try {
      if (clientId) {
        // Update existing
        const updated = await Api.clients.update(clientId, formData);
        showToast('success', 'Profile Updated', `Updated requirement for ${updated.company_name}`);
        await refreshSessions();
        setActiveClientId(updated.id);
        setActiveRole('client');
        onNavigate(`/clients/${updated.id}/dashboard`);
      } else {
        // Create new
        const created = await Api.clients.create(formData);
        setCreatedClient(created);
        setActiveClientId(created.id);
        setActiveRole('client');
        await refreshSessions();
        showToast('success', 'Requirement Registered', 'Buyer requirement saved successfully!');
      }
    } catch (err: any) {
      if (err.errors && Array.isArray(err.errors)) {
        const errorMap: Record<string, string> = {};
        err.errors.forEach((e: any) => {
          if (e.field) errorMap[e.field] = e.message;
        });
        setFieldErrors(errorMap);
      }
      showToast('error', 'Registration Error', err.detail || err.message, err.errors);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunMatching = async () => {
    if (!createdClient) return;
    setIsFindingMatches(true);
    try {
      await Api.matching.runForClient(createdClient.id);
      showToast(
        'success',
        'Matches Calculated',
        'AI matching completed! Redirecting to client dashboard...'
      );
      onNavigate(`/clients/${createdClient.id}/dashboard`);
    } catch (err: any) {
      showToast('error', 'Matching Failed', err.detail || err.message);
      onNavigate(`/clients/${createdClient.id}/dashboard`);
    } finally {
      setIsFindingMatches(false);
    }
  };

  if (isLoadingExisting) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading client profile...
      </div>
    );
  }

  // Success Confirmation View with instant Match trigger
  if (createdClient) {
    return (
      <div style={{ maxWidth: '640px', margin: '2rem auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--match-high)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Requirement Registered!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            <strong>{createdClient.company_name}</strong>'s requirement for{' '}
            <em>{createdClient.product_requirement}</em> has been indexed.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              maxWidth: '360px',
              margin: '0 auto',
            }}
          >
            <button
              className="btn btn-gradient btn-lg"
              onClick={handleRunMatching}
              disabled={isFindingMatches}
            >
              <Sparkles size={18} />
              {isFindingMatches ? 'Running AI Matching...' : 'Find Matches Now'}
              <ArrowRight size={18} />
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => onNavigate(`/clients/${createdClient.id}/dashboard`)}
            >
              Go to Client Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--brand-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
          <Users size={16} /> Buyer / Client Portal
        </div>
        <h1 style={{ fontSize: '2rem', marginTop: '0.35rem' }}>
          {clientId ? 'Edit Client Requirement' : 'Post a Product Requirement'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.25rem' }}>
          Describe what you need to procure. Our hybrid AI engine will score verified suppliers based on technical capability, pricing, capacity, and location.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
        <div className="form-grid">
          {/* Company Name */}
          <div className="form-group full-width">
            <label className="form-label">
              Company / Client Name *
            </label>
            <input
              type="text"
              className={`form-input ${fieldErrors.company_name ? 'has-error' : ''}`}
              placeholder="e.g. Apex IoT Innovations"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            />
            {fieldErrors.company_name && (
              <div className="form-error">
                <AlertCircle size={13} /> {fieldErrors.company_name}
              </div>
            )}
          </div>

          {/* Product Requirement */}
          <div className="form-group full-width">
            <label className="form-label">
              Product / Component Requirement Description *
            </label>
            <textarea
              rows={3}
              className={`form-textarea ${fieldErrors.product_requirement ? 'has-error' : ''}`}
              placeholder="e.g. Custom Multi-Layer Printed Circuit Boards (PCBs) with SMD components for high-frequency RF applications"
              value={formData.product_requirement}
              onChange={(e) => setFormData({ ...formData, product_requirement: e.target.value })}
            />
            <div className="form-hint">
              Be as specific as possible. The AI embedding model matches technical synonyms and specs.
            </div>
            {fieldErrors.product_requirement && (
              <div className="form-error">
                <AlertCircle size={13} /> {fieldErrors.product_requirement}
              </div>
            )}
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label">
              Industry Category *
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: '0 0.25rem', fontSize: '0.75rem' }}
                onClick={() => setIsCustomCategory(!isCustomCategory)}
              >
                {isCustomCategory ? 'Use Presets' : 'Custom Category'}
              </button>
            </label>
            {isCustomCategory ? (
              <input
                type="text"
                className={`form-input ${fieldErrors.category ? 'has-error' : ''}`}
                placeholder="Enter custom category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            ) : (
              <select
                className={`form-select ${fieldErrors.category ? 'has-error' : ''}`}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORY_PRESETS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
            {fieldErrors.category && (
              <div className="form-error">
                <AlertCircle size={13} /> {fieldErrors.category}
              </div>
            )}
          </div>

          {/* Quantity Required */}
          <div className="form-group">
            <label className="form-label">Quantity Required *</label>
            <input
              type="number"
              min="1"
              className={`form-input ${fieldErrors.quantity_required ? 'has-error' : ''}`}
              placeholder="e.g. 5000"
              value={formData.quantity_required || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  quantity_required: parseInt(e.target.value) || 0,
                })
              }
            />
            {fieldErrors.quantity_required && (
              <div className="form-error">
                <AlertCircle size={13} /> {fieldErrors.quantity_required}
              </div>
            )}
          </div>

          {/* Budget */}
          <div className="form-group">
            <label className="form-label">Total Target Budget ($ USD) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className={`form-input ${fieldErrors.budget ? 'has-error' : ''}`}
              placeholder="e.g. 45000.00"
              value={formData.budget || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  budget: parseFloat(e.target.value) || 0,
                })
              }
            />
            {fieldErrors.budget && (
              <div className="form-error">
                <AlertCircle size={13} /> {fieldErrors.budget}
              </div>
            )}
          </div>

          {/* Location */}
          <div className="form-group">
            <label className="form-label">Client Location / Facility *</label>
            <input
              type="text"
              className={`form-input ${fieldErrors.location ? 'has-error' : ''}`}
              placeholder="e.g. Austin, TX, USA"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
            {fieldErrors.location && (
              <div className="form-error">
                <AlertCircle size={13} /> {fieldErrors.location}
              </div>
            )}
          </div>

          {/* Delivery Timeline */}
          <div className="form-group">
            <label className="form-label">Required Delivery Timeline *</label>
            <input
              type="text"
              className={`form-input ${fieldErrors.delivery_timeline ? 'has-error' : ''}`}
              placeholder="e.g. within 3 weeks (or 14 days)"
              value={formData.delivery_timeline}
              onChange={(e) =>
                setFormData({ ...formData, delivery_timeline: e.target.value })
              }
            />
            {fieldErrors.delivery_timeline && (
              <div className="form-error">
                <AlertCircle size={13} /> {fieldErrors.delivery_timeline}
              </div>
            )}
          </div>

          {/* Additional Notes */}
          <div className="form-group full-width">
            <label className="form-label">
              Additional Certifications or Specifications (Optional)
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Requires ISO 9001 certification and RoHS compliance"
              value={formData.additional_notes || ''}
              onChange={(e) =>
                setFormData({ ...formData, additional_notes: e.target.value })
              }
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem',
            marginTop: '2rem',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '1.5rem',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigate('/')}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isSubmitting}
          >
            <Sparkles size={18} />
            {isSubmitting
              ? 'Saving...'
              : clientId
              ? 'Update Requirement'
              : 'Save & Find Matches'}
          </button>
        </div>
      </form>
    </div>
  );
};
