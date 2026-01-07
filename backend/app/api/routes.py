"""
VCP Trading Platform - API Routes
FastAPI endpoints for all platform features
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime

from ..models.stock import (
    VCPSetup, BreakoutCandidate, FundamentalData, 
    SentimentData, StockData, ScanResult
)
from ..services import (
    vcp_scanner, breakout_finder, 
    fundamental_analyzer, sentiment_analyzer,
    data_fetcher
)
from ..config import NIFTY_500_SYMBOLS

router = APIRouter()


# ================= Scanner Endpoints =================

@router.get("/scan/vcp", response_model=List[VCPSetup])
async def scan_vcp_patterns(
    symbols: Optional[str] = Query(None, description="Comma-separated symbols, or leave empty for NIFTY 500"),
    limit: int = Query(50, description="Max results to return")
):
    """
    Scan for VCP patterns in the stock universe.
    Returns stocks meeting all VCP conditions.
    """
    try:
        symbol_list = symbols.split(",") if symbols else NIFTY_500_SYMBOLS
        results = vcp_scanner.scan_universe(symbol_list)
        return results[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scan/breakouts", response_model=List[BreakoutCandidate])
async def scan_breakouts(
    symbols: Optional[str] = Query(None, description="Comma-separated symbols"),
    limit: int = Query(20, description="Max results")
):
    """
    Scan for breakout stocks.
    Returns stocks breaking above 100-day highs with volume confirmation.
    """
    try:
        symbol_list = symbols.split(",") if symbols else NIFTY_500_SYMBOLS
        results = breakout_finder.scan_for_breakouts(symbol_list)
        return results[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scan/full", response_model=ScanResult)
async def full_scan(
    symbols: Optional[str] = Query(None, description="Comma-separated symbols")
):
    """
    Run full scan for both VCP setups and breakouts.
    """
    try:
        symbol_list = symbols.split(",") if symbols else NIFTY_500_SYMBOLS
        
        vcp_setups = vcp_scanner.scan_universe(symbol_list)
        breakouts = breakout_finder.scan_for_breakouts(symbol_list)
        
        return ScanResult(
            scan_time=datetime.now().isoformat(),
            total_scanned=len(symbol_list),
            vcp_setups=vcp_setups,
            breakouts=breakouts
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ================= Stock Detail Endpoints =================

@router.get("/stock/{symbol}/vcp", response_model=Optional[VCPSetup])
async def get_stock_vcp(symbol: str):
    """Get VCP analysis for a specific stock."""
    try:
        result = vcp_scanner.scan_stock(symbol.upper())
        if not result:
            raise HTTPException(status_code=404, detail="No VCP setup found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stock/{symbol}/breakout", response_model=Optional[BreakoutCandidate])
async def get_stock_breakout(symbol: str):
    """Check if stock has broken out."""
    try:
        result = breakout_finder.find_breakout(symbol.upper())
        if not result:
            raise HTTPException(status_code=404, detail="No breakout detected")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stock/{symbol}/fundamentals", response_model=FundamentalData)
async def get_fundamentals(symbol: str):
    """Get fundamental analysis for a stock."""
    try:
        result = fundamental_analyzer.analyze(symbol.upper())
        if not result:
            raise HTTPException(status_code=404, detail="No fundamental data found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stock/{symbol}/sentiment", response_model=SentimentData)
async def get_sentiment(symbol: str):
    """Get sentiment analysis for a stock."""
    try:
        result = sentiment_analyzer.analyze(symbol.upper())
        if not result:
            raise HTTPException(status_code=404, detail="No sentiment data found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stock/{symbol}/full", response_model=StockData)
async def get_full_analysis(symbol: str):
    """Get complete analysis including technical, fundamental, and sentiment."""
    try:
        symbol = symbol.upper()
        
        # Get stock data
        df = data_fetcher.get_stock_data(symbol)
        if df is None or len(df) == 0:
            raise HTTPException(status_code=404, detail="Stock not found")
        
        info = data_fetcher.get_stock_info(symbol)
        
        # Get all analysis
        vcp_setup = vcp_scanner.scan_stock(symbol)
        breakout = breakout_finder.find_breakout(symbol, vcp_setup)
        fundamentals = fundamental_analyzer.analyze(symbol)
        sentiment = sentiment_analyzer.analyze(symbol)
        
        # Calculate combined score
        combined_score = 0
        components = 0
        
        if vcp_setup:
            combined_score += vcp_setup.score * 0.4
            components += 1
        if fundamentals:
            combined_score += fundamentals.quality_score * 0.3
            components += 1
        if sentiment:
            # Convert sentiment score (-1 to 1) to 0-100
            sentiment_score = (sentiment.news_sentiment_score + 1) * 50
            combined_score += sentiment_score * 0.3
            components += 1
        
        if components > 0:
            combined_score = combined_score / (0.4 + 0.3 + 0.3) * components / 3 * 100
        
        # Determine recommendation
        if combined_score >= 70:
            recommendation = "STRONG BUY"
        elif combined_score >= 55:
            recommendation = "BUY"
        elif combined_score >= 40:
            recommendation = "HOLD"
        else:
            recommendation = "AVOID"
        
        current = df.iloc[-1]
        previous = df.iloc[-2]
        
        return StockData(
            symbol=symbol,
            name=info.get('longName', symbol) if info else symbol,
            current_price=round(current['close'], 2),
            change_pct=round(((current['close'] - previous['close']) / previous['close']) * 100, 2),
            volume=int(current['volume']),
            avg_volume=int(df['volume'].tail(20).mean()),
            vcp_setup=vcp_setup,
            is_breakout=breakout is not None,
            breakout=breakout,
            fundamentals=fundamentals,
            sentiment=sentiment,
            combined_score=round(combined_score, 1),
            recommendation=recommendation
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ================= Chart Data Endpoints =================

@router.get("/stock/{symbol}/ohlcv")
async def get_ohlcv(
    symbol: str,
    period: str = Query("1y", description="Data period: 1y, 2y, 5y"),
    interval: str = Query("1d", description="Data interval: 1d, 1wk")
):
    """Get OHLCV data for charting."""
    try:
        df = data_fetcher.get_stock_data(symbol.upper(), period, interval)
        if df is None:
            raise HTTPException(status_code=404, detail="No data found")
        
        # Format for charting library
        data = []
        for idx, row in df.iterrows():
            data.append({
                "time": int(idx.timestamp()),
                "open": round(row['open'], 2),
                "high": round(row['high'], 2),
                "low": round(row['low'], 2),
                "close": round(row['close'], 2),
                "volume": int(row['volume'])
            })
        
        return {"symbol": symbol.upper(), "data": data}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ================= Utility Endpoints =================

@router.get("/symbols")
async def get_symbols():
    """Get list of available symbols."""
    return {"symbols": NIFTY_500_SYMBOLS, "count": len(NIFTY_500_SYMBOLS)}


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }
