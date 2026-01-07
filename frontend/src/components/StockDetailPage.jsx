import React, { useState, useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

/**
 * Stock Detail Page Component
 * Full detailed analysis with VCP pattern proof, trading levels, and charts
 */
const StockDetailPage = ({ stock, onClose }) => {
    const chartContainerRef = useRef(null);
    const [activeTab, setActiveTab] = useState('analysis');

    // Calculate trading levels based on VCP setup
    const calculateTradingLevels = () => {
        if (!stock?.vcp_setup) {
            return {
                entry: stock?.current_price || 0,
                stopLoss: 0,
                target1: 0,
                target2: 0,
                target3: 0,
                riskRewardRatio: 0
            };
        }

        const setup = stock.vcp_setup;
        const pivotPrice = setup.pivot_price;
        const currentPrice = setup.current_price;

        // Entry: Just above pivot (1% buffer)
        const entry = pivotPrice * 1.01;

        // Stop Loss: Below the lowest low of the last leg or 7-8% below entry
        const lastLeg = setup.legs?.[setup.legs.length - 1];
        const stopLossFromLeg = lastLeg ? lastLeg.low_price * 0.99 : entry * 0.92;
        const stopLossPercent = entry * 0.92; // 8% below entry
        const stopLoss = Math.max(stopLossFromLeg, stopLossPercent);

        // Risk amount
        const risk = entry - stopLoss;

        // Targets based on risk-reward (1:2, 1:3, 1:5)
        const target1 = entry + (risk * 2); // 1:2 R:R
        const target2 = entry + (risk * 3); // 1:3 R:R
        const target3 = entry + (risk * 5); // 1:5 R:R

        const riskPercent = ((entry - stopLoss) / entry) * 100;
        const rewardPercent = ((target2 - entry) / entry) * 100;
        const riskRewardRatio = rewardPercent / riskPercent;

        return {
            entry: entry.toFixed(2),
            stopLoss: stopLoss.toFixed(2),
            target1: target1.toFixed(2),
            target2: target2.toFixed(2),
            target3: target3.toFixed(2),
            riskPercent: riskPercent.toFixed(1),
            rewardPercent: rewardPercent.toFixed(1),
            riskRewardRatio: riskRewardRatio.toFixed(1)
        };
    };

    const tradingLevels = calculateTradingLevels();
    const setup = stock?.vcp_setup;

    // VCP Pattern Proof Points
    const getVCPProofPoints = () => {
        if (!setup) return [];

        const proofs = [];

        // Check progressive contraction
        if (setup.legs && setup.legs.length >= 3) {
            const isProgressive = setup.legs.every((leg, i) =>
                i === 0 || leg.pullback_depth < setup.legs[i - 1].pullback_depth
            );
            proofs.push({
                criteria: 'Progressive Contraction',
                status: isProgressive,
                detail: `${setup.legs.length} legs with decreasing pullback depths`,
                values: setup.legs.map(l => `${l.pullback_depth.toFixed(1)}%`).join(' → ')
            });
        }

        // Volume dry-up
        proofs.push({
            criteria: 'Volume Dry-Up',
            status: setup.volume_dry_up > 20,
            detail: `Volume contracted by ${setup.volume_dry_up.toFixed(1)}%`,
            values: setup.volume_dry_up >= 30 ? 'Excellent' : setup.volume_dry_up >= 20 ? 'Good' : 'Weak'
        });

        // Base depth
        proofs.push({
            criteria: 'Shallow Base (12-15%)',
            status: setup.total_base_depth >= 8 && setup.total_base_depth <= 20,
            detail: `Total base depth: ${setup.total_base_depth.toFixed(1)}%`,
            values: setup.total_base_depth <= 15 ? 'Ideal' : 'Acceptable'
        });

        // Trend alignment
        proofs.push({
            criteria: 'Trend Alignment',
            status: setup.trend_alignment,
            detail: 'Price above 20-SMA and 50-SMA',
            values: setup.trend_alignment ? 'Aligned ✓' : 'Not Aligned ✗'
        });

        // Relative strength
        proofs.push({
            criteria: 'Relative Strength > 70',
            status: setup.rs_percentile >= 70,
            detail: `RS Percentile: ${setup.rs_percentile.toFixed(0)}`,
            values: setup.rs_percentile >= 80 ? 'Strong Leader' : setup.rs_percentile >= 70 ? 'Above Average' : 'Weak'
        });

        // Distance from pivot
        proofs.push({
            criteria: 'Near Breakout Point',
            status: setup.distance_from_pivot <= 7,
            detail: `${setup.distance_from_pivot.toFixed(1)}% from pivot`,
            values: setup.distance_from_pivot <= 3 ? 'Very Close' : setup.distance_from_pivot <= 7 ? 'In Range' : 'Too Far'
        });

        return proofs;
    };

    const proofPoints = getVCPProofPoints();
    const passedCriteria = proofPoints.filter(p => p.status).length;
    const totalCriteria = proofPoints.length;

    return (
        <div className="stock-detail-overlay">
            <div className="stock-detail-page">
                {/* Header */}
                <div className="detail-header">
                    <div className="header-left">
                        <button className="back-btn" onClick={onClose}>← Back</button>
                        <div className="stock-title">
                            <h1>{stock?.symbol}</h1>
                            <span className="stock-name">{stock?.name || stock?.stock_name}</span>
                        </div>
                    </div>
                    <div className="header-right">
                        <div className="current-price">
                            <span className="price-label">Current Price</span>
                            <span className="price-value">₹{stock?.current_price?.toLocaleString()}</span>
                        </div>
                        <div className={`vcp-badge ${passedCriteria >= 5 ? 'strong' : passedCriteria >= 3 ? 'moderate' : 'weak'}`}>
                            VCP Score: {setup?.score?.toFixed(0) || 'N/A'}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="detail-tabs">
                    <button
                        className={`tab ${activeTab === 'analysis' ? 'active' : ''}`}
                        onClick={() => setActiveTab('analysis')}
                    >
                        📊 Analysis
                    </button>
                    <button
                        className={`tab ${activeTab === 'trading' ? 'active' : ''}`}
                        onClick={() => setActiveTab('trading')}
                    >
                        🎯 Trading Plan
                    </button>
                    <button
                        className={`tab ${activeTab === 'pattern' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pattern')}
                    >
                        📐 VCP Proof
                    </button>
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {/* Analysis Tab */}
                    {activeTab === 'analysis' && (
                        <div className="analysis-tab">
                            {/* Chart Section */}
                            <div className="chart-section">
                                <div className="section-header">
                                    <h3>📈 Price Chart with VCP Pattern</h3>
                                    <div className="chart-legend">
                                        <span className="legend-item"><span className="dot sma20"></span> SMA 20</span>
                                        <span className="legend-item"><span className="dot sma50"></span> SMA 50</span>
                                        <span className="legend-item"><span className="dot pivot"></span> Pivot Level</span>
                                    </div>
                                </div>
                                <div className="chart-placeholder">
                                    <div className="pattern-visualization">
                                        {/* VCP Pattern ASCII Art */}
                                        <div className="vcp-pattern-visual">
                                            <svg viewBox="0 0 400 150" className="vcp-svg">
                                                {/* Base pattern line */}
                                                <path
                                                    d="M 20 20 L 60 80 L 100 30 L 130 70 L 160 40 L 185 60 L 210 45 L 230 55 L 250 48 L 280 52 L 380 20"
                                                    stroke="url(#gradient)"
                                                    strokeWidth="3"
                                                    fill="none"
                                                />
                                                {/* Pivot line */}
                                                <line x1="20" y1="20" x2="380" y2="20" stroke="#ffd700" strokeWidth="1" strokeDasharray="5,5" />
                                                {/* Stop loss line */}
                                                <line x1="20" y1="80" x2="380" y2="80" stroke="#ef4444" strokeWidth="1" strokeDasharray="3,3" />
                                                {/* Leg labels */}
                                                <text x="80" y="100" fill="#94a3b8" fontSize="10">Leg 1</text>
                                                <text x="140" y="90" fill="#94a3b8" fontSize="10">Leg 2</text>
                                                <text x="195" y="80" fill="#94a3b8" fontSize="10">Leg 3</text>
                                                <text x="240" y="75" fill="#94a3b8" fontSize="10">Leg 4</text>
                                                <text x="320" y="35" fill="#10b981" fontSize="10">Breakout →</text>
                                                <text x="385" y="25" fill="#ffd700" fontSize="9">Pivot</text>
                                                <text x="385" y="85" fill="#ef4444" fontSize="9">Stop</text>
                                                <defs>
                                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" stopColor="#00d4ff" />
                                                        <stop offset="100%" stopColor="#10b981" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                        </div>
                                        <div className="pattern-labels">
                                            <div className="label">
                                                <span className="icon">📉</span>
                                                <span>Contracting Volatility</span>
                                            </div>
                                            <div className="label">
                                                <span className="icon">📊</span>
                                                <span>Decreasing Volume</span>
                                            </div>
                                            <div className="label">
                                                <span className="icon">🎯</span>
                                                <span>Pivot Point Ready</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Key Metrics */}
                            <div className="metrics-grid">
                                <div className="metric-card">
                                    <span className="metric-icon">📊</span>
                                    <span className="metric-label">VCP Score</span>
                                    <span className="metric-value">{setup?.score?.toFixed(0) || '-'}</span>
                                </div>
                                <div className="metric-card">
                                    <span className="metric-icon">📐</span>
                                    <span className="metric-label">Base Depth</span>
                                    <span className="metric-value">{setup?.total_base_depth?.toFixed(1)}%</span>
                                </div>
                                <div className="metric-card">
                                    <span className="metric-icon">📈</span>
                                    <span className="metric-label">RS Percentile</span>
                                    <span className="metric-value">{setup?.rs_percentile?.toFixed(0)}</span>
                                </div>
                                <div className="metric-card">
                                    <span className="metric-icon">🔊</span>
                                    <span className="metric-label">Vol Dry-Up</span>
                                    <span className="metric-value">{setup?.volume_dry_up?.toFixed(0)}%</span>
                                </div>
                                <div className="metric-card">
                                    <span className="metric-icon">🦵</span>
                                    <span className="metric-label">Pattern Legs</span>
                                    <span className="metric-value">{setup?.legs?.length || 0}</span>
                                </div>
                                <div className="metric-card">
                                    <span className="metric-icon">📏</span>
                                    <span className="metric-label">From Pivot</span>
                                    <span className="metric-value">{setup?.distance_from_pivot?.toFixed(1)}%</span>
                                </div>
                            </div>

                            {/* Contraction Legs Detail */}
                            <div className="legs-section">
                                <h3>🦵 Contraction Legs Analysis</h3>
                                <div className="legs-table">
                                    <div className="legs-header">
                                        <span>Leg</span>
                                        <span>Pullback %</span>
                                        <span>Volume</span>
                                        <span>Days</span>
                                        <span>Contraction</span>
                                    </div>
                                    {setup?.legs?.map((leg, idx) => (
                                        <div key={idx} className="leg-row">
                                            <span className="leg-num">Leg {leg.leg_number}</span>
                                            <span className={`pullback ${leg.pullback_depth < 15 ? 'good' : ''}`}>
                                                {leg.pullback_depth.toFixed(1)}%
                                            </span>
                                            <span className="volume">{leg.volume_ratio.toFixed(2)}x</span>
                                            <span className="days">{leg.duration_days}d</span>
                                            <span className="contraction">
                                                {idx > 0 && setup.legs[idx - 1].pullback_depth > leg.pullback_depth
                                                    ? <span className="contracting">✓ Contracting</span>
                                                    : idx === 0
                                                        ? <span className="first">Base Leg</span>
                                                        : <span className="expanding">⚠ Expanding</span>
                                                }
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Trading Plan Tab */}
                    {activeTab === 'trading' && (
                        <div className="trading-tab">
                            {/* Trading Levels Card */}
                            <div className="trading-levels-card">
                                <h3>🎯 Trading Levels</h3>
                                <div className="levels-visual">
                                    <div className="level-bar">
                                        <div className="target target3" style={{ bottom: '90%' }}>
                                            <span className="level-label">Target 3 (1:5)</span>
                                            <span className="level-price">₹{tradingLevels.target3}</span>
                                        </div>
                                        <div className="target target2" style={{ bottom: '70%' }}>
                                            <span className="level-label">Target 2 (1:3)</span>
                                            <span className="level-price">₹{tradingLevels.target2}</span>
                                        </div>
                                        <div className="target target1" style={{ bottom: '50%' }}>
                                            <span className="level-label">Target 1 (1:2)</span>
                                            <span className="level-price">₹{tradingLevels.target1}</span>
                                        </div>
                                        <div className="entry" style={{ bottom: '30%' }}>
                                            <span className="level-label">🚀 Entry (Above Pivot)</span>
                                            <span className="level-price">₹{tradingLevels.entry}</span>
                                        </div>
                                        <div className="stoploss" style={{ bottom: '10%' }}>
                                            <span className="level-label">🛑 Stop Loss</span>
                                            <span className="level-price">₹{tradingLevels.stopLoss}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Risk Reward Analysis */}
                            <div className="risk-reward-card">
                                <h3>⚖️ Risk/Reward Analysis</h3>
                                <div className="rr-grid">
                                    <div className="rr-item risk">
                                        <span className="rr-label">Risk</span>
                                        <span className="rr-value">{tradingLevels.riskPercent}%</span>
                                        <span className="rr-amount">₹{(parseFloat(tradingLevels.entry) - parseFloat(tradingLevels.stopLoss)).toFixed(2)}</span>
                                    </div>
                                    <div className="rr-divider">:</div>
                                    <div className="rr-item reward">
                                        <span className="rr-label">Reward</span>
                                        <span className="rr-value">{tradingLevels.rewardPercent}%</span>
                                        <span className="rr-amount">₹{(parseFloat(tradingLevels.target2) - parseFloat(tradingLevels.entry)).toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="rr-ratio">
                                    <span>Risk:Reward Ratio</span>
                                    <span className={`ratio ${parseFloat(tradingLevels.riskRewardRatio) >= 2 ? 'good' : 'bad'}`}>
                                        1:{tradingLevels.riskRewardRatio}
                                    </span>
                                </div>
                            </div>

                            {/* Exit Strategy */}
                            <div className="exit-strategy-card">
                                <h3>🚪 Exit Strategy</h3>
                                <div className="exit-rules">
                                    <div className="exit-rule">
                                        <div className="rule-icon profit">💰</div>
                                        <div className="rule-content">
                                            <h4>Profit Taking (Scaling Out)</h4>
                                            <ul>
                                                <li>Sell <strong>33%</strong> at Target 1 (₹{tradingLevels.target1})</li>
                                                <li>Sell <strong>33%</strong> at Target 2 (₹{tradingLevels.target2})</li>
                                                <li>Trail remaining <strong>34%</strong> with 20-SMA</li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="exit-rule">
                                        <div className="rule-icon loss">🛑</div>
                                        <div className="rule-content">
                                            <h4>Stop Loss Rules</h4>
                                            <ul>
                                                <li>Initial stop: <strong>₹{tradingLevels.stopLoss}</strong> (below last leg low)</li>
                                                <li>Move to breakeven after <strong>+5%</strong> gain</li>
                                                <li>Use <strong>trailing stop</strong> after Target 1</li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="exit-rule">
                                        <div className="rule-icon warning">⚠️</div>
                                        <div className="rule-content">
                                            <h4>Exit Signals</h4>
                                            <ul>
                                                <li>Close below <strong>20-SMA</strong> on heavy volume</li>
                                                <li>Bearish reversal pattern at resistance</li>
                                                <li>Market-wide weakness</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Position Sizing */}
                            <div className="position-card">
                                <h3>📊 Position Sizing Guide</h3>
                                <div className="position-calc">
                                    <div className="calc-item">
                                        <span>If Portfolio = ₹10,00,000</span>
                                        <span>Risk 1% = ₹10,000</span>
                                    </div>
                                    <div className="calc-item">
                                        <span>Per Share Risk = ₹{(parseFloat(tradingLevels.entry) - parseFloat(tradingLevels.stopLoss)).toFixed(2)}</span>
                                        <span>Max Shares = {Math.floor(10000 / (parseFloat(tradingLevels.entry) - parseFloat(tradingLevels.stopLoss)))}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VCP Proof Tab */}
                    {activeTab === 'pattern' && (
                        <div className="pattern-tab">
                            {/* VCP Validation Score */}
                            <div className="validation-header">
                                <div className="validation-score">
                                    <div className="score-circle">
                                        <span className="score-num">{passedCriteria}</span>
                                        <span className="score-total">/{totalCriteria}</span>
                                    </div>
                                    <span className="score-label">Criteria Passed</span>
                                </div>
                                <div className={`validation-badge ${passedCriteria >= 5 ? 'valid' : passedCriteria >= 3 ? 'partial' : 'invalid'}`}>
                                    {passedCriteria >= 5 ? '✅ Valid VCP Pattern' : passedCriteria >= 3 ? '⚠️ Partial VCP' : '❌ Not Valid VCP'}
                                </div>
                            </div>

                            {/* Proof Points */}
                            <div className="proof-grid">
                                {proofPoints.map((proof, idx) => (
                                    <div key={idx} className={`proof-card ${proof.status ? 'passed' : 'failed'}`}>
                                        <div className="proof-header">
                                            <span className={`proof-status ${proof.status ? 'pass' : 'fail'}`}>
                                                {proof.status ? '✓' : '✗'}
                                            </span>
                                            <span className="proof-title">{proof.criteria}</span>
                                        </div>
                                        <div className="proof-detail">{proof.detail}</div>
                                        <div className="proof-values">{proof.values}</div>
                                    </div>
                                ))}
                            </div>

                            {/* VCP Definition Reference */}
                            <div className="vcp-reference">
                                <h3>📚 Mark Minervini VCP Criteria Reference</h3>
                                <div className="reference-content">
                                    <div className="ref-item">
                                        <strong>1. Volatility Contraction:</strong> Each pullback should be smaller than the previous one (tightening pattern)
                                    </div>
                                    <div className="ref-item">
                                        <strong>2. Volume Dry-Up:</strong> Volume should decrease during the base formation, showing lack of selling pressure
                                    </div>
                                    <div className="ref-item">
                                        <strong>3. Base Depth:</strong> Final contraction should be shallow (typically 10-15%), indicating accumulation
                                    </div>
                                    <div className="ref-item">
                                        <strong>4. Pivot Point:</strong> A clear resistance level that, when broken on volume, triggers the trade
                                    </div>
                                    <div className="ref-item">
                                        <strong>5. Relative Strength:</strong> Stock should outperform the market (RS Rating > 70)
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        .stock-detail-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          z-index: 1000;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: var(--spacing-xl);
          overflow-y: auto;
        }
        
        .stock-detail-page {
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          max-width: 1200px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-lg);
        }
        
        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-lg) var(--spacing-xl);
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-glass);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
        }
        
        .back-btn {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-size: 0.9rem;
          transition: var(--transition-normal);
        }
        
        .back-btn:hover {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
        }
        
        .stock-title h1 {
          font-size: 1.75rem;
          color: var(--accent-primary);
          margin: 0;
        }
        
        .stock-title .stock-name {
          font-size: 0.875rem;
          color: var(--text-muted);
        }
        
        .header-right {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
        }
        
        .current-price {
          text-align: right;
        }
        
        .price-label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        
        .price-value {
          font-size: 1.5rem;
          font-weight: 700;
        }
        
        .vcp-badge {
          padding: var(--spacing-sm) var(--spacing-lg);
          border-radius: var(--radius-md);
          font-weight: 600;
        }
        
        .vcp-badge.strong { background: var(--success-bg); color: var(--success); }
        .vcp-badge.moderate { background: var(--warning-bg); color: var(--warning); }
        .vcp-badge.weak { background: var(--danger-bg); color: var(--danger); }
        
        .detail-tabs {
          display: flex;
          gap: var(--spacing-sm);
          padding: var(--spacing-md) var(--spacing-xl);
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-tertiary);
        }
        
        .tab {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: var(--spacing-md) var(--spacing-lg);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: var(--transition-normal);
        }
        
        .tab:hover {
          background: var(--bg-glass);
          color: var(--text-primary);
        }
        
        .tab.active {
          background: var(--accent-gradient);
          color: white;
        }
        
        .tab-content {
          padding: var(--spacing-xl);
        }
        
        /* Analysis Tab */
        .chart-section {
          margin-bottom: var(--spacing-xl);
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }
        
        .section-header h3 {
          margin: 0;
          font-size: 1.125rem;
        }
        
        .chart-legend {
          display: flex;
          gap: var(--spacing-md);
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        
        .dot.sma20 { background: #00d4ff; }
        .dot.sma50 { background: #ffd700; }
        .dot.pivot { background: #10b981; }
        
        .chart-placeholder {
          background: var(--bg-tertiary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-xl);
          min-height: 250px;
        }
        
        .pattern-visualization {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-lg);
        }
        
        .vcp-svg {
          width: 100%;
          max-width: 500px;
          height: auto;
        }
        
        .pattern-labels {
          display: flex;
          gap: var(--spacing-xl);
        }
        
        .pattern-labels .label {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        
        .pattern-labels .icon {
          font-size: 1.25rem;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-xl);
        }
        
        .metric-card {
          background: var(--bg-glass);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .metric-icon {
          font-size: 1.5rem;
        }
        
        .metric-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        
        .metric-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--accent-primary);
        }
        
        /* Legs Section */
        .legs-section h3 {
          margin-bottom: var(--spacing-md);
        }
        
        .legs-table {
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        
        .legs-header, .leg-row {
          display: grid;
          grid-template-columns: 80px 100px 80px 60px 1fr;
          padding: var(--spacing-md);
          align-items: center;
        }
        
        .legs-header {
          background: var(--bg-glass);
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
        }
        
        .leg-row {
          border-top: 1px solid var(--border-color);
        }
        
        .leg-num {
          font-weight: 600;
          color: var(--accent-primary);
        }
        
        .pullback.good {
          color: var(--success);
        }
        
        .contracting {
          color: var(--success);
          font-size: 0.8rem;
        }
        
        .expanding {
          color: var(--warning);
          font-size: 0.8rem;
        }
        
        .first {
          color: var(--text-muted);
          font-size: 0.8rem;
        }
        
        /* Trading Tab */
        .trading-levels-card,
        .risk-reward-card,
        .exit-strategy-card,
        .position-card {
          background: var(--bg-glass);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          margin-bottom: var(--spacing-lg);
        }
        
        .trading-levels-card h3,
        .risk-reward-card h3,
        .exit-strategy-card h3,
        .position-card h3 {
          margin: 0 0 var(--spacing-lg) 0;
          font-size: 1.125rem;
        }
        
        .levels-visual {
          position: relative;
          padding: var(--spacing-md) 0;
        }
        
        .level-bar {
          position: relative;
          height: 300px;
          background: linear-gradient(to top, #ef4444 0%, #ffd700 50%, #10b981 100%);
          border-radius: var(--radius-md);
          opacity: 0.2;
          width: 40px;
          margin: 0 auto;
        }
        
        .level-bar > div {
          position: absolute;
          right: 60px;
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          white-space: nowrap;
        }
        
        .level-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        
        .level-price {
          font-weight: 700;
          font-size: 1rem;
        }
        
        .target .level-price { color: var(--success); }
        .entry .level-price { color: var(--accent-primary); }
        .stoploss .level-price { color: var(--danger); }
        
        .rr-grid {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: var(--spacing-xl);
          padding: var(--spacing-lg);
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-md);
        }
        
        .rr-item {
          text-align: center;
        }
        
        .rr-label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        
        .rr-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
        }
        
        .rr-item.risk .rr-value { color: var(--danger); }
        .rr-item.reward .rr-value { color: var(--success); }
        
        .rr-amount {
          display: block;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        
        .rr-divider {
          font-size: 2rem;
          color: var(--text-muted);
        }
        
        .rr-ratio {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md);
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
        }
        
        .ratio {
          font-size: 1.25rem;
          font-weight: 700;
        }
        
        .ratio.good { color: var(--success); }
        .ratio.bad { color: var(--danger); }
        
        .exit-rules {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        
        .exit-rule {
          display: flex;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
        }
        
        .rule-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }
        
        .rule-icon.profit { background: var(--success-bg); }
        .rule-icon.loss { background: var(--danger-bg); }
        .rule-icon.warning { background: var(--warning-bg); }
        
        .rule-content h4 {
          margin: 0 0 var(--spacing-sm) 0;
          font-size: 0.9rem;
        }
        
        .rule-content ul {
          margin: 0;
          padding-left: var(--spacing-lg);
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        
        .rule-content li {
          margin-bottom: 4px;
        }
        
        .position-calc {
          display: flex;
          gap: var(--spacing-xl);
          padding: var(--spacing-md);
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
        }
        
        .calc-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .calc-item span:first-child {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        
        .calc-item span:last-child {
          font-weight: 600;
          color: var(--accent-primary);
        }
        
        /* Pattern Tab */
        .validation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-lg);
          background: var(--bg-glass);
          border-radius: var(--radius-lg);
          margin-bottom: var(--spacing-xl);
        }
        
        .validation-score {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }
        
        .score-circle {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: var(--accent-gradient);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }
        
        .score-num {
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 1;
        }
        
        .score-total {
          font-size: 0.75rem;
          opacity: 0.8;
        }
        
        .score-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        
        .validation-badge {
          padding: var(--spacing-sm) var(--spacing-lg);
          border-radius: var(--radius-md);
          font-weight: 600;
        }
        
        .validation-badge.valid { background: var(--success-bg); color: var(--success); }
        .validation-badge.partial { background: var(--warning-bg); color: var(--warning); }
        .validation-badge.invalid { background: var(--danger-bg); color: var(--danger); }
        
        .proof-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-xl);
        }
        
        .proof-card {
          background: var(--bg-glass);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
        }
        
        .proof-card.passed {
          border-left: 3px solid var(--success);
        }
        
        .proof-card.failed {
          border-left: 3px solid var(--danger);
        }
        
        .proof-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-sm);
        }
        
        .proof-status {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
        }
        
        .proof-status.pass { background: var(--success-bg); color: var(--success); }
        .proof-status.fail { background: var(--danger-bg); color: var(--danger); }
        
        .proof-title {
          font-weight: 600;
          font-size: 0.9rem;
        }
        
        .proof-detail {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        
        .proof-values {
          font-size: 0.875rem;
          color: var(--accent-primary);
          font-weight: 500;
        }
        
        .vcp-reference {
          background: var(--bg-glass);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
        }
        
        .vcp-reference h3 {
          margin: 0 0 var(--spacing-md) 0;
        }
        
        .reference-content {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
        
        .ref-item {
          font-size: 0.875rem;
          color: var(--text-secondary);
          padding: var(--spacing-sm) 0;
          border-bottom: 1px solid var(--border-color);
        }
        
        .ref-item:last-child {
          border-bottom: none;
        }
        
        .ref-item strong {
          color: var(--text-primary);
        }
        
        @media (max-width: 900px) {
          .metrics-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .proof-grid {
            grid-template-columns: 1fr;
          }
          
          .legs-header, .leg-row {
            grid-template-columns: 60px 80px 60px 50px 1fr;
            font-size: 0.8rem;
          }
        }
      `}</style>
        </div>
    );
};

export default StockDetailPage;
