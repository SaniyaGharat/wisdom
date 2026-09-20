import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Api } from '../api/endpoints';
import type { SupplierCreateInput, Supplier } from '../api/types';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';

interface SupplierFormProps {
  supplierId?: string | null;
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

export const SupplierForm: React.FC<SupplierFormProps> = ({
  supplierId,
  onNavigate,
}) => {
  const { setActiveSupplierId, setActiveRole, refreshSessions } = useSession();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<SupplierCreateInput>({
    supplier_name: '',
    product_offered: '',
    category: 'Electronics',
    available_quantity: 10000,
    pricing_details: 12.5,
    location: '',
    delivery_capability: 'ships in 7-10 days',
    additional_notes: '',
  });

  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [createdSupplier, setCreatedSupplier] = useState<Supplier | null>(null);
  const [isFindingMatches, setIsFindingMatches] = useState(false);

  // If editing, load existing supplier
  useEffect(() => {
    if (supplierId) {
      setIsLoadingExisting(true);
      Api.suppliers
        .get(supplierId)
        .then((supplier) => {
          setFormData({
            supplier_name: supplier.supplier_name,
            product_offered: supplier.product_offered,
            category: supplier.category,
            available_quantity: supplier.available_quantity,
            pricing_details: Number(supplier.pricing_details),
            location: supplier.location,
            delivery_capability: supplier.delivery_capability,
            additional_notes: supplier.additional_notes || '',
          });
          if (!CATEGORY_PRESETS.includes(supplier.category)) {
            setIsCustomCategory(true);
          }
        })
        .catch((err) => {
          showToast('error', 'Failed to Load Supplier', err.detail || err.message);
        })
        .finally(() => setIsLoadingExisting(false));
    }
  }, [supplierId, showToast]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.supplier_name.trim()) {
      errors.supplier_name = 'Supplier name is required';
    }
    if (!formData.product_offered.trim()) {
      errors.product_offered = 'Product offering description is required';
    }
    if (!formData.category.trim()) {
      errors.category = 'Category is required';
    }
    if (formData.available_quantity <= 0) {
      errors.available_quantity = 'Available capacity must be greater than 0';
    }
    if (formData.pricing_details < 0) {
      errors.pricing_details = 'Unit price cannot be negative';
    }
    if (!formData.location.trim()) {
      errors.location = 'Warehouse / Facility location is required';
    }
    if (!formData.delivery_capability.trim()) {
      errors.delivery_capability = 'Delivery capability is required (e.g. ships in 10-14 days)';
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
      if (supplierId) {
        // Update existing
        const updated = await Api.suppliers.update(supplierId, formData);
        showToast('success', 'Profile Updated', `Updated offering for ${updated.supplier_name}`);
        await refreshSessions();
        setActiveSupplierId(updated.id);
        setActiveRole('supplier');
        onNavigate(`/suppliers/${updated.id}/dashboard`);
      } else {
        // Create new
        const created = await Api.suppliers.create(formData);
        setCreatedSupplier(created);
        setActiveSupplierId(created.id);
        setActiveRole('supplier');
        await refreshSessions();
        showToast('success', 'Supplier Registered', 'Manufacturing capability saved successfully!');
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
    if (!createdSupplier) return;
    setIsFindingMatches(true);
    try {
      // Trigger batch matching so this supplier gets paired with all matching clients
      await Api.matching.runAll(35.0);
      showToast(
        'success',
        'Leads Discovered',
        'Client matching completed! Navigating to supplier dashboard...'
      );
      onNavigate(`/suppliers/${createdSupplier.id}/dashboard`);
    } catch (err: any) {
      showToast('error', 'Matching Run Failed', err.detail || err.message);
      onNavigate(`/suppliers/${createdSupplier.id}/dashboard`);
    } finally {
      setIsFindingMatches(false);
    }
  };

  if (isLoadingExisting) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading supplier profile...
      </div>
    );
  }

  // Success Confirmation View
  if (createdSupplier) {
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

          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Supplier Profile Published!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            <strong>{createdSupplier.supplier_name}</strong>'s offering for{' '}
            <em>{createdSupplier.product_offered}</em> is live in the supplier directory.
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
              {isFindingMatches ? 'Discovering Buyer Demands...' : 'Find Buyer Leads Now'}
              <ArrowRight size={18} />
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => onNavigate(`/suppliers/${createdSupplier.id}/dashboard`)}
            >
              Go to Supplier Dashboard
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
          <Briefcase size={16} /> Supplier / Vendor Portal
        </div>
        <h1 style={{ fontSize: '2rem', marginTop: '0.35rem' }}>
          {supplierId ? 'Edit Supplier Offering' : 'Register Supplier Capabilities'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.25rem' }}>
          Publish your manufacturing or supply capabilities. Incoming client requirements will be scored against your capacity, unit pricing, and lead times.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
        <div className="form-grid">
          {/* Supplier Name */}
          <div className="form-group full-width">
            <label className="form-label">Supplier / Company Name *</label>
            <input
              type="text"
              className={`form-input ${fieldErrors.supplier_name ? 'has-error' : ''}`}
              placeholder="e.g. CircuitCraft Microelectronics Corp"
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
            />
            {fieldErrors.supplier_name && (
              <div className="form-error">
                <AlertCircle size={13} /> {fieldErrors.supplier_name}
              </div>
            )}
          </div>

          {/* Product Offered */}
          <div className="form-group full-width">
            <label className="form-label">Product / Service Capabilities Offered *</label>
            <textarea
              rows={3}
              className={`form-textarea ${fieldErrors.product_offered ? 'has-error' : ''}`}
              placeholder="e.g. Turnkey Multilayer PCB Fabrication & High-Speed SMT Assembly with AOI and X-ray testing"
              value={formData.product_offered}
              onChange={(e) => setFormData({ ...formData, product_offered: e.target.value })}
            />
            <div className="form-hint">
              Include specific technologies, materials, tolerances, or process capabilities.
            </div>
            {fieldErrors.product_offered && (
              <div className="form-error">
                <AlertCircle size={13} /> {fieldErrors.product_offered}
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

          {/* Available Quantity */}
          <div className="form-group">
            <label className="form-label">Available Capacity / Supply Units *</label>
            <input
              type="number"
              min="1"
              className={`form-input ${fieldErrors.available_quantity ? 'has-error' : ''}`}
              placeholder="e.g. 20000"
              value={formData.available_quantity || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  available_quantity: parseInt(e.target.value) || 0,
                })
              }
            />
            {fieldErrors.available_quantity && (
              <div className="form-error">
                <AlertCircle size={13} /> {fieldErrors.available_quantity}
              </div>
            )}
          </div>

          {/* Unit Price */}
          <div className="form-group">
            <label className="form-label">Estimated Unit Price ($ USD) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className={`form-input ${fieldErrors.pricing_details ? 'has-error' : ''}`}
              placeholder="e.g. 7.80"
              value={formData.pricing_details || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  pricing_details: parseFloat(e.target.value) || 0,
                })
              }
            />
            {fieldErrors.pricing_details && (
              <div className="form-error">
                <AlertCircle size={13} /> {fieldErrors.pricing_details}
              </div>
            )}
          </div>

          {/* Location */}
          <div className="form-group">
            <label className="form-label">Warehouse / Manufacturing Location *</label>
            <input
              type="text"
              className={`form-input ${fieldErrors.location ? 'has-error' : ''}`}
              placeholder="e.g. Dallas, TX, USA"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
            {fieldErrors.location && (
              <div className="form-error">
                <AlertCircle size={13} /> {fieldErrors.location}
              </div>
            )}
          </div>

          {/* Delivery Capability */}
          <div className="form-group">
            <label className="form-label">Delivery Capability / Lead Time *</label>
            <input
              type="text"
              className={`form-input ${fieldErrors.delivery_capability ? 'has-error' : ''}`}
              placeholder="e.g. ships in 10-14 days"
              value={formData.delivery_capability}
              onChange={(e) =>
                setFormData({ ...formData, delivery_capability: e.target.value })
              }
            />
            {fieldErrors.delivery_capability && (
              <div className="form-error">
                <AlertCircle size={13} /> {fieldErrors.delivery_capability}
              </div>
            )}
          </div>

          {/* Additional Notes */}
          <div className="form-group full-width">
            <label className="form-label">
              Quality Certifications / Factory Capabilities (Optional)
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Equipped with automated optical inspection (AOI) and certified IPC-A-610 Class 3"
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
              ? 'Publishing...'
              : supplierId
              ? 'Update Offering'
              : 'Save & Discover Leads'}
          </button>
        </div>
      </form>
    </div>
  );
};
