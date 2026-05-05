"""
User Productivity Analytics — Computes per-user weekly completion rates,
trend analysis, and efficiency scores.

This reads directly from MongoDB and does not require trained models.
"""

import logging
from datetime import datetime, timezone, timedelta
from collections import defaultdict

from bson import ObjectId

from app.database import get_db

logger = logging.getLogger(__name__)


async def get_user_productivity(org_id: str, project_id: str = None, weeks: int = 4) -> dict:
    """
    Compute per-user weekly task completion metrics.

    Args:
        org_id: Organization ID
        project_id: Optional project filter
        weeks: Number of weeks to analyze (default 4)

    Returns:
        {
            "weekly_data": [...],
            "user_summary": [...],
            "overall": {...}
        }
    """
    db = get_db()
    org_oid = ObjectId(org_id)
    cutoff = datetime.now(timezone.utc) - timedelta(weeks=weeks)

    # Build query
    query = {
        "organizationId": org_oid,
        "status": "done",
        "completedAt": {"$gte": cutoff},
    }
    if project_id and project_id != "all":
        query["projectId"] = ObjectId(project_id)

    # Fetch completed tasks
    tasks = await db["tasks"].find(
        query,
        {"assigneeId": 1, "completedAt": 1, "storyPoints": 1, "createdAt": 1},
    ).to_list(5000)

    if not tasks:
        return {
            "weekly_data": [],
            "user_summary": [],
            "overall": {"total_completed": 0, "avg_per_week": 0, "period_weeks": weeks},
        }

    # Collect unique user IDs
    user_ids = list(set(str(t.get("assigneeId", "")) for t in tasks if t.get("assigneeId")))

    # Fetch user names
    user_name_map = {}
    if user_ids:
        users = await db["users"].find(
            {"_id": {"$in": [ObjectId(uid) for uid in user_ids]}},
            {"name": 1},
        ).to_list(100)
        user_name_map = {str(u["_id"]): u.get("name", "Unknown") for u in users}

    # ── Weekly breakdown ─────────────────────────────────────
    now = datetime.now(timezone.utc)
    weekly_data = []

    for w in range(weeks):
        week_end = now - timedelta(weeks=w)
        week_start = week_end - timedelta(weeks=1)
        week_label = f"Week {weeks - w}"

        week_tasks = [
            t for t in tasks
            if t.get("completedAt") and week_start <= t["completedAt"].replace(tzinfo=timezone.utc) < week_end
        ]

        user_counts = defaultdict(lambda: {"tasks": 0, "points": 0})
        for t in week_tasks:
            uid = str(t.get("assigneeId", "unassigned"))
            user_counts[uid]["tasks"] += 1
            user_counts[uid]["points"] += t.get("storyPoints", 0) or 0

        week_entry = {
            "week": week_label,
            "start": week_start.isoformat(),
            "end": week_end.isoformat(),
            "total_tasks": len(week_tasks),
            "users": {
                user_name_map.get(uid, "Unassigned"): data
                for uid, data in user_counts.items()
            },
        }
        weekly_data.append(week_entry)

    # ── Per-user summary ─────────────────────────────────────
    user_totals = defaultdict(lambda: {"tasks": 0, "points": 0, "avg_days": []})
    for t in tasks:
        uid = str(t.get("assigneeId", ""))
        if uid:
            user_totals[uid]["tasks"] += 1
            user_totals[uid]["points"] += t.get("storyPoints", 0) or 0
            if t.get("completedAt") and t.get("createdAt"):
                days = (t["completedAt"] - t["createdAt"]).total_seconds() / 86400
                user_totals[uid]["avg_days"].append(max(0.1, days))

    user_summary = []
    for uid, data in user_totals.items():
        avg_completion = sum(data["avg_days"]) / len(data["avg_days"]) if data["avg_days"] else 0
        user_summary.append({
            "userId": uid,
            "name": user_name_map.get(uid, "Unknown"),
            "tasksCompleted": data["tasks"],
            "pointsCompleted": data["points"],
            "avgCompletionDays": round(avg_completion, 1),
            "tasksPerWeek": round(data["tasks"] / weeks, 1),
        })

    user_summary.sort(key=lambda u: -u["tasksCompleted"])

    return {
        "weekly_data": weekly_data,
        "user_summary": user_summary,
        "overall": {
            "total_completed": len(tasks),
            "avg_per_week": round(len(tasks) / weeks, 1),
            "period_weeks": weeks,
            "total_points": sum(t.get("storyPoints", 0) or 0 for t in tasks),
        },
    }
