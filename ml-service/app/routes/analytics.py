"""
Analytics endpoints — GET /analytics/user-productivity

Provides user productivity metrics computed directly from MongoDB.
Does not require trained models.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Query

from app.services.analytics import get_user_productivity

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/user-productivity")
async def user_productivity(
    orgId: str = Query(..., description="Organization ID"),
    projectId: Optional[str] = Query(None, description="Optional project filter"),
    weeks: int = Query(4, ge=1, le=52, description="Number of weeks to analyze"),
):
    """
    Get per-user weekly task completion rates and productivity trends.

    Returns weekly breakdown, per-user summary, and overall statistics.
    """
    logger.info("GET /analytics/user-productivity — org: %s, weeks: %d", orgId, weeks)

    try:
        result = await get_user_productivity(orgId, projectId, weeks)
        return result
    except Exception as e:
        logger.error("Productivity analytics failed: %s", str(e), exc_info=True)
        return {
            "weekly_data": [],
            "user_summary": [],
            "overall": {"total_completed": 0, "error": str(e)},
        }
