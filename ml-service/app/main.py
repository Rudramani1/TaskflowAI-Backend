"""
TaskFlow AI — ML Microservice
FastAPI application entry point.

This service provides ML-powered predictions for:
  - Story point estimation (effort)
  - Delay risk prediction
  - Priority suggestion
  - Assignee recommendation
  - User productivity analytics

It runs independently on port 8000 and is called by the Node.js backend.
If this service is unavailable, Node.js falls back to rule-based AI.
"""

import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import connect_db, disconnect_db
from app.models.model_registry import registry
from app.utils.logging_config import setup_logging

# ── Setup logging before anything else ───────────────────────
setup_logging()
logger = logging.getLogger(__name__)

# ── Track startup time ───────────────────────────────────────
_start_time: float = 0.0


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: connect DB on startup, disconnect on shutdown."""
    global _start_time
    _start_time = time.time()

    logger.info("🚀 Starting TaskFlow AI ML Microservice...")

    # Connect to MongoDB
    await connect_db()

    # Load any pre-trained models from disk
    settings = get_settings()
    registry.load_all(settings.MODEL_DIR)

    logger.info("✅ ML Microservice ready on port %d", settings.PORT)

    yield  # Application runs here

    # Shutdown
    logger.info("🛑 Shutting down ML Microservice...")
    await disconnect_db()


def get_uptime() -> float:
    """Return server uptime in seconds."""
    return time.time() - _start_time


# ── Create FastAPI app ───────────────────────────────────────
app = FastAPI(
    title="TaskFlow AI — ML Service",
    description="Machine Learning microservice for intelligent project management predictions",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────
settings = get_settings()
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins + ["*"],  # Allow all for microservice-to-microservice calls
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handler — always return fallback format ─
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all: return fallback response so Node.js knows to use rule-based AI."""
    logger.error("Unhandled error on %s %s: %s", request.method, request.url.path, str(exc), exc_info=True)
    return JSONResponse(
        status_code=200,  # Return 200 so Node.js doesn't retry on 500
        content={
            "prediction": None,
            "confidence": 0.0,
            "fallback": True,
            "error": str(exc),
        },
    )


# ── Register routers ────────────────────────────────────────
from app.routes.health import router as health_router
from app.routes.predict import router as predict_router
from app.routes.analytics import router as analytics_router
from app.routes.training import router as training_router

app.include_router(health_router)
app.include_router(predict_router, prefix="/predict", tags=["Predictions"])
app.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
app.include_router(training_router, tags=["Training"])
