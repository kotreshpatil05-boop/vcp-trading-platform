"""
VCP Trading Platform - Run Server
"""
import uvicorn
from app.config import API_HOST, API_PORT, DEBUG

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=API_HOST,
        port=API_PORT,
        reload=DEBUG,
        log_level="info"
    )
