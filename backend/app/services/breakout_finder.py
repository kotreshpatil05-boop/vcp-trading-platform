"""
VCP Trading Platform - Breakout Finder Service
Detects breakouts from VCP patterns
"""
import pandas as pd
import numpy as np
from typing import List, Optional
from datetime import datetime
import logging

from ..models.stock import BreakoutCandidate, VCPSetup
from ..config import BREAKOUT_SETTINGS
from .data_fetcher import data_fetcher
from .vcp_scanner import vcp_scanner

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BreakoutFinder:
    """
    Breakout Detection implementing:
    - Daily Close > 100-day range high (1 candle ago)
    - Relative Volume (20-SMA) > 1
    
    Confirmation Rules:
    - Wide range bar on breakout day
    - Price closing in upper half of range
    - Gap-up confirmation (optional)
    """
    
    def __init__(self):
        self.settings = BREAKOUT_SETTINGS
    
    def check_breakout_conditions(self, df: pd.DataFrame) -> tuple[bool, float, float]:
        """
        Check breakout conditions:
        - Daily Close > 100-day range high (1 candle ago)
        - Relative Volume (20-SMA) > 1
        
        Returns: (is_breakout, relative_volume, pivot_price)
        """
        if len(df) < 101:
            return False, 0.0, 0.0
        
        current_close = df['close'].iloc[-1]
        current_volume = df['volume'].iloc[-1]
        
        # 100-day range high (1 candle ago)
        pivot_price = df['high'].iloc[-101:-1].max()
        
        # Check if close > pivot
        if current_close <= pivot_price:
            return False, 0.0, pivot_price
        
        # Calculate relative volume
        vol_sma_20 = df['volume'].rolling(20).mean().iloc[-2]  # Use previous day's SMA
        relative_volume = current_volume / vol_sma_20 if vol_sma_20 > 0 else 0
        
        # Check relative volume > 1
        if relative_volume < self.settings['relative_volume_threshold']:
            return False, relative_volume, pivot_price
        
        return True, relative_volume, pivot_price
    
    def calculate_confirmation_score(self, df: pd.DataFrame, relative_volume: float) -> float:
        """
        Calculate breakout confirmation score based on:
        - Wide range bar (large daily range)
        - Close in upper half of range
        - Gap up
        - High relative volume
        """
        score = 0
        current = df.iloc[-1]
        previous = df.iloc[-2]
        
        # Wide range bar score (max 25)
        # Calculate ATR for comparison
        atr_14 = self._calculate_atr(df, 14)
        daily_range = current['high'] - current['low']
        
        if atr_14 > 0:
            range_ratio = daily_range / atr_14
            score += min(range_ratio * 10, 25)
        
        # Close in upper half score (max 25)
        if daily_range > 0:
            close_position = (current['close'] - current['low']) / daily_range
            score += close_position * 25
        
        # Gap up score (max 25)
        gap_pct = ((current['open'] - previous['close']) / previous['close']) * 100
        if gap_pct > 0:
            score += min(gap_pct * 5, 25)
        
        # Relative volume score (max 25)
        vol_score = min((relative_volume - 1) * 12.5, 25)
        score += max(vol_score, 0)
        
        return round(min(score, 100), 1)
    
    def _calculate_atr(self, df: pd.DataFrame, period: int = 14) -> float:
        """Calculate Average True Range"""
        high = df['high']
        low = df['low']
        close = df['close'].shift(1)
        
        tr1 = high - low
        tr2 = abs(high - close)
        tr3 = abs(low - close)
        
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(period).mean().iloc[-1]
        
        return atr
    
    def find_breakout(self, symbol: str, vcp_setup: Optional[VCPSetup] = None) -> Optional[BreakoutCandidate]:
        """Find breakout for a single stock"""
        try:
            df = data_fetcher.get_stock_data(symbol, period="1y")
            if df is None or len(df) < 101:
                return None
            
            is_breakout, relative_volume, pivot_price = self.check_breakout_conditions(df)
            
            if not is_breakout:
                return None
            
            info = data_fetcher.get_stock_info(symbol)
            
            current = df.iloc[-1]
            previous = df.iloc[-2]
            
            # Calculate metrics
            breakout_price = current['close']
            price_change_pct = ((breakout_price - previous['close']) / previous['close']) * 100
            gap_up_pct = ((current['open'] - previous['close']) / previous['close']) * 100
            
            confirmation_score = self.calculate_confirmation_score(df, relative_volume)
            
            return BreakoutCandidate(
                symbol=symbol,
                stock_name=info.get('longName', symbol) if info else symbol,
                breakout_date=str(df.index[-1].date()) if hasattr(df.index[-1], 'date') else datetime.now().strftime('%Y-%m-%d'),
                breakout_price=round(breakout_price, 2),
                pivot_price=round(pivot_price, 2),
                breakout_volume=int(current['volume']),
                relative_volume=round(relative_volume, 2),
                price_change_pct=round(price_change_pct, 2),
                gap_up_pct=round(gap_up_pct, 2),
                confirmation_score=confirmation_score,
                vcp_setup=vcp_setup
            )
            
        except Exception as e:
            logger.error(f"Error finding breakout for {symbol}: {e}")
            return None
    
    def scan_for_breakouts(self, symbols: Optional[List[str]] = None) -> List[BreakoutCandidate]:
        """Scan universe for breakouts"""
        from ..config import NIFTY_500_SYMBOLS
        
        if symbols is None:
            symbols = NIFTY_500_SYMBOLS
        
        logger.info(f"Scanning {len(symbols)} stocks for breakouts...")
        
        breakouts = []
        for symbol in symbols:
            breakout = self.find_breakout(symbol)
            if breakout:
                breakouts.append(breakout)
        
        # Sort by confirmation score
        breakouts.sort(key=lambda x: x.confirmation_score, reverse=True)
        
        logger.info(f"Found {len(breakouts)} breakouts")
        return breakouts
    
    def scan_vcp_breakouts(self, vcp_setups: List[VCPSetup]) -> List[BreakoutCandidate]:
        """Check VCP setups for breakouts"""
        breakouts = []
        
        for setup in vcp_setups:
            breakout = self.find_breakout(setup.symbol, setup)
            if breakout:
                breakouts.append(breakout)
        
        return breakouts


# Singleton instance
breakout_finder = BreakoutFinder()
