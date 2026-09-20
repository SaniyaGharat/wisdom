import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  isLoadingAction?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  isLoadingAction,
}) => {
  return (
    <div className="card empty-state">
      <div className="empty-icon">{icon}</div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-description">{description}</p>
      {actionText && onAction && (
        <button
          className="btn btn-primary"
          onClick={onAction}
          disabled={isLoadingAction}
          style={{ marginTop: '0.5rem' }}
        >
          {isLoadingAction ? 'Processing...' : actionText}
        </button>
      )}
    </div>
  );
};
