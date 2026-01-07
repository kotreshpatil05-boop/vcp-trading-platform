"""
VCP Trading Platform - Configuration
"""
import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR}/vcp_platform.db")

# API Settings
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
DEBUG = os.getenv("DEBUG", "true").lower() == "true"

# Stock Universe
NIFTY_500_SYMBOLS = [
    # Top 50 NIFTY stocks for demo (add .NS suffix for Yahoo Finance)
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
    "HINDUNILVR", "BHARTIARTL", "SBIN", "KOTAKBANK", "ITC",
    "BAJFINANCE", "LT", "AXISBANK", "ASIANPAINT", "MARUTI",
    "HCLTECH", "SUNPHARMA", "TITAN", "ULTRACEMCO", "WIPRO",
    "ONGC", "NTPC", "POWERGRID", "TATASTEEL", "JSWSTEEL",
    "ADANIENT", "ADANIPORTS", "COALINDIA", "BPCL", "GRASIM",
    "TECHM", "INDUSINDBK", "HINDALCO", "DRREDDY", "DIVISLAB",
    "CIPLA", "EICHERMOT", "BAJAJ-AUTO", "HEROMOTOCO", "BRITANNIA",
    "NESTLEIND", "APOLLOHOSP", "TATACONSUM", "M&M", "TATAMOTORS",
    "SBILIFE", "HDFCLIFE", "BAJAJFINSV", "SHREECEM", "DMART"
]

# Scanner Settings
VCP_SETTINGS = {
    "min_market_cap": 2_000_000_000,  # 200 Cr INR
    "min_legs": 3,
    "max_legs": 5,
    "final_base_depth_max": 0.15,  # 15%
    "lookback_days": 252,  # 1 year
    "volume_sma_period": 20,
    "rs_percentile_min": 70,
}

BREAKOUT_SETTINGS = {
    "pivot_range": 100,  # 100-day range
    "relative_volume_threshold": 1.0,
    "volume_sma_period": 20,
}

# Benchmark Index
BENCHMARK_SYMBOL = "^NSEI"  # NIFTY 50

# Sentiment Settings
NEWS_SOURCES = [
    "https://news.google.com/rss/search?q={symbol}+stock+india&hl=en-IN&gl=IN&ceid=IN:en"
]
