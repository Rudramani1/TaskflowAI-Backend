"""
Training endpoint — POST /train

Triggers the full ML training pipeline as a background task.
Returns immediately with 202 Accepted.
"""

import logging
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel

from app.services.trainer import run_training

logger = logging.getLogger(__name__)
router = APIRouter()

# ── In-memory training status ────────────────────────────────
_training_status: dict = {"status": "idle", "last_result": None}


class TrainRequest(BaseModel):
    orgId: str


@router.post("/train")
async def train_models(request: TrainRequest, background_tasks: BackgroundTasks):
    """
    Trigger model training for an organization.

    Training runs in the background. Returns immediately with status.
    Use GET /train/status to check progress.
    """
    global _training_status

    if _training_status["status"] == "running":
        return {
            "status": "already_running",
            "message": "Training is already in progress. Please wait.",
        }

    _training_status["status"] = "running"
    logger.info("POST /train — starting training for org: %s", request.orgId)

    async def _train_and_update():
        global _training_status
        try:
            result = await run_training(request.orgId)
            _training_status = {"status": "complete", "last_result": result}
        except Exception as e:
            logger.error("Training failed: %s", str(e), exc_info=True)
            _training_status = {"status": "failed", "last_result": {"error": str(e)}}

    background_tasks.add_task(_train_and_update)

    return {
        "status": "accepted",
        "message": f"Training started for org {request.orgId}. Check GET /train/status for progress.",
    }


@router.get("/train/status")
async def train_status():
    """
    Check the status of the most recent training run.
    """
    return _training_status
