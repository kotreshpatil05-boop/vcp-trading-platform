import React from 'react';

/**
 * VCP Setup Card Component
 * Displays VCP pattern analysis with legs visualization
 */
const VCPCard = ({ setup, onClick }) => {
    const getScoreColor = (score) => {
        if (score >= 70) return 'high';
        if (score >= 50) return 'medium';
        return 'low';
    };

    const getLegsHeight = (legs) => {
        const maxDepth = Math.max(...legs.map(l => l.pullback_depth));
        return legs.map(leg => ({
            ...leg,
            height: (leg.pullback_depth / maxDepth) * 100
        }));
    };

    const scaledLegs = setup.legs ? getLegsHeight(setup.legs) : [];

    return (
        <div className="vcp-card" onClick={onClick}>
            <div className="vcp-card-header">
                <div className="vcp-symbol-info">
                    <span className="vcp-symbol">{setup.symbol}</span>
                    <span className="vcp-name">{setup.stock_name}</span>
                </div>
                <div className="vcp-price-info">
                    <span className="vcp-price">₹{setup.current_price.toLocaleString()}</span>
                    <span className={`vcp-distance ${setup.distance_from_pivot <= 5 ? 'close' : ''}`}>
                        {setup.distance_from_pivot.toFixed(1)}% from pivot
                    </span>
                </div>
            </div>

            <div className="vcp-metrics">
                <div className="vcp-metric">
                    <span className="metric-label">Base Depth</span>
                    <span className="metric-value">{setup.total_base_depth.toFixed(1)}%</span>
                </div>
                <div className="vcp-metric">
                    <span className="metric-label">RS Percentile</span>
                    <span className="metric-value">{setup.rs_percentile.toFixed(0)}</span>
                </div>
                <div className="vcp-metric">
                    <span className="metric-label">Vol Dry-Up</span>
                    <span className="metric-value">{setup.volume_dry_up.toFixed(0)}%</span>
                </div>
                <div className="vcp-metric">
                    <span className="metric-label">Legs</span>
                    <span className="metric-value">{setup.legs?.length || 0}</span>
                </div>
            </div>

            <div className="vcp-legs-viz">
                <div className="vcp-legs">
                    {scaledLegs.map((leg, idx) => (
                        <div
                            key={idx}
                            className="vcp-leg"
                            style={{ height: `${leg.height}%` }}
                            data-depth={`${leg.pullback_depth.toFixed(0)}%`}
                            title={`Leg ${leg.leg_number}: ${leg.pullback_depth.toFixed(1)}% pullback`}
                        />
                    ))}
                </div>
                <span className="vcp-legs-label">Contraction Pattern</span>
            </div>

            <div className="vcp-score">
                <span className="score-label">VCP Score</span>
                <div className="score-indicator">
                    <div className="score-bar">
                        <div
                            className={`score-fill ${getScoreColor(setup.score)}`}
                            style={{ width: `${setup.score}%` }}
                        />
                    </div>
                    <span className="score-value">{setup.score.toFixed(0)}</span>
                </div>
            </div>

            <div className="vcp-trend">
                {setup.trend_alignment ? (
                    <span className="trend-badge aligned">✓ Trend Aligned</span>
                ) : (
                    <span className="trend-badge misaligned">✗ No Trend Alignment</span>
                )}
            </div>

            <style>{`
        .vcp-card {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          cursor: pointer;
          transition: var(--transition-normal);
        }
        .vcp-card:hover {
          border-color: var(--border-hover);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .vcp-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--spacing-md);
        }
        .vcp-symbol {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--accent-primary);
          display: block;
        }
        .vcp-name {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .vcp-price {
          font-size: 1.125rem;
          font-weight: 600;
          display: block;
          text-align: right;
        }
        .vcp-distance {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .vcp-distance.close {
          color: var(--success);
        }
        .vcp-metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
        }
        .vcp-metric {
          text-align: center;
        }
        .metric-label {
          display: block;
          font-size: 0.65rem;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .metric-value {
          font-weight: 600;
          font-size: 0.9rem;
        }
        .vcp-legs-viz {
          margin-bottom: var(--spacing-md);
        }
        .vcp-legs {
          display: flex;
          align-items: flex-end;
          gap: var(--spacing-xs);
          height: 60px;
          margin-bottom: var(--spacing-xs);
        }
        .vcp-leg {
          flex: 1;
          background: var(--accent-gradient);
          border-radius: var(--radius-sm) var(--radius-sm) 0 0;
          min-height: 8px;
          position: relative;
          opacity: 0.8;
          transition: var(--transition-normal);
        }
        .vcp-leg:hover {
          opacity: 1;
        }
        .vcp-legs-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          display: block;
          text-align: center;
        }
        .vcp-score {
          margin-bottom: var(--spacing-md);
        }
        .score-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          display: block;
          margin-bottom: var(--spacing-xs);
        }
        .vcp-trend {
          text-align: center;
        }
        .trend-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .trend-badge.aligned {
          background: var(--success-bg);
          color: var(--success);
        }
        .trend-badge.misaligned {
          background: var(--warning-bg);
          color: var(--warning);
        }
      `}</style>
        </div>
    );
};

export default VCPCard;
