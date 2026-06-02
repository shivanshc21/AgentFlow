from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.api.upload import router as upload_router
from app.api.query import router as query_router
from app.websocket.chat_socket import router as websocket_router
from app.llm.gemini_client import check_connection

logger = logging.getLogger(__name__)

app = FastAPI(
    title="AgentFlow",
    description="Multi-agent RAG system with Gemini",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router, prefix="/api")
app.include_router(query_router, prefix="/api")
app.include_router(websocket_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "AgentFlow running", "llm": "Google Gemini"}

@app.get("/health")
async def health():
    """Check if all services are running"""
    try:
        # Check if Gemini API is responding
        gemini_connected = check_connection()
        return {
            "status": "healthy" if gemini_connected else "unhealthy",
            "gemini": "connected" if gemini_connected else "disconnected"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "gemini": "disconnected",
            "error": str(e)
        }