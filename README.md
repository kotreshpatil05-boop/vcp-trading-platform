# VCP Trading Platform

An AI-powered trading platform for the Indian stock market focused on Mark Minervini's Volatility Contraction Pattern (VCP) strategy.

## Features

- **VCP Scanner Engine** - Multi-leg VCP pattern detection
- **Breakout Finder** - Real-time breakout detection
- **Fundamental Analysis** - Company fundamentals and quality scores
- **Sentiment Analysis** - News and social sentiment
- **Modern Dashboard** - Glassmorphism UI with interactive charts

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
python run.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Tech Stack

- **Backend**: Python, FastAPI, yfinance, pandas
- **Frontend**: React, Vite, Lightweight Charts
- **Database**: SQLite

## API Endpoints

- `GET /api/scan/vcp` - Run VCP scanner
- `GET /api/scan/breakouts` - Get breakout candidates
- `GET /api/stock/{symbol}` - Get stock details
- `GET /api/fundamentals/{symbol}` - Get fundamental data
- `GET /api/sentiment/{symbol}` - Get sentiment analysis
