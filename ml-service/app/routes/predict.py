"""
Prediction endpoints — POST /predict/{effort,delay,priority,assignee}

Each endpoint returns a standardized response:
  {"prediction": ..., "confidence": float, "fallback": bool, ...}

If the model is not loaded, returns {"fallback": true}.
"""

import logging
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

from app.services.predictor import (
    predict_task_effort,
    predict_task_delay,
    predict_task_priority,
    predict_task_assignee,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Request schemas ──────────────────────────────────────────

class EffortRequest(BaseModel):
    orgId: str
    title: str
    description: str = ""
    subtaskCount: int = 0
    checklistCount: int = 0
    labels: list[str] = []


class DelayRequest(BaseModel):
    orgId: str
    taskId: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = "p2"
    status: Optional[str] = "todo"
    storyPoints: Optional[int] = None
    dueDate: Optional[str] = None
    labels: list[str] = []


class PriorityRequest(BaseModel):
    orgId: str
    title: str
    description: str = ""
    dueDate: Optional[str] = None
    storyPoints: Optional[int] = None
    subtaskCount: int = 0
    checklistCount: int = 0
    labels: list[str] = []


class AssigneeRequest(BaseModel):
    orgId: str
    title: str
    description: str = ""
    labels: list[str] = []
    taskId: Optional[str] = None


# ── Endpoints ────────────────────────────────────────────────

@router.post("/effort")
async def predict_effort_endpoint(request: EffortRequest):
    """
    Predict story points for a task.

    Returns estimated Fibonacci story points with confidence score.
    """
    logger.info("POST /predict/effort — title: %s", request.title[:50])
    result = await predict_task_effort(request.model_dump())
    return result


@router.post("/delay")
async def predict_delay_endpoint(request: DelayRequest):
    """
    Predict if a task will miss its deadline.

    Returns delay risk assessment with probability.
    """
    logger.info("POST /predict/delay — task: %s", request.taskId or request.title or "unknown")
    result = await predict_task_delay(request.model_dump())
    return result


@router.post("/priority")
async def predict_priority_endpoint(request: PriorityRequest):
    """
    Suggest task priority (p0/p1/p2/p3).

    Returns suggested priority with probability distribution.
    """
    logger.info("POST /predict/priority — title: %s", request.title[:50])
    result = await predict_task_priority(request.model_dump())
    return result


@router.post("/assignee")
async def predict_assignee_endpoint(request: AssigneeRequest):
    """
    Recommend the best assignee for a task.

    Returns ranked list of team members with confidence scores.
    """
    logger.info("POST /predict/assignee — title: %s", request.title[:50])
    result = await predict_task_assignee(request.model_dump())
    return result
