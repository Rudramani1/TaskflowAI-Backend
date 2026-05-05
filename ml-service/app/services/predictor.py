"""
Prediction Orchestrator — Routes prediction requests to the correct model
and handles fallback when models aren't available.

Every prediction method returns a standardized response:
  {"prediction": ..., "confidence": float, "fallback": bool, ...}
"""

import logging

from bson import ObjectId

from app.database import get_db
from app.models.model_registry import registry
from app.models.effort_model import predict_effort
from app.models.delay_model import predict_delay
from app.models.priority_model import predict_priority
from app.models.assignee_model import predict_assignee
from app.features.user_features import extract_user_features
from app.features.text_features import build_task_text, compute_skill_similarity

logger = logging.getLogger(__name__)

# ── Standard fallback response ───────────────────────────────
FALLBACK = {"prediction": None, "confidence": 0.0, "fallback": True}


async def predict_task_effort(data: dict) -> dict:
    """
    Predict story points for a task.

    Args:
        data: {"orgId": str, "title": str, "description": str, ...}
    """
    model = registry.get("effort")
    if model is None:
        logger.info("Effort model not loaded — returning fallback")
        return FALLBACK

    try:
        task_data = {
            "title": data.get("title", ""),
            "description": data.get("description", ""),
            "subtasks": [{"title": ""} for _ in range(data.get("subtaskCount", 0))],
            "checklist": [{"text": ""} for _ in range(data.get("checklistCount", 0))],
            "labels": data.get("labels", []),
        }
        return predict_effort(model, task_data)
    except Exception as e:
        logger.error("Effort prediction failed: %s", str(e), exc_info=True)
        return FALLBACK


async def predict_task_delay(data: dict) -> dict:
    """
    Predict if a task will miss its deadline.

    Args:
        data: {"orgId": str, "taskId": str}  — fetches task from DB
    """
    model = registry.get("delay")
    if model is None:
        logger.info("Delay model not loaded — returning fallback")
        return FALLBACK

    try:
        db = get_db()
        task_id = data.get("taskId")

        if task_id:
            task = await db["tasks"].find_one({"_id": ObjectId(task_id)})
            if not task:
                return {**FALLBACK, "error": "Task not found"}
        else:
            # Build task data from request
            task = {
                "title": data.get("title", ""),
                "description": data.get("description", ""),
                "priority": data.get("priority", "p2"),
                "status": data.get("status", "todo"),
                "storyPoints": data.get("storyPoints"),
                "dueDate": data.get("dueDate"),
                "subtasks": [],
                "checklist": [],
                "labels": data.get("labels", []),
                "createdAt": data.get("createdAt"),
            }

        return predict_delay(model, task)
    except Exception as e:
        logger.error("Delay prediction failed: %s", str(e), exc_info=True)
        return FALLBACK


async def predict_task_priority(data: dict) -> dict:
    """
    Suggest task priority.

    Args:
        data: {"orgId": str, "title": str, "description": str, "dueDate": str, ...}
    """
    model_dict = registry.get("priority")
    if model_dict is None:
        logger.info("Priority model not loaded — returning fallback")
        return FALLBACK

    try:
        task_data = {
            "title": data.get("title", ""),
            "description": data.get("description", ""),
            "dueDate": data.get("dueDate"),
            "storyPoints": data.get("storyPoints"),
            "subtasks": [{"title": ""} for _ in range(data.get("subtaskCount", 0))],
            "checklist": [{"text": ""} for _ in range(data.get("checklistCount", 0))],
            "labels": data.get("labels", []),
        }
        return predict_priority(model_dict, task_data)
    except Exception as e:
        logger.error("Priority prediction failed: %s", str(e), exc_info=True)
        return FALLBACK


async def predict_task_assignee(data: dict) -> dict:
    """
    Recommend best assignee for a task.

    Args:
        data: {"orgId": str, "title": str, "description": str, "labels": [...]}
    """
    model = registry.get("assignee")
    if model is None:
        logger.info("Assignee model not loaded — returning fallback")
        return FALLBACK

    try:
        db = get_db()
        org_id = data.get("orgId")
        if not org_id:
            return {**FALLBACK, "error": "orgId required"}

        org_oid = ObjectId(org_id)

        # Get org members
        org_doc = await db["organizations"].find_one({"_id": org_oid})
        if not org_doc:
            return {**FALLBACK, "error": "Organization not found"}

        member_ids = [str(m["user"]) for m in org_doc.get("members", []) if m.get("user")]
        if not member_ids:
            return {**FALLBACK, "error": "No members found"}

        # Build new task text for similarity
        task_text = build_task_text({
            "title": data.get("title", ""),
            "description": data.get("description", ""),
            "labels": data.get("labels", []),
        })

        # Extract features for each candidate
        candidate_features = {}
        for uid in member_ids:
            try:
                user_feats = await extract_user_features(db, uid, org_id)
                sim = await compute_skill_similarity(db, uid, task_text, org_id)
                user_feats["skill_similarity"] = sim
                candidate_features[uid] = user_feats
            except Exception as e:
                logger.warning("Failed features for user %s: %s", uid, str(e))

        if not candidate_features:
            return {**FALLBACK, "error": "Could not extract candidate features"}

        # Get user names for response
        users_col = db["users"]
        user_name_map = {}
        for uid in candidate_features:
            user_doc = await users_col.find_one({"_id": ObjectId(uid)}, {"name": 1})
            if user_doc:
                user_name_map[uid] = user_doc.get("name", "Unknown")

        result = predict_assignee(model, candidate_features)

        # Enrich rankings with user names
        for ranking in result.get("rankings", []):
            ranking["userName"] = user_name_map.get(ranking["userId"], "Unknown")

        return result
    except Exception as e:
        logger.error("Assignee prediction failed: %s", str(e), exc_info=True)
        return FALLBACK
