"""
User feature extraction — computes workload, capacity, and efficiency
features for each team member. Used by the assignee recommendation model.
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


async def extract_user_features(db, user_id, org_id) -> dict:
    """
    Extract workload and performance features for a single user.

    Args:
        db: Motor database instance
        user_id: ObjectId of the user
        org_id: ObjectId of the organization

    Returns:
        Dictionary of feature_name → numeric_value
    """
    from bson import ObjectId

    if isinstance(user_id, str):
        user_id = ObjectId(user_id)
    if isinstance(org_id, str):
        org_id = ObjectId(org_id)

    tasks_col = db["tasks"]

    # ── Active tasks (not done) ──────────────────────────────
    active_tasks = await tasks_col.count_documents({
        "assigneeId": user_id,
        "organizationId": org_id,
        "status": {"$ne": "done"},
    })

    # ── Open story points ────────────────────────────────────
    pipeline_open_points = [
        {"$match": {"assigneeId": user_id, "organizationId": org_id, "status": {"$ne": "done"}}},
        {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$storyPoints", 0]}}}},
    ]
    result = await tasks_col.aggregate(pipeline_open_points).to_list(1)
    open_points = result[0]["total"] if result else 0

    # ── Completed tasks ──────────────────────────────────────
    completed_tasks = await tasks_col.count_documents({
        "assigneeId": user_id,
        "organizationId": org_id,
        "status": "done",
    })

    # ── P0 task count (urgent load) ──────────────────────────
    p0_count = await tasks_col.count_documents({
        "assigneeId": user_id,
        "organizationId": org_id,
        "status": {"$ne": "done"},
        "priority": "p0",
    })

    # ── Average completion time (days) ───────────────────────
    pipeline_avg_days = [
        {"$match": {
            "assigneeId": user_id,
            "organizationId": org_id,
            "status": "done",
            "completedAt": {"$ne": None},
            "createdAt": {"$ne": None},
        }},
        {"$project": {
            "days": {
                "$divide": [
                    {"$subtract": ["$completedAt", "$createdAt"]},
                    86400000,  # ms to days
                ]
            }
        }},
        {"$group": {"_id": None, "avg": {"$avg": "$days"}}},
    ]
    result = await tasks_col.aggregate(pipeline_avg_days).to_list(1)
    avg_completion_days = round(result[0]["avg"], 2) if result else 3.0  # Default 3 days

    # ── Completion rate ──────────────────────────────────────
    total = completed_tasks + active_tasks
    completion_rate = round(completed_tasks / total, 3) if total > 0 else 0.0

    # ── Workload score (same formula as Node.js ai-engine.js) ─
    workload_score = open_points + active_tasks * 2

    return {
        "active_task_count": active_tasks,
        "open_story_points": open_points,
        "completed_task_count": completed_tasks,
        "avg_completion_days": avg_completion_days,
        "p0_task_count": p0_count,
        "completion_rate": completion_rate,
        "workload_score": workload_score,
        "is_overloaded": 1 if (open_points > 20 or active_tasks > 8) else 0,
    }


# ── Feature column ordering for assignee model ──────────────
ASSIGNEE_USER_FEATURE_COLS = [
    "active_task_count",
    "open_story_points",
    "completed_task_count",
    "avg_completion_days",
    "p0_task_count",
    "completion_rate",
    "workload_score",
    "is_overloaded",
    "skill_similarity",  # Added by text_features.py
]
