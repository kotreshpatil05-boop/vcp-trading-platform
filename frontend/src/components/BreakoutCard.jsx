import React from 'react';

/**
 * Breakout Alert Card Component
 * Displays breakout confirmation details
 */
const BreakoutCard = ({ breakout, onClick }) => {
    const getConfirmationBadge = (score) => {
        if (score >= 75) return { text: 'Strong', class: 'strong' };
        if (score >= 50) return { text: 'Moderate', class: 'moderate' };
        return { text: 'Weak', class: 'weak' };
    };

    const confirmation = getConfirmationBadge(breakout.confirmation_score);

    return (
        <div className="breakout-card" onClick={onClick}>
            <div className="breakout-header">
                <div className="breakout-alert-icon">🚀</div>
                <div className="breakout-info">
                    <span className="breakout-symbol">{breakout.symbol}</span>
                    <span className="breakout-name">{breakout.stock_name}</span>
                </div>
                <span className={`confirmation-badge ${confirmation.class}`}>
                    {confirmation.text}
                </span>
            </div>

            <div className="breakout-details">
                <div className="breakout-row">
                    <span className="detail-label">Breakout Price</span>
                    <span className="detail-value price">₹{breakout.breakout_price.toLocaleString()}</span>
                </div>
                <div className="breakout-row">
                    <span className="detail-label">Pivot Price</span>
                    <span className="detail-value">₹{breakout.pivot_price.toLocaleString()}</span>
                </div>
                <div className="breakout-row">
                    <span className="detail-label">Price Change</span>
                    <span className={`detail-value ${breakout.price_change_pct >= 0 ? 'positive' : 'negative'}`}>
                        {breakout.price_change_pct >= 0 ? '+' : ''}{breakout.price_change_pct.toFixed(2)}%
                    </span>
                </div>
                <div className="breakout-row">
                    <span className="detail-label">Relative Volume</span>
                    <span className={`detail-value ${breakout.relative_volume >= 1.5 ? 'highlight' : ''}`}>
                        {breakout.relative_volume.toFixed(2)}x
                    </span>
                </div>
                {breakout.gap_up_pct > 0 && (
                    <div className="breakout-row">
                        <span className="detail-label">Gap Up</span>
                        <span className="detail-value positive">+{breakout.gap_up_pct.toFixed(2)}%</span>
                    </div>
                )}
            </div>

            <div className="confirmation-meter">
                <span className="meter-label">Confirmation Score</span>
                <div className="meter-bar">
                    <div
                        className="meter-fill"
                        style={{ width: `${breakout.confirmation_score}%` }}
                    />
                </div>
                <span className="meter-value">{breakout.confirmation_score.toFixed(0)}%</span>
            </div>

            <div className="breakout-date">
                Detected: {breakout.breakout_date}
            </div>

            <style>{`
        .breakout-card {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border: 1px solid var(--success);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          cursor: pointer;
          transition: var(--transition-normal);
          position: relative;
          overflow: hidden;
        }
        .breakout-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--success), var(--accent-primary));
        }
        .breakout-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md), 0 0 20px rgba(16, 185, 129, 0.2);
        }
        .breakout-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-md);
        }
        .breakout-alert-icon {
          font-size: 2rem;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .breakout-info {
          flex: 1;
        }
        .breakout-symbol {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--success);
          display: block;
        }
        .breakout-name {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .confirmation-badge {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .confirmation-badge.strong {
          background: var(--success-bg);
          color: var(--success);
        }
        .confirmation-badge.moderate {
          background: var(--warning-bg);
          color: var(--warning);
        }
        .confirmation-badge.weak {
          background: var(--danger-bg);
          color: var(--danger);
        }
        .breakout-details {
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
          margin-bottom: var(--spacing-md);
        }
        .breakout-row {
          display: flex;
          justify-content: space-between;
          padding: var(--spacing-xs) 0;
        }
        .breakout-row:not(:last-child) {
          border-bottom: 1px solid var(--border-color);
        }
        .detail-label {
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        .detail-value {
          font-weight: 500;
          font-size: 0.875rem;
        }
        .detail-value.price {
          font-weight: 700;
          font-size: 1rem;
        }
        .detail-value.positive {
          color: var(--success);
        }
        .detail-value.negative {
          color: var(--danger);
        }
        .detail-value.highlight {
          color: var(--accent-primary);
          font-weight: 700;
        }
        .confirmation-meter {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-md);
        }
        .meter-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          min-width: 100px;
        }
        .meter-bar {
          flex: 1;
          height: 8px;
          background: var(--bg-tertiary);
          border-radius: 4px;
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-primary), var(--success));
          border-radius: 4px;
          transition: width 0.5s ease;
        }
        .meter-value {
          font-weight: 600;
          min-width: 40px;
          text-align: right;
          color: var(--success);
        }
        .breakout-date {
          text-align: center;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
      `}</style>
        </div>
    );
};

export default BreakoutCard;
