"""
VCP Trading Platform - Fundamental Analysis Service
Provides fundamental data and quality scoring
"""
from typing import Optional, Dict
import logging

from ..models.stock import FundamentalData
from .data_fetcher import data_fetcher

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FundamentalAnalyzer:
    """
    Fundamental Analysis Module:
    - Market cap classification
    - P/E, P/B ratios
    - Revenue & earnings growth
    - Debt-to-equity
    - ROE, ROA
    - Quality scoring
    """
    
    def __init__(self):
        pass
    
    def _classify_market_cap(self, market_cap: float) -> str:
        """Classify market cap as Large/Mid/Small Cap"""
        if market_cap >= 200_000_000_000:  # 20,000 Cr
            return "Large Cap"
        elif market_cap >= 50_000_000_000:  # 5,000 Cr
            return "Mid Cap"
        else:
            return "Small Cap"
    
    def _calculate_quality_score(self, data: Dict) -> float:
        """
        Calculate fundamental quality score (0-100)
        Based on CANSLIM and quality metrics
        """
        score = 0
        
        # Earnings growth score (max 20)
        earnings_growth = data.get('earningsGrowth', 0) or 0
        if earnings_growth > 0.25:
            score += 20
        elif earnings_growth > 0.15:
            score += 15
        elif earnings_growth > 0.10:
            score += 10
        elif earnings_growth > 0:
            score += 5
        
        # Revenue growth score (max 15)
        revenue_growth = data.get('revenueGrowth', 0) or 0
        if revenue_growth > 0.20:
            score += 15
        elif revenue_growth > 0.10:
            score += 10
        elif revenue_growth > 0:
            score += 5
        
        # ROE score (max 20)
        roe = data.get('returnOnEquity', 0) or 0
        if roe > 0.20:
            score += 20
        elif roe > 0.15:
            score += 15
        elif roe > 0.10:
            score += 10
        elif roe > 0:
            score += 5
        
        # Debt-to-equity score (max 15) - lower is better
        de_ratio = data.get('debtToEquity', 100) or 100
        if de_ratio < 30:
            score += 15
        elif de_ratio < 50:
            score += 10
        elif de_ratio < 100:
            score += 5
        
        # Profit margins score (max 15)
        profit_margin = data.get('profitMargins', 0) or 0
        if profit_margin > 0.15:
            score += 15
        elif profit_margin > 0.10:
            score += 10
        elif profit_margin > 0.05:
            score += 5
        
        # Current ratio score (max 15) - liquidity
        current_ratio = data.get('currentRatio', 0) or 0
        if current_ratio > 2:
            score += 15
        elif current_ratio > 1.5:
            score += 10
        elif current_ratio > 1:
            score += 5
        
        return round(min(score, 100), 1)
    
    def analyze(self, symbol: str) -> Optional[FundamentalData]:
        """Get fundamental analysis for a stock"""
        try:
            info = data_fetcher.get_stock_info(symbol)
            
            if not info:
                return None
            
            market_cap = info.get('marketCap', 0) or 0
            
            # Extract fundamental metrics
            fundamental_data = FundamentalData(
                symbol=symbol,
                market_cap=market_cap,
                market_cap_category=self._classify_market_cap(market_cap),
                pe_ratio=info.get('trailingPE'),
                pb_ratio=info.get('priceToBook'),
                eps=info.get('trailingEps'),
                revenue_growth_yoy=(info.get('revenueGrowth', 0) or 0) * 100,
                earnings_growth_yoy=(info.get('earningsGrowth', 0) or 0) * 100,
                debt_to_equity=info.get('debtToEquity'),
                roe=(info.get('returnOnEquity', 0) or 0) * 100,
                roa=(info.get('returnOnAssets', 0) or 0) * 100,
                current_ratio=info.get('currentRatio'),
                dividend_yield=(info.get('dividendYield', 0) or 0) * 100,
                beta=info.get('beta'),
                sector=info.get('sector'),
                industry=info.get('industry'),
                quality_score=self._calculate_quality_score(info)
            )
            
            return fundamental_data
            
        except Exception as e:
            logger.error(f"Error analyzing fundamentals for {symbol}: {e}")
            return None
    
    def get_fundamental_summary(self, symbol: str) -> Dict:
        """Get a summary of fundamental data for dashboard display"""
        data = self.analyze(symbol)
        
        if not data:
            return {"error": "Unable to fetch fundamental data"}
        
        return {
            "symbol": symbol,
            "market_cap": f"₹{data.market_cap / 10_000_000:.0f} Cr",
            "market_cap_category": data.market_cap_category,
            "pe_ratio": f"{data.pe_ratio:.1f}" if data.pe_ratio else "N/A",
            "pb_ratio": f"{data.pb_ratio:.1f}" if data.pb_ratio else "N/A",
            "roe": f"{data.roe:.1f}%" if data.roe else "N/A",
            "debt_to_equity": f"{data.debt_to_equity:.1f}" if data.debt_to_equity else "N/A",
            "revenue_growth": f"{data.revenue_growth_yoy:.1f}%" if data.revenue_growth_yoy else "N/A",
            "earnings_growth": f"{data.earnings_growth_yoy:.1f}%" if data.earnings_growth_yoy else "N/A",
            "sector": data.sector or "N/A",
            "industry": data.industry or "N/A",
            "quality_score": data.quality_score
        }


# Singleton instance
fundamental_analyzer = FundamentalAnalyzer()
