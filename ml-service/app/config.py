"""
Configuration settings for TaskFlow AI ML Microservice.
Uses pydantic-settings to read from environment variables / .env file.
"""

import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── MongoDB ──────────────────────────────────────────────
    MONGODB_URI: str = "mongodb://localhost:27017/taskflownew"

    # ── Server ───────────────────────────────────────────────
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: str = "http://localhost:5000,http://localhost:3000,http://localhost:5173"

    # ── Model Storage ────────────────────────────────────────
    MODEL_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "trained_models")

    # ── Logging ──────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"

    # ── Training Thresholds ──────────────────────────────────
    MIN_EFFORT_SAMPLES: int = 30
    MIN_DELAY_SAMPLES: int = 20
    MIN_PRIORITY_SAMPLES: int = 30
    MIN_ASSIGNEE_SAMPLES: int = 20

    model_config = {
        "env_file": os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
