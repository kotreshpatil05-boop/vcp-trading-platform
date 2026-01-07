"""
VCP Trading Platform - Sentiment Analysis Service
Analyzes news and social sentiment for stocks
"""
import feedparser
from textblob import TextBlob
from typing import List, Optional, Dict
from datetime import datetime
import logging
import re

from ..models.stock import SentimentData, SentimentType
from ..config import NEWS_SOURCES

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SentimentAnalyzer:
    """
    Sentiment Analysis Module:
    - News sentiment from Google News RSS
    - TextBlob for sentiment scoring
    - Aggregate sentiment (-1 to +1)
    - Bullish/Bearish/Neutral classification
    """
    
    def __init__(self):
        self.news_sources = NEWS_SOURCES
    
    def _fetch_news(self, symbol: str, limit: int = 10) -> List[Dict]:
        """Fetch news articles from Google News RSS"""
        articles = []
        
        for source_template in self.news_sources:
            try:
                url = source_template.format(symbol=symbol)
                feed = feedparser.parse(url)
                
                for entry in feed.entries[:limit]:
                    articles.append({
                        'title': entry.title,
                        'summary': entry.get('summary', ''),
                        'published': entry.get('published', ''),
                        'link': entry.get('link', '')
                    })
                    
            except Exception as e:
                logger.warning(f"Error fetching news for {symbol}: {e}")
        
        return articles[:limit]
    
    def _clean_text(self, text: str) -> str:
        """Clean text for sentiment analysis"""
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        # Remove special characters
        text = re.sub(r'[^\w\s]', ' ', text)
        # Remove extra whitespace
        text = ' '.join(text.split())
        return text
    
    def _analyze_sentiment(self, text: str) -> float:
        """Analyze sentiment of text using TextBlob"""
        try:
            cleaned = self._clean_text(text)
            blob = TextBlob(cleaned)
            # Polarity ranges from -1 (negative) to 1 (positive)
            return blob.sentiment.polarity
        except Exception as e:
            logger.warning(f"Error analyzing sentiment: {e}")
            return 0.0
    
    def _classify_sentiment(self, score: float) -> SentimentType:
        """Classify sentiment score into category"""
        if score > 0.1:
            return SentimentType.POSITIVE
        elif score < -0.1:
            return SentimentType.NEGATIVE
        else:
            return SentimentType.NEUTRAL
    
    def analyze(self, symbol: str) -> Optional[SentimentData]:
        """Analyze sentiment for a stock"""
        try:
            # Fetch news articles
            articles = self._fetch_news(symbol)
            
            if not articles:
                return SentimentData(
                    symbol=symbol,
                    news_sentiment_score=0.0,
                    sentiment_label=SentimentType.NEUTRAL,
                    news_count=0,
                    positive_news=0,
                    negative_news=0,
                    neutral_news=0,
                    top_headlines=[],
                    analyzed_at=datetime.now().isoformat()
                )
            
            # Analyze each article
            sentiments = []
            positive_count = 0
            negative_count = 0
            neutral_count = 0
            
            for article in articles:
                text = f"{article['title']} {article.get('summary', '')}"
                sentiment = self._analyze_sentiment(text)
                sentiments.append(sentiment)
                
                if sentiment > 0.1:
                    positive_count += 1
                elif sentiment < -0.1:
                    negative_count += 1
                else:
                    neutral_count += 1
            
            # Calculate aggregate sentiment
            avg_sentiment = sum(sentiments) / len(sentiments) if sentiments else 0.0
            
            # Get top headlines
            top_headlines = [a['title'] for a in articles[:5]]
            
            return SentimentData(
                symbol=symbol,
                news_sentiment_score=round(avg_sentiment, 3),
                sentiment_label=self._classify_sentiment(avg_sentiment),
                news_count=len(articles),
                positive_news=positive_count,
                negative_news=negative_count,
                neutral_news=neutral_count,
                top_headlines=top_headlines,
                analyzed_at=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Error analyzing sentiment for {symbol}: {e}")
            return None
    
    def get_sentiment_summary(self, symbol: str) -> Dict:
        """Get sentiment summary for dashboard display"""
        data = self.analyze(symbol)
        
        if not data:
            return {"error": "Unable to fetch sentiment data"}
        
        # Convert sentiment to emoji/indicator
        if data.sentiment_label == SentimentType.POSITIVE:
            indicator = "🟢 Bullish"
        elif data.sentiment_label == SentimentType.NEGATIVE:
            indicator = "🔴 Bearish"
        else:
            indicator = "🟡 Neutral"
        
        return {
            "symbol": symbol,
            "sentiment_score": data.news_sentiment_score,
            "sentiment_label": data.sentiment_label.value,
            "indicator": indicator,
            "news_count": data.news_count,
            "positive": data.positive_news,
            "negative": data.negative_news,
            "neutral": data.neutral_news,
            "top_headlines": data.top_headlines
        }


# Singleton instance
sentiment_analyzer = SentimentAnalyzer()
