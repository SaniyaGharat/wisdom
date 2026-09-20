import React from 'react';
import { Sparkles } from 'lucide-react';

interface MatchScoreBadgeProps {
  score: number;
  variant?: 'pill' | 'radial' | 'compact';
  size?: 'sm' | 'md' | 'lg';
}

export const MatchScoreBadge: React.FC<MatchScoreBadgeProps> = ({
  score,
  variant = 'pill',
  size = 'md',
}) => {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  let tier: 'high' | 'mid' | 'low' = 'low';
  let color = 'var(--match-low)';

  if (normalizedScore >= 80) {
    tier = 'high';
    color = 'var(--match-high)';
  } else if (normalizedScore >= 50) {
    tier = 'mid';
    color = 'var(--match-mid)';
  }

  if (variant === 'radial') {
    const dimension = size === 'lg' ? 72 : size === 'sm' ? 44 : 56;
    const strokeWidth = size === 'lg' ? 6 : size === 'sm' ? 4 : 5;
    const radius = (dimension - strokeWidth * 2) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset =
      circumference - (normalizedScore / 100) * circumference;

    return (
      <div
        className="score-ring"
        style={{ width: dimension, height: dimension }}
        title={`Match Score: ${score.toFixed(1)}%`}
      >
        <svg width={dimension} height={dimension}>
          <circle
            stroke="rgba(255, 255, 255, 0.08)"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx={dimension / 2}
            cy={dimension / 2}
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            strokeLinecap="round"
            r={radius}
            cx={dimension / 2}
            cy={dimension / 2}
            transform={`rotate(-90 ${dimension / 2} ${dimension / 2})`}
          />
        </svg>
        <span
          className="score-ring-text"
          style={{
            color,
            fontSize: size === 'lg' ? '1.2rem' : size === 'sm' ? '0.75rem' : '0.95rem',
          }}
        >
          {normalizedScore}%
        </span>
      </div>
    );
  }

  return (
    <div className={`score-badge ${tier}`} title={`Match Score: ${score.toFixed(2)}%`}>
      <Sparkles size={size === 'sm' ? 12 : 15} />
      <span>{normalizedScore}% Match</span>
    </div>
  );
};
