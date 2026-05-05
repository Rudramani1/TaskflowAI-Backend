"""
Task feature extraction — converts raw MongoDB task documents into
numeric feature vectors for ML models.

Aligned with the existing Node.js ai-engine.js extractFeatures() function,
but extended with additional signals for better model performance.
"""

import re
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ── Keyword lists (same as Node.js ai-engine.js) ────────────
COMPLEX_KEYWORDS = [
    "refactor", "migrate", "integrate", "redesign", "architect",
    "security", "performance", "scalab", "infrastructure", "deployment",
    "authentication", "authorization", "encryption", "distributed",
]

INTEGRATION_KEYWORDS = [
    "api", "oauth", "webhook", "third-party", "external",
    "database migration", "sdk", "rest", "graphql", "grpc",
]

# Priority encoding (higher = more urgent)
PRIORITY_MAP = {"p0": 3, "p1": 2, "p2": 1, "p3": 0}

# Status encoding (progress ordering)
STATUS_MAP = {
    "backlog": 0,
    "todo": 1,
    "in_progress": 2,
    "in_review": 3,
    "done": 4,
}


def extract_task_features(task: dict) -> dict:
    """
    Extract numeric features from a single task document.

    Args:
        task: MongoDB task document (dict)

    Returns:
        Dictionary of feature_name → numeric_value
    """
    title = task.get("title", "")
    description = task.get("description", "")
    combined_text = f"{title} {description}".lower()

    # ── Text-based features ──────────────────────────────────
    # Strip HTML tags from description (it's rich text)
    clean_desc = re.sub(r"<[^>]+>", " ", description)
    word_count = len(clean_desc.split()) if clean_desc.strip() else 0

    # Keyword detection
    complex_count = sum(1 for kw in COMPLEX_KEYWORDS if kw in combined_text)
    integration_count = sum(1 for kw in INTEGRATION_KEYWORDS if kw in combined_text)

    # Subtask-mention heuristic (same as Node.js)
    subtask_mentions = len(re.findall(r"\b(step|subtask|checklist|todo)\b", combined_text, re.IGNORECASE))

    # ── Structural features ──────────────────────────────────
    subtasks = task.get("subtasks", [])
    checklist = task.get("checklist", [])
    labels = task.get("labels", [])

    # ── Encoding ─────────────────────────────────────────────
    priority = task.get("priority", "p2")
    status = task.get("status", "todo")

    # ── Time features ────────────────────────────────────────
    now = datetime.now(timezone.utc)

    created_at = task.get("createdAt")
    days_since_created = 0.0
    if created_at:
        if isinstance(created_at, datetime):
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            days_since_created = max(0.0, (now - created_at).total_seconds() / 86400)
        else:
            days_since_created = 1.0  # Fallback

    due_date = task.get("dueDate")
    days_until_due = -1.0  # Sentinel for "no due date"
    has_due_date = 0
    if due_date:
        has_due_date = 1
        if isinstance(due_date, datetime):
            if due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=timezone.utc)
            days_until_due = (due_date - now).total_seconds() / 86400

    story_points = task.get("storyPoints")
    has_story_points = 1 if story_points is not None else 0

    return {
        "description_word_count": word_count,
        "complex_keyword_count": complex_count,
        "has_complex_keywords": 1 if complex_count > 0 else 0,
        "integration_keyword_count": integration_count,
        "has_integration_keywords": 1 if integration_count > 0 else 0,
        "subtask_mentions": subtask_mentions,
        "subtask_count": len(subtasks),
        "checklist_count": len(checklist),
        "label_count": len(labels),
        "priority_encoded": PRIORITY_MAP.get(priority, 1),
        "status_encoded": STATUS_MAP.get(status, 1),
        "days_since_created": round(days_since_created, 2),
        "days_until_due": round(days_until_due, 2),
        "has_due_date": has_due_date,
        "story_points": story_points if story_points is not None else 0,
        "has_story_points": has_story_points,
        "title_length": len(title),
    }


# ── Feature column ordering (used by all models) ────────────
EFFORT_FEATURE_COLS = [
    "description_word_count",
    "complex_keyword_count",
    "has_complex_keywords",
    "integration_keyword_count",
    "has_integration_keywords",
    "subtask_mentions",
    "subtask_count",
    "checklist_count",
    "label_count",
    "title_length",
]

DELAY_FEATURE_COLS = [
    "description_word_count",
    "has_complex_keywords",
    "has_integration_keywords",
    "subtask_count",
    "checklist_count",
    "label_count",
    "priority_encoded",
    "status_encoded",
    "days_since_created",
    "days_until_due",
    "has_due_date",
    "story_points",
    "has_story_points",
]

PRIORITY_FEATURE_COLS = [
    "description_word_count",
    "has_complex_keywords",
    "has_integration_keywords",
    "subtask_count",
    "checklist_count",
    "label_count",
    "days_until_due",
    "has_due_date",
    "story_points",
    "has_story_points",
    "title_length",
]
