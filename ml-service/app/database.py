"""
Async MongoDB connection manager for the ML microservice.
Uses motor (async pymongo) for non-blocking database access.
This service has READ-ONLY access — no inserts, updates, or deletes.
"""

import logging
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ServerSelectionTimeoutError
from app.config import get_settings

logger = logging.getLogger(__name__)

# ── Module-level state ───────────────────────────────────────
_client: AsyncIOMotorClient | None = None
_db = None


async def connect_db():
    """Establish async MongoDB connection."""
    global _client, _db
    settings = get_settings()

    try:
        _client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
            maxPoolSize=10,
            minPoolSize=1,
        )
        # Parse DB name from URI or default to 'taskflownew'
        db_name = _client.get_default_database()
        if db_name is not None:
            _db = db_name
        else:
            # Fallback: extract from URI or use default
            uri = settings.MONGODB_URI
            if "?" in uri:
                path = uri.split("?")[0]
            else:
                path = uri
            name = path.rsplit("/", 1)[-1] if "/" in path else "taskflownew"
            _db = _client[name if name else "taskflownew"]

        # Verify connection with a ping
        await _client.admin.command("ping")
        logger.info("✅ MongoDB connected: %s", _db.name)
    except ServerSelectionTimeoutError as e:
        logger.error("❌ MongoDB connection failed: %s", str(e))
        raise
    except Exception as e:
        logger.error("❌ MongoDB connection error: %s", str(e))
        raise


async def disconnect_db():
    """Close MongoDB connection."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
        logger.info("MongoDB disconnected")


def get_db():
    """Get the database instance. Raises if not connected."""
    if _db is None:
        raise RuntimeError("Database not connected. Call connect_db() first.")
    return _db


async def check_health() -> dict:
    """Check MongoDB connectivity and return health info."""
    try:
        if _client is None:
            return {"status": "disconnected", "error": "No client"}
        await _client.admin.command("ping")
        collections = await _db.list_collection_names()
        return {
            "status": "connected",
            "database": _db.name,
            "collections": len(collections),
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}
