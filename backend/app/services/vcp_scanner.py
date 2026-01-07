"""
VCP Trading Platform - VCP Scanner Engine
Implements Mark Minervini's Volatility Contraction Pattern detection
"""
import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import logging

from ..models.stock import VCPSetup, VCPLeg
from ..config import VCP_SETTINGS, NIFTY_500_SYMBOLS, BENCHMARK_SYMBOL
from .data_fetcher import data_fetcher

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VCPScanner:
    """
    VCP Pattern Scanner implementing the following conditions:
    
    Liquidity Filter:
    - Market-Cap > 200 Cr
    - Daily Close > 20-SMA
    - RS Percentile > 70
    
    Uptrend Near Breakout:
    - Daily Close ≤ 100-day range high (1 candle ago)
    - Daily Close within ±7% of 100-day range high
    - Weekly Close within ±20% of 100-week range high
    
    Higher Lows:
    - 10-day range low > 10-day range low (10 candles ago)
    - 20-day range low > 20-day range low (20 candles ago)
    - 30-day range low > 30-day range low (30 candles ago)
    
    Volume Contracting:
    - 20-SMA Volume (1 candle ago) < 20-SMA Volume at 5/10/15/20/25/30 candles ago
    
    VCP Multi-Leg:
    - 3-5 progressive contraction legs
    - Each pullback < previous pullback
    - Final base depth 12-15%
    """
    
    def __init__(self):
        self.settings = VCP_SETTINGS
        self.benchmark_data = None
        self.all_stocks_data: Dict[str, pd.DataFrame] = {}
    
    def _load_benchmark(self):
        """Load benchmark data for RS calculation"""
        if self.benchmark_data is None:
            self.benchmark_data = data_fetcher.get_benchmark_data(
                BENCHMARK_SYMBOL, 
                period="2y"
            )
    
    def check_liquidity_filter(
        self, 
        df: pd.DataFrame, 
        info: Optional[Dict],
        rs_percentile: float
    ) -> Tuple[bool, str]:
        """
        Check liquidity filter conditions:
        - Market-Cap > 200 Cr
        - Close > 20-SMA
        - RS Percentile > 70
        """
        # Market cap check
        if info:
            market_cap = info.get('marketCap', 0)
            if market_cap < self.settings['min_market_cap']:
                return False, "Market cap below threshold"
        
        # Close > 20-SMA
        sma_20 = df['close'].rolling(20).mean()
        if df['close'].iloc[-1] <= sma_20.iloc[-1]:
            return False, "Price below 20-SMA"
        
        # RS Percentile > 70
        if rs_percentile < self.settings['rs_percentile_min']:
            return False, f"RS percentile {rs_percentile:.1f} below 70"
        
        return True, "Passed"
    
    def check_uptrend_near_breakout(self, df: pd.DataFrame) -> Tuple[bool, str]:
        """
        Check uptrend and near breakout conditions:
        - Daily Close ≤ 100-day range high (1 candle ago)
        - Daily Close within ±7% of 100-day range high
        """
        if len(df) < 101:
            return False, "Insufficient data"
        
        current_close = df['close'].iloc[-1]
        
        # 100-day high excluding current candle
        range_high_100 = df['high'].iloc[-101:-1].max()
        
        # Close should be <= range high
        if current_close > range_high_100:
            return False, "Already broken out"
        
        # Close within ±7% of range high
        distance_pct = ((range_high_100 - current_close) / range_high_100) * 100
        if distance_pct > 7:
            return False, f"Too far from pivot ({distance_pct:.1f}%)"
        
        return True, f"Within {distance_pct:.1f}% of pivot"
    
    def check_higher_lows(self, df: pd.DataFrame) -> Tuple[bool, str]:
        """
        Check higher lows pattern:
        - 10-day range low > 10-day range low (10 candles ago)
        - 20-day range low > 20-day range low (20 candles ago)
        - 30-day range low > 30-day range low (30 candles ago)
        """
        if len(df) < 60:
            return False, "Insufficient data"
        
        # 10-day range lows
        low_10_current = df['low'].iloc[-10:].min()
        low_10_past = df['low'].iloc[-20:-10].min()
        
        # 20-day range lows
        low_20_current = df['low'].iloc[-20:].min()
        low_20_past = df['low'].iloc[-40:-20].min()
        
        # 30-day range lows
        low_30_current = df['low'].iloc[-30:].min()
        low_30_past = df['low'].iloc[-60:-30].min()
        
        if low_10_current <= low_10_past:
            return False, "10-day HL failed"
        if low_20_current <= low_20_past:
            return False, "20-day HL failed"
        if low_30_current <= low_30_past:
            return False, "30-day HL failed"
        
        return True, "Higher lows confirmed"
    
    def check_volume_contracting(self, df: pd.DataFrame) -> Tuple[bool, float]:
        """
        Check volume contraction:
        - 20-SMA Volume now < 20-SMA Volume at 5/10/15/20/25/30 candles ago
        """
        if len(df) < 50:
            return False, 0.0
        
        vol_sma = df['volume'].rolling(20).mean()
        current_vol_sma = vol_sma.iloc[-2]  # 1 candle ago
        
        comparison_points = [5, 10, 15, 20, 25, 30]
        contractions = 0
        
        for offset in comparison_points:
            if len(vol_sma) > offset:
                past_vol_sma = vol_sma.iloc[-(offset + 1)]
                if current_vol_sma < past_vol_sma:
                    contractions += 1
        
        # At least one contraction needed
        if contractions == 0:
            return False, 0.0
        
        # Calculate volume dry-up percentage
        if len(vol_sma) > 30:
            max_past_vol = vol_sma.iloc[-31:-1].max()
            if max_past_vol > 0:
                dry_up = ((max_past_vol - current_vol_sma) / max_past_vol) * 100
                return True, dry_up
        
        return True, 0.0
    
    def detect_vcp_legs(self, df: pd.DataFrame) -> Tuple[List[VCPLeg], float]:
        """
        Detect VCP contraction legs with progressive depth reduction
        
        Returns:
            List of VCPLeg objects
            Total base depth percentage
        """
        if len(df) < 60:
            return [], 0.0
        
        # Use last 6 months of data for leg detection
        analysis_df = df.tail(126).copy()
        
        legs = []
        current_leg_start = 0
        leg_number = 0
        prev_pullback_depth = 100  # Start with max to allow first leg
        
        # Find local highs and lows
        highs = analysis_df['high'].rolling(5, center=True).max() == analysis_df['high']
        lows = analysis_df['low'].rolling(5, center=True).min() == analysis_df['low']
        
        high_indices = analysis_df.index[highs].tolist()
        low_indices = analysis_df.index[lows].tolist()
        
        if len(high_indices) < 2 or len(low_indices) < 2:
            return [], 0.0
        
        # Identify swing high-low pairs as legs
        i = 0
        while i < len(high_indices) - 1 and leg_number < 5:
            high_idx = high_indices[i]
            high_price = analysis_df.loc[high_idx, 'high']
            
            # Find next low after this high
            next_lows = [l for l in low_indices if l > high_idx]
            if not next_lows:
                break
            
            low_idx = next_lows[0]
            low_price = analysis_df.loc[low_idx, 'low']
            
            # Calculate pullback depth
            pullback_depth = ((high_price - low_price) / high_price) * 100
            
            # Check for progressive contraction
            if pullback_depth < prev_pullback_depth and pullback_depth > 2:
                leg_number += 1
                
                # Calculate duration
                high_pos = analysis_df.index.get_loc(high_idx)
                low_pos = analysis_df.index.get_loc(low_idx)
                duration = low_pos - high_pos
                
                # Calculate volume ratio
                leg_volume = analysis_df.loc[high_idx:low_idx, 'volume'].mean()
                prev_volume = analysis_df['volume'].iloc[:high_pos].tail(20).mean() if high_pos > 20 else leg_volume
                volume_ratio = leg_volume / prev_volume if prev_volume > 0 else 1.0
                
                leg = VCPLeg(
                    leg_number=leg_number,
                    start_date=str(high_idx.date()) if hasattr(high_idx, 'date') else str(high_idx),
                    end_date=str(low_idx.date()) if hasattr(low_idx, 'date') else str(low_idx),
                    high_price=round(high_price, 2),
                    low_price=round(low_price, 2),
                    pullback_depth=round(pullback_depth, 2),
                    volume_ratio=round(volume_ratio, 2),
                    duration_days=duration
                )
                legs.append(leg)
                prev_pullback_depth = pullback_depth
            
            i += 1
        
        # Calculate total base depth
        if legs:
            overall_high = max(leg.high_price for leg in legs)
            overall_low = min(leg.low_price for leg in legs)
            total_depth = ((overall_high - overall_low) / overall_high) * 100
        else:
            total_depth = 0.0
        
        return legs, total_depth
    
    def calculate_vcp_score(
        self,
        legs: List[VCPLeg],
        base_depth: float,
        volume_dry_up: float,
        rs_percentile: float,
        distance_from_pivot: float
    ) -> float:
        """Calculate VCP quality score 0-100"""
        score = 0
        
        # Leg count score (max 20)
        leg_score = min(len(legs) * 5, 20)
        score += leg_score
        
        # Progressive contraction score (max 25)
        if len(legs) >= 2:
            contractions = sum(1 for i in range(1, len(legs)) 
                             if legs[i].pullback_depth < legs[i-1].pullback_depth)
            contraction_score = (contractions / (len(legs) - 1)) * 25
            score += contraction_score
        
        # Base depth score (max 20) - prefer 12-15%
        if 10 <= base_depth <= 20:
            depth_score = 20 - abs(base_depth - 12.5) * 2
            score += max(depth_score, 0)
        
        # Volume dry-up score (max 15)
        vol_score = min(volume_dry_up / 2, 15)
        score += vol_score
        
        # RS score (max 10)
        rs_score = min(rs_percentile / 10, 10)
        score += rs_score
        
        # Proximity to pivot (max 10)
        if distance_from_pivot <= 5:
            proximity_score = 10
        elif distance_from_pivot <= 10:
            proximity_score = 10 - (distance_from_pivot - 5)
        else:
            proximity_score = 0
        score += proximity_score
        
        return round(min(score, 100), 1)
    
    def scan_stock(self, symbol: str) -> Optional[VCPSetup]:
        """Scan a single stock for VCP pattern"""
        try:
            # Fetch data
            df = data_fetcher.get_stock_data(symbol, period="1y")
            if df is None or len(df) < 100:
                return None
            
            info = data_fetcher.get_stock_info(symbol)
            
            # Calculate RS percentile
            self._load_benchmark()
            rs_percentile = 50.0  # Default
            if self.benchmark_data is not None:
                rs = data_fetcher.calculate_relative_strength(df, self.benchmark_data)
                # Simplified percentile for individual scan
                rs_percentile = min(max(50 + rs, 0), 100)
            
            # Run filter checks
            liquidity_pass, _ = self.check_liquidity_filter(df, info, rs_percentile)
            if not liquidity_pass:
                return None
            
            uptrend_pass, uptrend_msg = self.check_uptrend_near_breakout(df)
            if not uptrend_pass:
                return None
            
            hl_pass, _ = self.check_higher_lows(df)
            if not hl_pass:
                return None
            
            vol_pass, vol_dry_up = self.check_volume_contracting(df)
            if not vol_pass:
                return None
            
            # Detect VCP legs
            legs, base_depth = self.detect_vcp_legs(df)
            if len(legs) < self.settings['min_legs']:
                return None
            
            # Check final base depth
            if base_depth > self.settings['final_base_depth_max'] * 100:
                return None
            
            # Calculate additional metrics
            current_price = df['close'].iloc[-1]
            sma_20 = df['close'].rolling(20).mean().iloc[-1]
            sma_50 = df['close'].rolling(50).mean().iloc[-1]
            sma_200 = df['close'].rolling(200).mean().iloc[-1] if len(df) >= 200 else None
            
            pivot_price = df['high'].iloc[-101:-1].max()
            distance_from_pivot = ((pivot_price - current_price) / pivot_price) * 100
            
            # Calculate RS
            rs = data_fetcher.calculate_relative_strength(df, self.benchmark_data) if self.benchmark_data is not None else 0
            
            # Calculate score
            score = self.calculate_vcp_score(legs, base_depth, vol_dry_up, rs_percentile, distance_from_pivot)
            
            return VCPSetup(
                symbol=symbol,
                stock_name=info.get('longName', symbol) if info else symbol,
                current_price=round(current_price, 2),
                legs=legs,
                total_base_depth=round(base_depth, 2),
                base_duration_days=sum(leg.duration_days for leg in legs),
                pivot_price=round(pivot_price, 2),
                distance_from_pivot=round(distance_from_pivot, 2),
                relative_strength=round(rs, 2),
                rs_percentile=round(rs_percentile, 1),
                volume_dry_up=round(vol_dry_up, 1),
                trend_alignment=current_price > sma_20 > sma_50,
                score=score,
                detected_at=datetime.now().isoformat(),
                sma_20=round(sma_20, 2),
                sma_50=round(sma_50, 2),
                sma_200=round(sma_200, 2) if sma_200 else None
            )
            
        except Exception as e:
            logger.error(f"Error scanning {symbol}: {e}")
            return None
    
    def scan_universe(self, symbols: Optional[List[str]] = None) -> List[VCPSetup]:
        """Scan entire universe for VCP patterns"""
        if symbols is None:
            symbols = NIFTY_500_SYMBOLS
        
        logger.info(f"Scanning {len(symbols)} stocks for VCP patterns...")
        
        # Load benchmark for RS calculation
        self._load_benchmark()
        
        # Pre-fetch all stock data for RS percentile calculation
        self.all_stocks_data = data_fetcher.get_multiple_stocks(symbols)
        
        results = []
        for i, symbol in enumerate(symbols):
            if i % 10 == 0:
                logger.info(f"Progress: {i}/{len(symbols)}")
            
            setup = self.scan_stock(symbol)
            if setup:
                results.append(setup)
        
        # Sort by score
        results.sort(key=lambda x: x.score, reverse=True)
        
        logger.info(f"Found {len(results)} VCP setups")
        return results


# Singleton instance
vcp_scanner = VCPScanner()
