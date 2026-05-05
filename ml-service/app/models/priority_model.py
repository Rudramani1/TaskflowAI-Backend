"""
Priority Model — Suggests task priority (p0/p1/p2/p3).

Algorithm: XGBClassifier (multi-class)
Training data: Historical tasks with their assigned priority
"""

import logging
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import LabelEncoder

from app.features.task_features import extract_task_features, PRIORITY_FEATURE_COLS

logger = logging.getLogger(__name__)

# Priority labels
PRIORITY_LABELS = ["p0", "p1", "p2", "p3"]


def train_priority_model(tasks: list[dict]) -> tuple:
    """
    Train a priority suggestion model.

    Args:
        tasks: List of task documents with priority set

    Returns:
        (trained_model_dict, metrics_dict)
        model_dict contains {"model": XGBClassifier, "encoder": LabelEncoder}
    """
    rows = []
    labels = []

    for task in tasks:
        priority = task.get("priority")
        if priority not in PRIORITY_LABELS:
            continue
        features = extract_task_features(task)
        rows.append(features)
        labels.append(priority)

    if len(rows) < 10:
        logger.warning("Not enough data for priority model: %d samples (need 10+)", len(rows))
        return None, {"error": "Insufficient data", "samples": len(rows)}

    df = pd.DataFrame(rows)
    X = df[PRIORITY_FEATURE_COLS].fillna(0)

    # Encode labels
    encoder = LabelEncoder()
    encoder.fit(PRIORITY_LABELS)  # Consistent encoding
    y = encoder.transform(labels)

    logger.info("Training priority model with %d samples...", len(y))

    # Class distribution
    unique, counts = np.unique(y, return_counts=True)
    dist = dict(zip(encoder.inverse_transform(unique), counts.tolist()))
    logger.info("  Class distribution: %s", dist)

    model = XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        objective="multi:softprob",
        num_class=len(PRIORITY_LABELS),
        eval_metric="mlogloss",
        use_label_encoder=False,
        random_state=42,
        verbosity=0,
    )

    # Cross-validation
    try:
        cv_scores = cross_val_score(model, X, y, cv=min(5, len(y) // 4), scoring="accuracy")
        accuracy = cv_scores.mean()
    except Exception:
        accuracy = -1.0

    # Train final model
    model.fit(X, y)

    # Feature importance
    importance = dict(zip(PRIORITY_FEATURE_COLS, model.feature_importances_.tolist()))

    metrics = {
        "samples": len(y),
        "class_distribution": dist,
        "accuracy": round(accuracy, 3),
        "feature_importance": importance,
    }

    logger.info("  ✅ Priority model trained: accuracy=%.3f, samples=%d", accuracy, len(y))

    # Return both model and encoder (needed for inference)
    model_dict = {"model": model, "encoder": encoder}
    return model_dict, metrics


def predict_priority(model_dict: dict, task_data: dict) -> dict:
    """
    Predict task priority.

    Args:
        model_dict: {"model": XGBClassifier, "encoder": LabelEncoder}
        task_data: Task document or partial data

    Returns:
        {"prediction": "p1", "confidence": float, "fallback": False, "probabilities": dict}
    """
    model = model_dict["model"]
    encoder = model_dict["encoder"]

    features = extract_task_features(task_data)
    df = pd.DataFrame([features])
    X = df[PRIORITY_FEATURE_COLS].fillna(0)

    # Get probability distribution
    probabilities = model.predict_proba(X)[0]

    # Map to priority labels
    prob_dict = {}
    for i, label in enumerate(encoder.classes_):
        if i < len(probabilities):
            prob_dict[label] = round(float(probabilities[i]), 4)

    # Predicted class
    predicted_idx = int(np.argmax(probabilities))
    predicted_label = encoder.inverse_transform([predicted_idx])[0]
    confidence = float(probabilities[predicted_idx])

    # Feature importance
    importance = dict(zip(PRIORITY_FEATURE_COLS, model.feature_importances_.tolist()))

    return {
        "prediction": predicted_label,
        "confidence": round(confidence, 3),
        "fallback": False,
        "probabilities": prob_dict,
        "feature_importance": {k: round(v, 4) for k, v in sorted(importance.items(), key=lambda x: -x[1])[:5]},
    }
