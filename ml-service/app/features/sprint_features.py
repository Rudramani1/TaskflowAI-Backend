"""
Sprint feature extraction — computes progress and time-based features
from sprint documents. Used by the delay prediction model.
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


async def extract_sprint_features(db, sprint_id, org_id) -> dict:
    """
    Extract progress features for a sprint.

    Args:
        db: Motor database instance
        sprint_id: ObjectId of the sprint
        org_id: ObjectId of the organization

    Returns:
        Dictionary of feature_name → numeric_value
    """
    from bson import ObjectId

    if isinstance(sprint_id, str):
        sprint_id = ObjectId(sprint_id)
    if isinstance(org_id, str):
        org_id = ObjectId(org_id)

    sprints_col = db["sprints"]
    tasks_col = db["tasks"]

    # Get sprint document
    sprint = await sprints_col.find_one({"_id": sprint_id})
    if not sprint:
        return _default_sprint_features()

    now = datetime.now(timezone.utc)
    start_date = sprint.get("startDate", now)
    end_date = sprint.get("endDate", now)

    if isinstance(start_date, datetime) and start_date.tzinfo is None:
        start_date = start_date.replace(tzinfo=timezone.utc)
    if isinstance(end_date, datetime) and end_date.tzinfo is None:
        end_date = end_date.replace(tzinfo=timezone.utc)

    total_days = max(1, (end_date - start_date).total_seconds() / 86400)
    days_elapsed = max(0, (now - start_date).total_seconds() / 86400)
    days_remaining = max(0, (end_date - now).total_seconds() / 86400)
    time_progress = min(1.0, days_elapsed / total_days)

    # Task progress within this sprint
    total_tasks = await tasks_col.count_documents({
        "sprintId": sprint_id,
        "organizationId": org_id,
    })

    done_tasks = await tasks_col.count_documents({
        "sprintId": sprint_id,
        "organizationId": org_id,
        "status": "done",
    })

    task_progress = done_tasks / total_tasks if total_tasks > 0 else 0.0

    # Point progress
    pipeline = [
        {"$match": {"sprintId": sprint_id, "organizationId": org_id}},
        {"$group": {
            "_id": "$status",
            "points": {"$sum": {"$ifNull": ["$storyPoints", 0]}},
            "count": {"$sum": 1},
        }},
    ]
    status_groups = await tasks_col.aggregate(pipeline).to_list(10)

    total_points = sum(g["points"] for g in status_groups)
    done_points = sum(g["points"] for g in status_groups if g["_id"] == "done")
    point_progress = done_points / total_points if total_points > 0 else 0.0

    return {
        "sprint_total_days": round(total_days, 2),
        "sprint_days_elapsed": round(days_elapsed, 2),
        "sprint_days_remaining": round(days_remaining, 2),
        "sprint_time_progress": round(time_progress, 4),
        "sprint_total_tasks": total_tasks,
        "sprint_done_tasks": done_tasks,
        "sprint_task_progress": round(task_progress, 4),
        "sprint_total_points": total_points,
        "sprint_done_points": done_points,
        "sprint_point_progress": round(point_progress, 4),
    }


def _default_sprint_features() -> dict:
    """Return default features when sprint is not found."""
    return {
        "sprint_total_days": 14.0,
        "sprint_days_elapsed": 0.0,
        "sprint_days_remaining": 14.0,
        "sprint_time_progress": 0.0,
        "sprint_total_tasks": 0,
        "sprint_done_tasks": 0,
        "sprint_task_progress": 0.0,
        "sprint_total_points": 0,
        "sprint_done_points": 0,
        "sprint_point_progress": 0.0,
    }


# ── Sprint feature columns used by delay model ──────────────
SPRINT_FEATURE_COLS = [
    "sprint_days_remaining",
    "sprint_time_progress",
    "sprint_task_progress",
    "sprint_point_progress",
]
