import React from 'react';

/**
 * Analysis Panel Component
 * Displays technical, fundamental, and sentiment analysis
 */
const AnalysisPanel = ({ stockData }) => {
    if (!stockData) return null;

    const { fundamentals, sentiment, vcp_setup, combined_score, recommendation } = stockData;

    const getRecommendationStyle = (rec) => {
        switch (rec) {
            case 'STRONG BUY': return { bg: 'var(--success-bg)', color: 'var(--success)', icon: '🚀' };
            case 'BUY': return { bg: 'var(--success-bg)', color: 'var(--success)', icon: '📈' };
            case 'HOLD': return { bg: 'var(--warning-bg)', color: 'var(--warning)', icon: '⏸️' };
            case 'AVOID': return { bg: 'var(--danger-bg)', color: 'var(--danger)', icon: '⚠️' };
            default: return { bg: 'var(--info-bg)', color: 'var(--info)', icon: '❓' };
        }
    };

    const getSentimentEmoji = (label) => {
        switch (label) {
            case 'positive': return '🟢';
            case 'negative': return '🔴';
            default: return '🟡';
        }
    };

    const recStyle = getRecommendationStyle(recommendation);

    return (
        <div className="analysis-panel">
            {/* AI Recommendation */}
            <div className="recommendation-card" style={{ background: recStyle.bg }}>
                <div className="rec-icon">{recStyle.icon}</div>
                <div className="rec-content">
                    <span className="rec-label">AI Recommendation</span>
                    <span className="rec-value" style={{ color: recStyle.color }}>{recommendation}</span>
                </div>
                <div className="rec-score">
                    <span className="score-label">Confidence</span>
                    <span className="score-value">{combined_score?.toFixed(0) || 0}%</span>
                </div>
            </div>

            <div className="analysis-grid">
                {/* Technical Analysis */}
                <div className="analysis-card">
                    <div className="analysis-header">
                        <div className="analysis-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
                            📊
                        </div>
                        <div>
                            <span className="analysis-title">Technical Analysis</span>
                            <span className="analysis-label">VCP Pattern</span>
                        </div>
                    </div>

                    {vcp_setup ? (
                        <div className="analysis-content">
                            <div className="analysis-row">
                                <span>Pattern Score</span>
                                <span className="value">{vcp_setup.score?.toFixed(0) || 'N/A'}</span>
                            </div>
                            <div className="analysis-row">
                                <span>Legs Detected</span>
                                <span className="value">{vcp_setup.legs?.length || 0}</span>
                            </div>
                            <div className="analysis-row">
                                <span>Base Depth</span>
                                <span className="value">{vcp_setup.total_base_depth?.toFixed(1)}%</span>
                            </div>
                            <div className="analysis-row">
                                <span>RS Percentile</span>
                                <span className="value">{vcp_setup.rs_percentile?.toFixed(0)}</span>
                            </div>
                            <div className="analysis-row">
                                <span>Trend Aligned</span>
                                <span className={`value ${vcp_setup.trend_alignment ? 'positive' : 'negative'}`}>
                                    {vcp_setup.trend_alignment ? 'Yes ✓' : 'No ✗'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">No VCP pattern detected</div>
                    )}
                </div>

                {/* Fundamental Analysis */}
                <div className="analysis-card">
                    <div className="analysis-header">
                        <div className="analysis-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                            📑
                        </div>
                        <div>
                            <span className="analysis-title">Fundamentals</span>
                            <span className="analysis-label">Quality Metrics</span>
                        </div>
                    </div>

                    {fundamentals ? (
                        <div className="analysis-content">
                            <div className="analysis-row">
                                <span>Quality Score</span>
                                <span className="value">{fundamentals.quality_score?.toFixed(0) || 'N/A'}</span>
                            </div>
                            <div className="analysis-row">
                                <span>Market Cap</span>
                                <span className="value">{fundamentals.market_cap_category || 'N/A'}</span>
                            </div>
                            <div className="analysis-row">
                                <span>P/E Ratio</span>
                                <span className="value">{fundamentals.pe_ratio?.toFixed(1) || 'N/A'}</span>
                            </div>
                            <div className="analysis-row">
                                <span>ROE</span>
                                <span className="value">{fundamentals.roe?.toFixed(1)}%</span>
                            </div>
                            <div className="analysis-row">
                                <span>Earnings Growth</span>
                                <span className={`value ${fundamentals.earnings_growth_yoy >= 0 ? 'positive' : 'negative'}`}>
                                    {fundamentals.earnings_growth_yoy?.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">Loading fundamentals...</div>
                    )}
                </div>

                {/* Sentiment Analysis */}
                <div className="analysis-card">
                    <div className="analysis-header">
                        <div className="analysis-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                            💬
                        </div>
                        <div>
                            <span className="analysis-title">Sentiment</span>
                            <span className="analysis-label">News Analysis</span>
                        </div>
                    </div>

                    {sentiment ? (
                        <div className="analysis-content">
                            <div className="sentiment-meter">
                                <span className="sentiment-emoji">
                                    {getSentimentEmoji(sentiment.sentiment_label)}
                                </span>
                                <div className="sentiment-info">
                                    <span className="sentiment-score">
                                        {(sentiment.news_sentiment_score * 100).toFixed(0)}%
                                    </span>
                                    <span className="sentiment-label">
                                        {sentiment.sentiment_label?.toUpperCase() || 'NEUTRAL'}
                                    </span>
                                </div>
                            </div>
                            <div className="analysis-row">
                                <span>News Analyzed</span>
                                <span className="value">{sentiment.news_count || 0}</span>
                            </div>
                            <div className="news-breakdown">
                                <span className="positive">{sentiment.positive_news || 0} Positive</span>
                                <span className="neutral">{sentiment.neutral_news || 0} Neutral</span>
                                <span className="negative">{sentiment.negative_news || 0} Negative</span>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">Loading sentiment...</div>
                    )}
                </div>
            </div>

            <style>{`
        .analysis-panel {
          margin-bottom: var(--spacing-xl);
        }
        .recommendation-card {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
          padding: var(--spacing-lg);
          border-radius: var(--radius-lg);
          margin-bottom: var(--spacing-lg);
        }
        .rec-icon {
          font-size: 2.5rem;
        }
        .rec-content {
          flex: 1;
        }
        .rec-label {
          display: block;
          font-size: 0.875rem;
          color: var(--text-muted);
        }
        .rec-value {
          font-size: 1.5rem;
          font-weight: 700;
        }
        .rec-score {
          text-align: right;
        }
        .score-label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .score-value {
          font-size: 2rem;
          font-weight: 700;
        }
        .analysis-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-lg);
        }
        .analysis-card {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
        }
        .analysis-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
        }
        .analysis-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }
        .analysis-title {
          font-weight: 600;
          display: block;
        }
        .analysis-label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .analysis-content {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
        .analysis-row {
          display: flex;
          justify-content: space-between;
          padding: var(--spacing-xs) 0;
          border-bottom: 1px solid var(--border-color);
          font-size: 0.875rem;
        }
        .analysis-row span:first-child {
          color: var(--text-muted);
        }
        .analysis-row .value {
          font-weight: 500;
        }
        .analysis-row .value.positive {
          color: var(--success);
        }
        .analysis-row .value.negative {
          color: var(--danger);
        }
        .no-data {
          text-align: center;
          color: var(--text-muted);
          padding: var(--spacing-lg);
        }
        .sentiment-meter {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-md);
        }
        .sentiment-emoji {
          font-size: 2rem;
        }
        .sentiment-info {
          flex: 1;
        }
        .sentiment-score {
          display: block;
          font-size: 1.25rem;
          font-weight: 700;
        }
        .sentiment-label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .news-breakdown {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          margin-top: var(--spacing-sm);
        }
        .news-breakdown .positive { color: var(--success); }
        .news-breakdown .neutral { color: var(--text-muted); }
        .news-breakdown .negative { color: var(--danger); }
        
        @media (max-width: 1200px) {
          .analysis-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </div>
    );
};

export default AnalysisPanel;
