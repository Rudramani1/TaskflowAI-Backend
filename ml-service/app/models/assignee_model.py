"""
Assignee Model — Recommends the best team member for a task.

Algorithm: XGBClassifier + cosine similarity scoring
Features: Per-candidate workload, capacity, efficiency, and skill similarity
"""

import logging
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder

from app.features.user_features import ASSIGNEE_USER_FEATURE_COLS

logger = logging.getLogger(__name__)


def train_assignee_model(training_data: list[dict]) -> tuple:
    """
    Train an assignee recommendation model.

    Training data format (one row per task):
        {
            "task_features": {...},
            "assignee_id": "user_id",
            "candidate_features": {
                "user_id_1": {...user_features + skill_similarity...},
                "user_id_2": {...},
            }
        }

    We train a binary classifier: for each (task, candidate) pair,
    predict 1 if the candidate was the actual assignee, 0 otherwise.
    At inference, we score all candidates and rank them.

    Args:
        training_data: List of training examples

    Returns:
        (trained_model_dict, metrics_dict)
    """
    rows = []
    labels = []

    for example in training_data:
        actual_assignee = str(example.get("assignee_id", ""))
        if not actual_assignee:
            continue

        candidate_features = example.get("candidate_features", {})
        for user_id, features in candidate_features.items():
            feature_row = {}
            for col in ASSIGNEE_USER_FEATURE_COLS:
                feature_row[col] = features.get(col, 0)
            rows.append(feature_row)
            labels.append(1 if str(user_id) == actual_assignee else 0)

    if len(rows) < 10:
        logger.warning("Not enough data for assignee model: %d samples (need 10+)", len(rows))
        return None, {"error": "Insufficient data", "samples": len(rows)}

    df = pd.DataFrame(rows)
    X = df[ASSIGNEE_USER_FEATURE_COLS].fillna(0)
    y = np.array(labels)

    logger.info("Training assignee model with %d candidate-pairs (%.1f%% positive)...", len(y), np.mean(y) * 100)

    model = XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        scale_pos_weight=max(1, (len(y) - sum(y)) / max(1, sum(y))),  # Handle class imbalance
        eval_metric="logloss",
        use_label_encoder=False,
        random_state=42,
        verbosity=0,
    )

    model.fit(X, y)

    # Feature importance
    importance = dict(zip(ASSIGNEE_USER_FEATURE_COLS, model.feature_importances_.tolist()))

    metrics = {
        "samples": len(y),
        "positive_ratio": round(float(np.mean(y)), 3),
        "feature_importance": importance,
    }

    logger.info("  ✅ Assignee model trained: %d samples", len(y))
    return model, metrics


def predict_assignee(model, candidate_features: dict[str, dict]) -> dict:
    """
    Rank candidates and recommend the best assignee.

    Args:
        model: Trained XGBClassifier
        candidate_features: {user_id: {feature_dict}} for each candidate

    Returns:
        {"prediction": "user_id", "confidence": float, "fallback": False, "rankings": [...]}
    """
    if not candidate_features:
        return {"prediction": None, "confidence": 0.0, "fallback": True}

    user_ids = list(candidate_features.keys())
    rows = []

    for uid in user_ids:
        features = candidate_features[uid]
        feature_row = {}
        for col in ASSIGNEE_USER_FEATURE_COLS:
            feature_row[col] = features.get(col, 0)
        rows.append(feature_row)

    df = pd.DataFrame(rows)
    X = df[ASSIGNEE_USER_FEATURE_COLS].fillna(0)

    # Get probability of being the right assignee
    probabilities = model.predict_proba(X)

    # Get the "positive class" probability (class 1)
    class_labels = list(model.classes_)
    pos_idx = class_labels.index(1) if 1 in class_labels else 0
    scores = probabilities[:, pos_idx]

    # Build rankings
    rankings = []
    for i, uid in enumerate(user_ids):
        rankings.append({
            "userId": uid,
            "score": round(float(scores[i]), 4),
            "features": {k: round(v, 3) if isinstance(v, float) else v
                        for k, v in candidate_features[uid].items()},
        })

    # Sort by score descending
    rankings.sort(key=lambda r: -r["score"])

    best = rankings[0] if rankings else None
    confidence = best["score"] if best else 0.0

    # Feature importance
    importance = dict(zip(ASSIGNEE_USER_FEATURE_COLS, model.feature_importances_.tolist()))

    return {
        "prediction": best["userId"] if best else None,
        "confidence": round(confidence, 3),
        "fallback": False,
        "rankings": rankings[:10],  # Top 10
        "feature_importance": {k: round(v, 4) for k, v in sorted(importance.items(), key=lambda x: -x[1])[:5]},
    }
