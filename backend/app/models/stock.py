"""
VCP Trading Platform - Data Models
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TrendDirection(str, Enum):
    BULLISH = "bullish"
    BEARISH = "bearish"
    NEUTRAL = "neutral"


class SentimentType(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"


class VCPLeg(BaseModel):
    """Represents a single contraction leg in VCP pattern"""
    leg_number: int
    start_date: str
    end_date: str
    high_price: float
    low_price: float
    pullback_depth: float = Field(description="Pullback percentage from high to low")
    volume_ratio: float = Field(description="Volume relative to previous leg")
    duration_days: int


class VCPSetup(BaseModel):
    """VCP Setup with all analysis data"""
    symbol: str
    stock_name: Optional[str] = None
    current_price: float
    legs: List[VCPLeg]
    total_base_depth: float
    base_duration_days: int
    pivot_price: float
    distance_from_pivot: float
    relative_strength: float
    rs_percentile: float
    volume_dry_up: float = Field(description="Volume contraction percentage")
    trend_alignment: bool
    score: float = Field(description="VCP quality score 0-100")
    detected_at: str
    
    # Price data for charting
    sma_20: float
    sma_50: float
    sma_200: Optional[float] = None


class BreakoutCandidate(BaseModel):
    """Stock that has broken out of VCP pattern"""
    symbol: str
    stock_name: Optional[str] = None
    breakout_date: str
    breakout_price: float
    pivot_price: float
    breakout_volume: int
    relative_volume: float
    price_change_pct: float
    gap_up_pct: float
    confirmation_score: float = Field(description="Breakout quality score 0-100")
    vcp_setup: Optional[VCPSetup] = None


class FundamentalData(BaseModel):
    """Fundamental analysis data"""
    symbol: str
    market_cap: float
    market_cap_category: str = Field(description="Large/Mid/Small Cap")
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    eps: Optional[float] = None
    revenue_growth_yoy: Optional[float] = None
    earnings_growth_yoy: Optional[float] = None
    debt_to_equity: Optional[float] = None
    roe: Optional[float] = None
    roa: Optional[float] = None
    current_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    beta: Optional[float] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    quality_score: float = Field(description="Fundamental quality score 0-100")


class SentimentData(BaseModel):
    """Sentiment analysis data"""
    symbol: str
    news_sentiment_score: float = Field(description="-1 to 1 sentiment score")
    sentiment_label: SentimentType
    news_count: int
    positive_news: int
    negative_news: int
    neutral_news: int
    top_headlines: List[str]
    analyzed_at: str


class StockData(BaseModel):
    """Complete stock analysis"""
    symbol: str
    name: Optional[str] = None
    current_price: float
    change_pct: float
    volume: int
    avg_volume: int
    
    # Technical
    vcp_setup: Optional[VCPSetup] = None
    is_breakout: bool = False
    breakout: Optional[BreakoutCandidate] = None
    
    # Fundamental
    fundamentals: Optional[FundamentalData] = None
    
    # Sentiment
    sentiment: Optional[SentimentData] = None
    
    # Combined Score
    combined_score: float = Field(default=0, description="AI confidence score 0-100")
    recommendation: str = Field(default="NEUTRAL")


class ScanResult(BaseModel):
    """Result from scanner"""
    scan_time: str
    total_scanned: int
    vcp_setups: List[VCPSetup]
    breakouts: List[BreakoutCandidate]


class AlertConfig(BaseModel):
    """Alert configuration"""
    symbol: str
    alert_type: str  # "breakout", "vcp_detected", "price_target"
    target_price: Optional[float] = None
    is_active: bool = True
    created_at: str
