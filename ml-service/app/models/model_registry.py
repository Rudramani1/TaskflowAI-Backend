"""
Model Registry — loads, caches, and hot-reloads trained joblib model files.

Thread-safe singleton that serves models to the prediction layer.
If a model file doesn't exist, returns None (triggering fallback).
"""

import os
import logging
import threading
from typing import Any
import joblib

logger = logging.getLogger(__name__)

# ── Model filenames ──────────────────────────────────────────
MODEL_FILES = {
    "effort": "effort_model.joblib",
    "delay": "delay_model.joblib",
    "priority": "priority_model.joblib",
    "assignee": "assignee_model.joblib",
    "tfidf": "tfidf_vectorizer.joblib",
}


class ModelRegistry:
    """
    Singleton registry for trained ML models.
    Models are loaded from disk at startup and can be hot-reloaded after training.
    """

    def __init__(self):
        self._models: dict[str, Any] = {}
        self._lock = threading.Lock()
        self._model_dir: str = ""
        self._metadata: dict[str, dict] = {}

    def load_all(self, model_dir: str):
        """Load all available model files from the given directory."""
        self._model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)

        with self._lock:
            for model_name, filename in MODEL_FILES.items():
                filepath = os.path.join(model_dir, filename)
                if os.path.exists(filepath):
                    try:
                        self._models[model_name] = joblib.load(filepath)
                        file_size = os.path.getsize(filepath)
                        self._metadata[model_name] = {
                            "loaded": True,
                            "file": filename,
                            "size_kb": round(file_size / 1024, 1),
                        }
                        logger.info("  📦 Loaded model: %s (%s KB)", model_name, self._metadata[model_name]["size_kb"])
                    except Exception as e:
                        logger.error("  ❌ Failed to load %s: %s", model_name, str(e))
                        self._models[model_name] = None
                        self._metadata[model_name] = {"loaded": False, "error": str(e)}
                else:
                    self._models[model_name] = None
                    self._metadata[model_name] = {"loaded": False, "reason": "File not found"}
                    logger.info("  ⏭️  Model not found (will use fallback): %s", model_name)

    def get(self, model_name: str) -> Any | None:
        """Get a loaded model by name. Returns None if not loaded."""
        with self._lock:
            return self._models.get(model_name)

    def save(self, model_name: str, model: Any):
        """Save a model to disk and update the registry."""
        if model_name not in MODEL_FILES:
            raise ValueError(f"Unknown model name: {model_name}")

        filepath = os.path.join(self._model_dir, MODEL_FILES[model_name])
        os.makedirs(self._model_dir, exist_ok=True)

        joblib.dump(model, filepath)
        file_size = os.path.getsize(filepath)

        with self._lock:
            self._models[model_name] = model
            self._metadata[model_name] = {
                "loaded": True,
                "file": MODEL_FILES[model_name],
                "size_kb": round(file_size / 1024, 1),
            }

        logger.info("💾 Saved model: %s (%s KB)", model_name, self._metadata[model_name]["size_kb"])

    def reload(self, model_name: str):
        """Reload a specific model from disk."""
        if model_name not in MODEL_FILES:
            return

        filepath = os.path.join(self._model_dir, MODEL_FILES[model_name])
        if os.path.exists(filepath):
            try:
                model = joblib.load(filepath)
                with self._lock:
                    self._models[model_name] = model
                    self._metadata[model_name] = {
                        "loaded": True,
                        "file": MODEL_FILES[model_name],
                        "size_kb": round(os.path.getsize(filepath) / 1024, 1),
                    }
                logger.info("🔄 Reloaded model: %s", model_name)
            except Exception as e:
                logger.error("❌ Failed to reload %s: %s", model_name, str(e))

    def is_loaded(self, model_name: str) -> bool:
        """Check if a model is loaded and ready."""
        with self._lock:
            return self._models.get(model_name) is not None

    def get_status(self) -> dict:
        """Return status of all models for the health endpoint."""
        with self._lock:
            return {
                "models": {
                    name: {
                        "loaded": self._models.get(name) is not None,
                        **self._metadata.get(name, {}),
                    }
                    for name in MODEL_FILES
                },
                "model_dir": self._model_dir,
            }

    def loaded_models(self) -> list[str]:
        """Return list of loaded model names."""
        with self._lock:
            return [name for name, model in self._models.items() if model is not None]


# ── Singleton instance ───────────────────────────────────────
registry = ModelRegistry()
