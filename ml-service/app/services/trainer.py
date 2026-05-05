"""
Training Pipeline — Reads data from MongoDB, engineers features,
trains all ML models, and saves them to disk.

Triggered via POST /train endpoint.
Runs as a background task to avoid blocking the API.
"""

import logging
from datetime import datetime, timezone

from bson import ObjectId

from app.config import get_settings
from app.database import get_db
from app.models.model_registry import registry
from app.models.effort_model import train_effort_model
from app.models.delay_model import train_delay_model
from app.models.priority_model import train_priority_model
from app.models.assignee_model import train_assignee_model
from app.features.user_features import extract_user_features
from app.features.text_features import build_task_text, batch_compute_similarity

logger = logging.getLogger(__name__)


async def run_training(org_id: str) -> dict:
    """
    Full training pipeline for all models.

    Args:
        org_id: Organization ID to scope the training data

    Returns:
        Training results with metrics for each model
    """
    settings = get_settings()
    db = get_db()
    org_oid = ObjectId(org_id)

    logger.info("🧠 Starting ML training pipeline for org: %s", org_id)
    results = {}
    start_time = datetime.now(timezone.utc)

    # ═══════════════════════════════════════════
    # STEP 1: Fetch all completed tasks
    # ═══════════════════════════════════════════
    tasks_col = db["tasks"]
    all_completed = await tasks_col.find({
        "organizationId": org_oid,
        "status": "done",
    }).to_list(5000)

    all_tasks = await tasks_col.find({
        "organizationId": org_oid,
    }).to_list(10000)

    logger.info("  📊 Fetched %d completed tasks, %d total tasks", len(all_completed), len(all_tasks))

    # ═══════════════════════════════════════════
    # STEP 2: Train Effort Model
    # ═══════════════════════════════════════════
    effort_tasks = [t for t in all_completed if t.get("storyPoints") is not None and t["storyPoints"] > 0]
    if len(effort_tasks) >= settings.MIN_EFFORT_SAMPLES:
        model, metrics = train_effort_model(effort_tasks)
        if model:
            registry.save("effort", model)
            results["effort"] = {"status": "trained", **metrics}
        else:
            results["effort"] = {"status": "failed", **metrics}
    else:
        results["effort"] = {
            "status": "skipped",
            "reason": f"Need {settings.MIN_EFFORT_SAMPLES} samples, have {len(effort_tasks)}",
        }
    logger.info("  Effort model: %s", results["effort"]["status"])

    # ═══════════════════════════════════════════
    # STEP 3: Train Delay Model
    # ═══════════════════════════════════════════
    delay_tasks = [t for t in all_completed if t.get("dueDate") is not None and t.get("completedAt") is not None]
    if len(delay_tasks) >= settings.MIN_DELAY_SAMPLES:
        model, metrics = train_delay_model(delay_tasks)
        if model:
            registry.save("delay", model)
            results["delay"] = {"status": "trained", **metrics}
        else:
            results["delay"] = {"status": "failed", **metrics}
    else:
        results["delay"] = {
            "status": "skipped",
            "reason": f"Need {settings.MIN_DELAY_SAMPLES} samples, have {len(delay_tasks)}",
        }
    logger.info("  Delay model: %s", results["delay"]["status"])

    # ═══════════════════════════════════════════
    # STEP 4: Train Priority Model
    # ═══════════════════════════════════════════
    priority_tasks = [t for t in all_tasks if t.get("priority") in ["p0", "p1", "p2", "p3"]]
    if len(priority_tasks) >= settings.MIN_PRIORITY_SAMPLES:
        model_dict, metrics = train_priority_model(priority_tasks)
        if model_dict:
            registry.save("priority", model_dict)
            results["priority"] = {"status": "trained", **metrics}
        else:
            results["priority"] = {"status": "failed", **metrics}
    else:
        results["priority"] = {
            "status": "skipped",
            "reason": f"Need {settings.MIN_PRIORITY_SAMPLES} samples, have {len(priority_tasks)}",
        }
    logger.info("  Priority model: %s", results["priority"]["status"])

    # ═══════════════════════════════════════════
    # STEP 5: Train Assignee Model
    # ═══════════════════════════════════════════
    assigned_tasks = [t for t in all_completed if t.get("assigneeId") is not None]
    if len(assigned_tasks) >= settings.MIN_ASSIGNEE_SAMPLES:
        # Get all org members
        orgs_col = db["organizations"]
        org_doc = await orgs_col.find_one({"_id": org_oid})
        member_ids = []
        if org_doc:
            member_ids = [str(m["user"]) for m in org_doc.get("members", []) if m.get("user")]

        if len(member_ids) >= 2:
            # Build training data: for each completed task, compute candidate features
            training_examples = []
            for task in assigned_tasks[:500]:  # Cap for performance
                actual_assignee = str(task["assigneeId"])
                task_text = build_task_text(task)

                candidate_features = {}
                for uid in member_ids:
                    try:
                        user_feats = await extract_user_features(db, uid, org_id)
                        # Compute skill similarity
                        from app.features.text_features import compute_skill_similarity
                        sim = await compute_skill_similarity(db, uid, task_text, org_id)
                        user_feats["skill_similarity"] = sim
                        candidate_features[uid] = user_feats
                    except Exception as e:
                        logger.warning("Failed to extract features for user %s: %s", uid, str(e))

                if candidate_features:
                    training_examples.append({
                        "assignee_id": actual_assignee,
                        "candidate_features": candidate_features,
                    })

            if len(training_examples) >= 10:
                model, metrics = train_assignee_model(training_examples)
                if model:
                    registry.save("assignee", model)
                    results["assignee"] = {"status": "trained", **metrics}
                else:
                    results["assignee"] = {"status": "failed", **metrics}
            else:
                results["assignee"] = {"status": "skipped", "reason": "Not enough training examples built"}
        else:
            results["assignee"] = {"status": "skipped", "reason": f"Need 2+ members, have {len(member_ids)}"}
    else:
        results["assignee"] = {
            "status": "skipped",
            "reason": f"Need {settings.MIN_ASSIGNEE_SAMPLES} samples, have {len(assigned_tasks)}",
        }
    logger.info("  Assignee model: %s", results["assignee"]["status"])

    # ═══════════════════════════════════════════
    # DONE
    # ═══════════════════════════════════════════
    elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
    logger.info("🧠 Training pipeline complete in %.1fs", elapsed)

    return {
        "status": "complete",
        "org_id": org_id,
        "duration_seconds": round(elapsed, 1),
        "models": results,
        "models_loaded": registry.loaded_models(),
    }
