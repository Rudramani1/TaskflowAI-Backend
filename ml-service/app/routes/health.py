"""
Health check endpoint — reports service status, MongoDB connectivity,
loaded models, and uptime.
"""

import logging
from fastapi import APIRouter
from app.database import check_health
from app.models.model_registry import registry

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint.

    Returns service status including:
    - MongoDB connectivity
    - Loaded ML models
    - Server uptime
    """
    from app.main import get_uptime

    mongo_health = await check_health()
    model_status = registry.get_status()

    is_healthy = mongo_health.get("status") == "connected"

    return {
        "status": "healthy" if is_healthy else "degraded",
        "mongodb": mongo_health,
        "models": model_status,
        "models_loaded": registry.loaded_models(),
        "uptime_seconds": round(get_uptime(), 1),
    }
