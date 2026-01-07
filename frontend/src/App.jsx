import React, { useState, useEffect } from 'react';
import StockChart from './components/StockChart';
import VCPCard from './components/VCPCard';
import BreakoutCard from './components/BreakoutCard';
import AnalysisPanel from './components/AnalysisPanel';
import StockDetailPage from './components/StockDetailPage';
import api from './services/api';

// Demo data for initial display (before backend is connected)
const DEMO_VCP_SETUPS = [
    {
        symbol: 'RELIANCE',
        stock_name: 'Reliance Industries Ltd',
        current_price: 2456.75,
        legs: [
            { leg_number: 1, pullback_depth: 18.5, high_price: 2600, low_price: 2118 },
            { leg_number: 2, pullback_depth: 12.3, high_price: 2550, low_price: 2236 },
            { leg_number: 3, pullback_depth: 8.1, high_price: 2510, low_price: 2307 },
            { leg_number: 4, pullback_depth: 4.2, high_price: 2485, low_price: 2380 }
        ],
        total_base_depth: 13.2,
        base_duration_days: 45,
        pivot_price: 2510.00,
        distance_from_pivot: 2.1,
        relative_strength: 15.4,
        rs_percentile: 82,
        volume_dry_up: 45,
        trend_alignment: true,
        score: 78.5,
        sma_20: 2420,
        sma_50: 2380
    },
    {
        symbol: 'TCS',
        stock_name: 'Tata Consultancy Services',
        current_price: 3890.50,
        legs: [
            { leg_number: 1, pullback_depth: 15.2, high_price: 4100, low_price: 3476 },
            { leg_number: 2, pullback_depth: 10.8, high_price: 4050, low_price: 3613 },
            { leg_number: 3, pullback_depth: 6.5, high_price: 3980, low_price: 3721 }
        ],
        total_base_depth: 11.8,
        base_duration_days: 38,
        pivot_price: 3980.00,
        distance_from_pivot: 2.3,
        relative_strength: 12.1,
        rs_percentile: 75,
        volume_dry_up: 38,
        trend_alignment: true,
        score: 72.3,
        sma_20: 3850,
        sma_50: 3780
    },
    {
        symbol: 'INFY',
        stock_name: 'Infosys Limited',
        current_price: 1542.30,
        legs: [
            { leg_number: 1, pullback_depth: 14.8, high_price: 1650, low_price: 1406 },
            { leg_number: 2, pullback_depth: 9.2, high_price: 1620, low_price: 1471 },
            { leg_number: 3, pullback_depth: 5.8, high_price: 1590, low_price: 1498 },
            { leg_number: 4, pullback_depth: 3.5, high_price: 1570, low_price: 1515 }
        ],
        total_base_depth: 10.5,
        base_duration_days: 52,
        pivot_price: 1590.00,
        distance_from_pivot: 3.0,
        relative_strength: 8.5,
        rs_percentile: 68,
        volume_dry_up: 52,
        trend_alignment: true,
        score: 69.8,
        sma_20: 1520,
        sma_50: 1485
    }
];

const DEMO_BREAKOUTS = [
    {
        symbol: 'HDFCBANK',
        stock_name: 'HDFC Bank Ltd',
        breakout_date: '2026-01-07',
        breakout_price: 1685.40,
        pivot_price: 1650.00,
        breakout_volume: 12500000,
        relative_volume: 2.35,
        price_change_pct: 3.2,
        gap_up_pct: 1.5,
        confirmation_score: 82.5
    },
    {
        symbol: 'BHARTIARTL',
        stock_name: 'Bharti Airtel Ltd',
        breakout_date: '2026-01-07',
        breakout_price: 1245.80,
        pivot_price: 1200.00,
        breakout_volume: 8900000,
        relative_volume: 1.85,
        price_change_pct: 4.1,
        gap_up_pct: 0.8,
        confirmation_score: 75.2
    }
];

const DEMO_CHART_DATA = Array.from({ length: 100 }, (_, i) => {
    const basePrice = 2300 + Math.sin(i * 0.1) * 100 + i * 1.5;
    const volatility = 20 + Math.random() * 30;
    return {
        time: Math.floor(Date.now() / 1000) - (100 - i) * 86400,
        open: basePrice + (Math.random() - 0.5) * volatility,
        high: basePrice + Math.random() * volatility,
        low: basePrice - Math.random() * volatility,
        close: basePrice + (Math.random() - 0.5) * volatility,
        volume: Math.floor(5000000 + Math.random() * 10000000)
    };
});

function App() {
    const [activeNav, setActiveNav] = useState('dashboard');
    const [vcpSetups, setVcpSetups] = useState(DEMO_VCP_SETUPS);
    const [breakouts, setBreakouts] = useState(DEMO_BREAKOUTS);
    const [chartData, setChartData] = useState(DEMO_CHART_DATA);
    const [selectedStock, setSelectedStock] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [showDetailPage, setShowDetailPage] = useState(false);
    const [detailStock, setDetailStock] = useState(null);

    // Stats for dashboard
    const stats = {
        vcpCount: vcpSetups.length,
        breakoutCount: breakouts.length,
        avgScore: vcpSetups.reduce((sum, s) => sum + s.score, 0) / vcpSetups.length || 0,
        topPerformer: vcpSetups.length > 0 ? vcpSetups[0].symbol : 'N/A'
    };

    // Handle VCP scan
    const handleScan = async () => {
        setIsScanning(true);
        try {
            const results = await api.scanVCP();
            if (results && results.length > 0) {
                setVcpSetups(results);
            }
        } catch (error) {
            console.log('Using demo data - backend not connected');
        }
        setIsScanning(false);
    };

    // Handle stock selection
    const handleStockSelect = async (symbol) => {
        setIsLoading(true);
        setSelectedStock({ symbol, loading: true });

        try {
            const [fullAnalysis, ohlcv] = await Promise.all([
                api.getFullAnalysis(symbol),
                api.getOHLCV(symbol)
            ]);

            setSelectedStock(fullAnalysis);
            if (ohlcv && ohlcv.data) {
                setChartData(ohlcv.data);
            }
        } catch (error) {
            console.log('Using demo data for', symbol);
            const demoStock = vcpSetups.find(s => s.symbol === symbol);
            setSelectedStock({
                symbol,
                name: demoStock?.stock_name || symbol,
                current_price: demoStock?.current_price || 0,
                vcp_setup: demoStock,
                combined_score: demoStock?.score || 50,
                recommendation: demoStock?.score >= 70 ? 'BUY' : 'HOLD'
            });
        }
        setIsLoading(false);
    };

    // Handle opening detail page
    const handleOpenDetail = (stock) => {
        // Find the VCP setup for this stock
        const vcpSetup = vcpSetups.find(s => s.symbol === stock.symbol) || stock.vcp_setup;
        setDetailStock({
            symbol: stock.symbol,
            name: stock.stock_name || stock.name,
            current_price: stock.current_price || stock.breakout_price,
            vcp_setup: vcpSetup || stock
        });
        setShowDetailPage(true);
    };

    // Filter stocks based on search
    const filteredSetups = vcpSetups.filter(s =>
        s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.stock_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="app">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">📈</div>
                    <div className="sidebar-logo-text">
                        <h1>VCP Scanner</h1>
                        <span>Indian Markets</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div
                        className={`nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveNav('dashboard')}
                    >
                        <span className="nav-icon">🏠</span>
                        <span>Dashboard</span>
                    </div>
                    <div
                        className={`nav-item ${activeNav === 'scanner' ? 'active' : ''}`}
                        onClick={() => setActiveNav('scanner')}
                    >
                        <span className="nav-icon">🔍</span>
                        <span>VCP Scanner</span>
                    </div>
                    <div
                        className={`nav-item ${activeNav === 'breakouts' ? 'active' : ''}`}
                        onClick={() => setActiveNav('breakouts')}
                    >
                        <span className="nav-icon">🚀</span>
                        <span>Breakouts</span>
                    </div>
                    <div
                        className={`nav-item ${activeNav === 'watchlist' ? 'active' : ''}`}
                        onClick={() => setActiveNav('watchlist')}
                    >
                        <span className="nav-icon">⭐</span>
                        <span>Watchlist</span>
                    </div>
                    <div
                        className={`nav-item ${activeNav === 'analytics' ? 'active' : ''}`}
                        onClick={() => setActiveNav('analytics')}
                    >
                        <span className="nav-icon">📊</span>
                        <span>Analytics</span>
                    </div>
                    <div
                        className={`nav-item ${activeNav === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveNav('settings')}
                    >
                        <span className="nav-icon">⚙️</span>
                        <span>Settings</span>
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <div className="market-status">
                        <span className="status-dot"></span>
                        <span>NSE/BSE Market</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {/* Header */}
                <header className="header">
                    <div className="header-left">
                        <h2>
                            {activeNav === 'dashboard' && 'Dashboard Overview'}
                            {activeNav === 'scanner' && 'VCP Pattern Scanner'}
                            {activeNav === 'breakouts' && 'Breakout Alerts'}
                            {activeNav === 'watchlist' && 'My Watchlist'}
                            {activeNav === 'analytics' && 'Performance Analytics'}
                            {activeNav === 'settings' && 'Settings'}
                        </h2>
                        <p>Mark Minervini VCP Strategy • Indian Stock Market</p>
                    </div>
                    <div className="header-actions">
                        <div className="search-box">
                            <span>🔍</span>
                            <input
                                type="text"
                                placeholder="Search stocks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-primary" onClick={handleScan} disabled={isScanning}>
                            {isScanning ? '⏳ Scanning...' : '🔄 Run Scan'}
                        </button>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon success">🎯</div>
                        <div className="stat-value">{stats.vcpCount}</div>
                        <div className="stat-label">VCP Setups</div>
                        <div className="stat-change positive">+3 today</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon warning">🚀</div>
                        <div className="stat-value">{stats.breakoutCount}</div>
                        <div className="stat-label">Active Breakouts</div>
                        <div className="stat-change positive">+2 new</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon info">📊</div>
                        <div className="stat-value">{stats.avgScore.toFixed(0)}</div>
                        <div className="stat-label">Avg VCP Score</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon danger">🏆</div>
                        <div className="stat-value">{stats.topPerformer}</div>
                        <div className="stat-label">Top Performer</div>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="data-grid">
                    {/* Chart Section */}
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">
                                {selectedStock ? `${selectedStock.symbol} Chart` : 'Select a stock'}
                            </span>
                            <span className="card-subtitle">Daily Candlestick with SMA</span>
                        </div>
                        <StockChart
                            data={chartData}
                            symbol={selectedStock?.symbol || 'RELIANCE'}
                            vcpLegs={selectedStock?.vcp_setup?.legs || []}
                        />
                    </div>

                    {/* Watchlist / Recent */}
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">Top VCP Candidates</span>
                            <span className="card-subtitle">Sorted by score</span>
                        </div>
                        <div className="watchlist">
                            {filteredSetups.slice(0, 6).map((setup, idx) => (
                                <div
                                    key={idx}
                                    className="watchlist-item"
                                    onClick={() => handleStockSelect(setup.symbol)}
                                >
                                    <div>
                                        <div className="watchlist-symbol">{setup.symbol}</div>
                                        <div className="watchlist-name">{setup.stock_name}</div>
                                    </div>
                                    <div className="watchlist-price">
                                        <div>₹{setup.current_price.toLocaleString()}</div>
                                        <div className="watchlist-change positive">
                                            Score: {setup.score.toFixed(0)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Analysis Panel (when stock selected) */}
                {selectedStock && !selectedStock.loading && (
                    <AnalysisPanel stockData={selectedStock} />
                )}

                {/* VCP Setups Grid */}
                <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <div className="card-header">
                        <span className="card-title">VCP Pattern Setups</span>
                        <span className="card-subtitle">{filteredSetups.length} stocks found</span>
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: 'var(--spacing-lg)',
                        padding: 'var(--spacing-md)'
                    }}>
                        {filteredSetups.map((setup, idx) => (
                            <VCPCard
                                key={idx}
                                setup={setup}
                                onClick={() => handleStockSelect(setup.symbol)}
                            />
                        ))}
                    </div>
                </div>

                {/* Breakouts Section */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">🚀 Confirmed Breakouts</span>
                        <span className="card-subtitle">{breakouts.length} breakouts detected</span>
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                        gap: 'var(--spacing-lg)',
                        padding: 'var(--spacing-md)'
                    }}>
                        {breakouts.map((breakout, idx) => (
                            <BreakoutCard
                                key={idx}
                                breakout={breakout}
                                onClick={() => handleOpenDetail(breakout)}
                            />
                        ))}
                    </div>
                </div>
            </main>

            {/* Stock Detail Page Modal */}
            {showDetailPage && detailStock && (
                <StockDetailPage
                    stock={detailStock}
                    onClose={() => setShowDetailPage(false)}
                />
            )}

            {/* Styles for sidebar footer */}
            <style>{`
        .sidebar-footer {
          margin-top: auto;
          padding-top: var(--spacing-lg);
          border-top: 1px solid var(--border-color);
        }
        .market-status {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: 0.875rem;
          color: var(--text-muted);
        }
        .status-dot {
          width: 8px;
          height: 8px;
          background: var(--success);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
        </div>
    );
}

export default App;
