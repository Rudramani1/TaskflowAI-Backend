"""
Text-based feature extraction — TF-IDF vectorization and cosine similarity
for skill matching between tasks and team members.

Used by the assignee recommendation model to answer:
"Who has completed tasks similar to this new task before?"
"""

import logging
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

logger = logging.getLogger(__name__)

# ── Module-level vectorizer (fitted during training) ─────────
_vectorizer: TfidfVectorizer | None = None


def get_vectorizer() -> TfidfVectorizer:
    """Get or create the TF-IDF vectorizer."""
    global _vectorizer
    if _vectorizer is None:
        _vectorizer = TfidfVectorizer(
            max_features=500,
            stop_words="english",
            ngram_range=(1, 2),
            min_df=2,
            max_df=0.95,
        )
    return _vectorizer


def set_vectorizer(vectorizer: TfidfVectorizer):
    """Replace the global vectorizer (called after training)."""
    global _vectorizer
    _vectorizer = vectorizer


def clean_text(text: str) -> str:
    """Clean HTML and normalize text for TF-IDF."""
    # Strip HTML tags
    text = re.sub(r"<[^>]+>", " ", text)
    # Lowercase
    text = text.lower()
    # Remove special chars but keep spaces
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


def build_task_text(task: dict) -> str:
    """Combine task title, description, and labels into a single text."""
    parts = [
        task.get("title", ""),
        task.get("description", ""),
    ]
    labels = task.get("labels", [])
    if labels:
        parts.extend(labels)
    return clean_text(" ".join(parts))


async def compute_skill_similarity(db, user_id, new_task_text: str, org_id) -> float:
    """
    Compute cosine similarity between a new task's text and the corpus
    of all tasks previously completed by a specific user.

    Args:
        db: Motor database instance
        user_id: ObjectId of the user
        new_task_text: Cleaned text of the new task
        org_id: ObjectId of the organization

    Returns:
        Cosine similarity score between 0.0 and 1.0
    """
    from bson import ObjectId

    if isinstance(user_id, str):
        user_id = ObjectId(user_id)
    if isinstance(org_id, str):
        org_id = ObjectId(org_id)

    tasks_col = db["tasks"]

    # Get user's completed tasks
    cursor = tasks_col.find(
        {
            "assigneeId": user_id,
            "organizationId": org_id,
            "status": "done",
        },
        {"title": 1, "description": 1, "labels": 1},
    ).limit(100)

    user_tasks = await cursor.to_list(100)
    if not user_tasks:
        return 0.0

    # Build user's task corpus
    user_corpus = " ".join(build_task_text(t) for t in user_tasks)
    if not user_corpus.strip():
        return 0.0

    try:
        # Simple TF-IDF based similarity
        vectorizer = TfidfVectorizer(
            max_features=200,
            stop_words="english",
            ngram_range=(1, 2),
        )
        tfidf_matrix = vectorizer.fit_transform([user_corpus, new_task_text])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return round(float(similarity), 4)
    except Exception as e:
        logger.warning("Skill similarity computation failed: %s", str(e))
        return 0.0


def batch_compute_similarity(user_corpuses: list[str], new_task_text: str) -> list[float]:
    """
    Compute cosine similarity between a new task and multiple user corpuses.
    More efficient than calling compute_skill_similarity per user.

    Args:
        user_corpuses: List of concatenated completed-task text per user
        new_task_text: Cleaned text of the new task

    Returns:
        List of similarity scores (one per user)
    """
    if not user_corpuses or not new_task_text.strip():
        return [0.0] * len(user_corpuses)

    try:
        all_texts = user_corpuses + [new_task_text]
        vectorizer = TfidfVectorizer(
            max_features=200,
            stop_words="english",
            ngram_range=(1, 2),
        )
        tfidf_matrix = vectorizer.fit_transform(all_texts)

        # Last row is the new task; compute similarity against all user rows
        new_task_vec = tfidf_matrix[-1:]
        user_vecs = tfidf_matrix[:-1]

        similarities = cosine_similarity(user_vecs, new_task_vec).flatten()
        return [round(float(s), 4) for s in similarities]
    except Exception as e:
        logger.warning("Batch similarity computation failed: %s", str(e))
        return [0.0] * len(user_corpuses)
