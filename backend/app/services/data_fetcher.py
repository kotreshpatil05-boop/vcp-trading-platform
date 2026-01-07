"""
VCP Trading Platform - Data Fetcher Service
Fetches stock data from Yahoo Finance for NSE stocks
"""
import yfinance as yf
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DataFetcher:
    """Service for fetching stock data from Yahoo Finance"""
    
    def __init__(self):
        self.cache: Dict[str, Tuple[pd.DataFrame, datetime]] = {}
        self.cache_duration = timedelta(minutes=5)
    
    def _get_yf_symbol(self, symbol: str) -> str:
        """Convert NSE symbol to Yahoo Finance format"""
        if not symbol.endswith(".NS"):
            return f"{symbol}.NS"
        return symbol
    
    def get_stock_data(
        self, 
        symbol: str, 
        period: str = "1y",
        interval: str = "1d"
    ) -> Optional[pd.DataFrame]:
        """
        Fetch OHLCV data for a stock
        
        Args:
            symbol: NSE stock symbol
            period: Data period (1y, 2y, 5y, max)
            interval: Data interval (1d, 1wk)
            
        Returns:
            DataFrame with OHLCV data
        """
        yf_symbol = self._get_yf_symbol(symbol)
        
        # Check cache
        cache_key = f"{yf_symbol}_{period}_{interval}"
        if cache_key in self.cache:
            df, cached_at = self.cache[cache_key]
            if datetime.now() - cached_at < self.cache_duration:
                return df.copy()
        
        try:
            ticker = yf.Ticker(yf_symbol)
            df = ticker.history(period=period, interval=interval)
            
            if df.empty:
                logger.warning(f"No data found for {symbol}")
                return None
            
            # Clean column names
            df.columns = [c.lower() for c in df.columns]
            
            # Ensure we have required columns
            required = ['open', 'high', 'low', 'close', 'volume']
            if not all(col in df.columns for col in required):
                logger.warning(f"Missing required columns for {symbol}")
                return None
            
            # Cache the data
            self.cache[cache_key] = (df.copy(), datetime.now())
            
            return df
            
        except Exception as e:
            logger.error(f"Error fetching data for {symbol}: {e}")
            return None
    
    def get_stock_info(self, symbol: str) -> Optional[Dict]:
        """Get stock info including fundamentals"""
        yf_symbol = self._get_yf_symbol(symbol)
        
        try:
            ticker = yf.Ticker(yf_symbol)
            info = ticker.info
            return info
        except Exception as e:
            logger.error(f"Error fetching info for {symbol}: {e}")
            return None
    
    def get_multiple_stocks(
        self, 
        symbols: List[str], 
        period: str = "1y"
    ) -> Dict[str, pd.DataFrame]:
        """Fetch data for multiple stocks"""
        result = {}
        
        for symbol in symbols:
            df = self.get_stock_data(symbol, period)
            if df is not None:
                result[symbol] = df
        
        return result
    
    def get_benchmark_data(
        self, 
        symbol: str = "^NSEI", 
        period: str = "1y"
    ) -> Optional[pd.DataFrame]:
        """Fetch benchmark index data (NIFTY 50)"""
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval="1d")
            
            if df.empty:
                return None
            
            df.columns = [c.lower() for c in df.columns]
            return df
            
        except Exception as e:
            logger.error(f"Error fetching benchmark data: {e}")
            return None
    
    def calculate_sma(self, df: pd.DataFrame, period: int, column: str = 'close') -> pd.Series:
        """Calculate Simple Moving Average"""
        return df[column].rolling(window=period).mean()
    
    def calculate_relative_strength(
        self, 
        stock_df: pd.DataFrame, 
        benchmark_df: pd.DataFrame,
        period: int = 252
    ) -> float:
        """
        Calculate relative strength vs benchmark
        
        Returns: RS score (stock return / benchmark return)
        """
        if len(stock_df) < period or len(benchmark_df) < period:
            return 0.0
        
        stock_return = (stock_df['close'].iloc[-1] / stock_df['close'].iloc[-period] - 1) * 100
        benchmark_return = (benchmark_df['close'].iloc[-1] / benchmark_df['close'].iloc[-period] - 1) * 100
        
        if benchmark_return == 0:
            return stock_return
        
        return stock_return - benchmark_return
    
    def calculate_rs_percentile(
        self,
        stock_df: pd.DataFrame,
        all_stocks_data: Dict[str, pd.DataFrame],
        benchmark_df: pd.DataFrame,
        period: int = 252
    ) -> float:
        """Calculate RS percentile rank among all stocks"""
        all_rs = []
        
        for sym, df in all_stocks_data.items():
            rs = self.calculate_relative_strength(df, benchmark_df, period)
            all_rs.append(rs)
        
        stock_rs = self.calculate_relative_strength(stock_df, benchmark_df, period)
        
        if not all_rs:
            return 50.0
        
        # Calculate percentile
        all_rs_sorted = sorted(all_rs)
        count_below = sum(1 for x in all_rs_sorted if x < stock_rs)
        percentile = (count_below / len(all_rs)) * 100
        
        return percentile


# Singleton instance
data_fetcher = DataFetcher()
