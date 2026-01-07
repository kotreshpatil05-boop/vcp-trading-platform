"""
VCP Trading Platform - FastAPI Application
Main entry point for the backend API
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .config import DEBUG

# Create FastAPI app
app = FastAPI(
    title="VCP Trading Platform",
    description="""
    AI-powered trading platform for Indian stock market.
    Implements Mark Minervini's Volatility Contraction Pattern (VCP) strategy.
    
    ## Features
    - VCP Pattern Scanner with multi-leg detection
    - Breakout Detection with volume confirmation
    - Fundamental Analysis with quality scoring
    - News Sentiment Analysis
    - Combined AI confidence scoring
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint with platform info."""
    return {
        "name": "VCP Trading Platform",
        "version": "1.0.0",
        "description": "AI-powered VCP scanner for Indian stock market",
        "docs": "/docs",
        "api": "/api"
    }
