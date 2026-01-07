/**
 * VCP Trading Platform - API Service
 * Handles all API calls to the backend
 */

const API_BASE = '/api';

class ApiService {
    async fetch(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Scanner Endpoints
    async scanVCP(symbols = null, limit = 50) {
        const params = new URLSearchParams();
        if (symbols) params.append('symbols', symbols.join(','));
        params.append('limit', limit);
        return this.fetch(`/scan/vcp?${params}`);
    }

    async scanBreakouts(symbols = null, limit = 20) {
        const params = new URLSearchParams();
        if (symbols) params.append('symbols', symbols.join(','));
        params.append('limit', limit);
        return this.fetch(`/scan/breakouts?${params}`);
    }

    async fullScan(symbols = null) {
        const params = symbols ? `?symbols=${symbols.join(',')}` : '';
        return this.fetch(`/scan/full${params}`);
    }

    // Stock Detail Endpoints
    async getStockVCP(symbol) {
        return this.fetch(`/stock/${symbol}/vcp`);
    }

    async getStockBreakout(symbol) {
        return this.fetch(`/stock/${symbol}/breakout`);
    }

    async getStockFundamentals(symbol) {
        return this.fetch(`/stock/${symbol}/fundamentals`);
    }

    async getStockSentiment(symbol) {
        return this.fetch(`/stock/${symbol}/sentiment`);
    }

    async getFullAnalysis(symbol) {
        return this.fetch(`/stock/${symbol}/full`);
    }

    // Chart Data
    async getOHLCV(symbol, period = '1y', interval = '1d') {
        return this.fetch(`/stock/${symbol}/ohlcv?period=${period}&interval=${interval}`);
    }

    // Utility
    async getSymbols() {
        return this.fetch('/symbols');
    }

    async healthCheck() {
        return this.fetch('/health');
    }
}

export const api = new ApiService();
export default api;
