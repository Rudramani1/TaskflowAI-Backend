"""
Delay Model — Predicts whether a task will miss its deadline.

Algorithm: RandomForestClassifier (binary: on_track vs at_risk)
Training data: Completed tasks with dueDate — label = 1 if completedAt > dueDate
"""

import logging
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score

from app.features.task_features import extract_task_features, DELAY_FEATURE_COLS

logger = logging.getLogger(__name__)


def train_delay_model(tasks: list[dict]) -> tuple:
    """
    Train a delay prediction model.

    Args:
        tasks: List of completed task documents with dueDate and completedAt

    Returns:
        (trained_model, metrics_dict)
    """
    rows = []
    labels = []

    for task in tasks:
        due_date = task.get("dueDate")
        completed_at = task.get("completedAt")
        if due_date is None or completed_at is None:
            continue

        features = extract_task_features(task)
        rows.append(features)

        # Label: 1 = delayed (completed after due date), 0 = on time
        was_delayed = 1 if completed_at > due_date else 0
        labels.append(was_delayed)

    if len(rows) < 10:
        logger.warning("Not enough data for delay model: %d samples (need 10+)", len(rows))
        return None, {"error": "Insufficient data", "samples": len(rows)}

    df = pd.DataFrame(rows)
    X = df[DELAY_FEATURE_COLS].fillna(0)
    y = np.array(labels)

    logger.info("Training delay model with %d samples (%.1f%% delayed)...", len(y), np.mean(y) * 100)

    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=6,
        min_samples_split=5,
        min_samples_leaf=3,
        class_weight="balanced",  # Handle imbalanced classes
        random_state=42,
    )

    # Cross-validation
    try:
        cv_scores = cross_val_score(model, X, y, cv=min(5, len(y) // 3), scoring="accuracy")
        accuracy = cv_scores.mean()
    except Exception:
        accuracy = -1.0

    # Train final model
    model.fit(X, y)

    # Feature importance
    importance = dict(zip(DELAY_FEATURE_COLS, model.feature_importances_.tolist()))

    metrics = {
        "samples": len(y),
        "delayed_ratio": round(float(np.mean(y)), 3),
        "accuracy": round(accuracy, 3),
        "feature_importance": importance,
    }

    logger.info("  ✅ Delay model trained: accuracy=%.3f, samples=%d", accuracy, len(y))
    return model, metrics


def predict_delay(model, task_data: dict) -> dict:
    """
    Predict if a task will be delayed.

    Args:
        model: Trained RandomForestClassifier
        task_data: Task document

    Returns:
        {"prediction": "at_risk"|"on_track", "confidence": float, "fallback": False, ...}
    """
    features = extract_task_features(task_data)
    df = pd.DataFrame([features])
    X = df[DELAY_FEATURE_COLS].fillna(0)

    # Get probability estimates
    probabilities = model.predict_proba(X)[0]
    class_labels = model.classes_

    # Find delay probability (class 1)
    delay_idx = list(class_labels).index(1) if 1 in class_labels else -1
    if delay_idx >= 0:
        delay_prob = probabilities[delay_idx]
    else:
        delay_prob = 0.0

    is_at_risk = delay_prob > 0.5
    prediction = "at_risk" if is_at_risk else "on_track"
    confidence = delay_prob if is_at_risk else (1 - delay_prob)

    # Estimate delay days based on probability
    days_until_due = features.get("days_until_due", 0)
    estimated_delay_days = 0
    if is_at_risk and days_until_due > 0:
        estimated_delay_days = max(1, round(days_until_due * delay_prob * 0.5))

    # Feature importance
    importance = dict(zip(DELAY_FEATURE_COLS, model.feature_importances_.tolist()))

    return {
        "prediction": prediction,
        "confidence": round(float(confidence), 3),
        "fallback": False,
        "delay_probability": round(float(delay_prob), 3),
        "estimated_delay_days": estimated_delay_days,
        "feature_importance": {k: round(v, 4) for k, v in sorted(importance.items(), key=lambda x: -x[1])[:5]},
    }
