import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

/**
 * Stock Chart Component using Lightweight Charts
 * Displays candlestick chart with VCP pattern visualization
 */
const StockChart = ({ data, vcpLegs = [], symbol = 'STOCK' }) => {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!chartContainerRef.current || !data || data.length === 0) return;

        // Create chart
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { color: 'transparent' },
                textColor: '#94a3b8'
            },
            grid: {
                vertLines: { color: 'rgba(148, 163, 184, 0.1)' },
                horzLines: { color: 'rgba(148, 163, 184, 0.1)' }
            },
            crosshair: {
                mode: 1,
                vertLine: {
                    width: 1,
                    color: 'rgba(0, 212, 255, 0.5)',
                    style: 0
                },
                horzLine: {
                    width: 1,
                    color: 'rgba(0, 212, 255, 0.5)',
                    style: 0
                }
            },
            rightPriceScale: {
                borderColor: 'rgba(148, 163, 184, 0.2)'
            },
            timeScale: {
                borderColor: 'rgba(148, 163, 184, 0.2)',
                timeVisible: true,
                secondsVisible: false
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true
            },
            handleScale: {
                axisPressedMouseMove: true,
                mouseWheel: true,
                pinch: true
            }
        });

        // Add candlestick series
        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#10b981',
            downColor: '#ef4444',
            borderUpColor: '#10b981',
            borderDownColor: '#ef4444',
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444'
        });

        candlestickSeries.setData(data);

        // Add volume series
        const volumeSeries = chart.addHistogramSeries({
            color: 'rgba(0, 212, 255, 0.3)',
            priceFormat: {
                type: 'volume'
            },
            priceScaleId: '',
            scaleMargins: {
                top: 0.85,
                bottom: 0
            }
        });

        volumeSeries.setData(
            data.map(d => ({
                time: d.time,
                value: d.volume,
                color: d.close >= d.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
            }))
        );

        // Add SMA lines if data is available
        if (data.length >= 20) {
            const sma20Data = calculateSMA(data, 20);
            const sma20Series = chart.addLineSeries({
                color: '#00d4ff',
                lineWidth: 1,
                title: 'SMA 20'
            });
            sma20Series.setData(sma20Data);
        }

        if (data.length >= 50) {
            const sma50Data = calculateSMA(data, 50);
            const sma50Series = chart.addLineSeries({
                color: '#ffd700',
                lineWidth: 1,
                title: 'SMA 50'
            });
            sma50Series.setData(sma50Data);
        }

        // Fit content
        chart.timeScale().fitContent();

        // Handle resize
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight
                });
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        chartRef.current = chart;

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, vcpLegs]);

    // Calculate SMA
    const calculateSMA = (data, period) => {
        const result = [];
        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j].close;
            }
            result.push({
                time: data[i].time,
                value: sum / period
            });
        }
        return result;
    };

    return (
        <div className="chart-wrapper">
            <div className="chart-header">
                <span className="chart-symbol">{symbol}</span>
                {vcpLegs && vcpLegs.length > 0 && (
                    <span className="chart-badge">VCP Pattern Detected</span>
                )}
            </div>
            <div ref={chartContainerRef} className="chart-container" />
            <style>{`
        .chart-wrapper {
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md);
          border-bottom: 1px solid var(--border-color);
        }
        .chart-symbol {
          font-weight: 600;
          font-size: 1.125rem;
        }
        .chart-badge {
          background: var(--success-bg);
          color: var(--success);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .chart-container {
          height: 400px;
        }
      `}</style>
        </div>
    );
};

export default StockChart;
