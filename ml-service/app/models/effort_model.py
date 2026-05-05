"""
Effort Model — Predicts story points for a task.

Algorithm: GradientBoostingRegressor → fibonacci rounding
Training data: Completed tasks with known storyPoints from MongoDB
"""

import logging
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import cross_val_score

from app.features.task_features import extract_task_features, EFFORT_FEATURE_COLS

logger = logging.getLogger(__name__)

# Fibonacci sequence used for story points
FIBONACCI = [1, 2, 3, 5, 8, 13, 21]


def fibonacci_round(value: float) -> int:
    """Round a numeric value to the nearest Fibonacci number."""
    value = max(1, min(value, 21))
    return int(min(FIBONACCI, key=lambda f: abs(f - value)))


def train_effort_model(tasks: list[dict]) -> tuple:
    """
    Train a story point estimation model.

    Args:
        tasks: List of completed task documents with storyPoints set

    Returns:
        (trained_model, metrics_dict)
    """
    # Extract features and labels
    rows = []
    labels = []
    for task in tasks:
        sp = task.get("storyPoints")
        if sp is None or sp <= 0:
            continue
        features = extract_task_features(task)
        rows.append(features)
        labels.append(float(sp))

    if len(rows) < 10:
        logger.warning("Not enough data for effort model: %d samples (need 10+)", len(rows))
        return None, {"error": "Insufficient data", "samples": len(rows)}

    df = pd.DataFrame(rows)
    X = df[EFFORT_FEATURE_COLS].fillna(0)
    y = np.array(labels)

    logger.info("Training effort model with %d samples...", len(y))

    model = GradientBoostingRegressor(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        min_samples_split=5,
        min_samples_leaf=3,
        random_state=42,
    )

    # Cross-validation
    try:
        cv_scores = cross_val_score(model, X, y, cv=min(5, len(y) // 2), scoring="neg_mean_absolute_error")
        mae = -cv_scores.mean()
    except Exception:
        mae = -1.0

    # Train final model on all data
    model.fit(X, y)

    # Feature importance
    importance = dict(zip(EFFORT_FEATURE_COLS, model.feature_importances_.tolist()))

    metrics = {
        "samples": len(y),
        "mae": round(mae, 3),
        "feature_importance": importance,
    }

    logger.info("  ✅ Effort model trained: MAE=%.3f, samples=%d", mae, len(y))
    return model, metrics


def predict_effort(model, task_data: dict) -> dict:
    """
    Predict story points for a task.

    Args:
        model: Trained GradientBoostingRegressor
        task_data: Task document or partial task data

    Returns:
        {"prediction": int, "confidence": float, "fallback": False, "feature_importance": dict}
    """
    features = extract_task_features(task_data)
    df = pd.DataFrame([features])
    X = df[EFFORT_FEATURE_COLS].fillna(0)

    raw_prediction = model.predict(X)[0]
    point_estimate = fibonacci_round(raw_prediction)

    # Confidence: based on how close raw prediction is to a Fibonacci number
    distance = abs(raw_prediction - point_estimate)
    max_distance = 5.0  # Rough max expected distance
    confidence = max(0.4, min(0.99, 1.0 - (distance / max_distance)))

    # Feature importance from the model
    importance = dict(zip(EFFORT_FEATURE_COLS, model.feature_importances_.tolist()))

    return {
        "prediction": point_estimate,
        "confidence": round(confidence, 3),
        "fallback": False,
        "raw_estimate": round(raw_prediction, 2),
        "feature_importance": {k: round(v, 4) for k, v in sorted(importance.items(), key=lambda x: -x[1])[:5]},
    }
