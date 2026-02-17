import redis.asyncio as redis
from app.core.config import settings
from typing import Optional

redis_client: Optional[redis.Redis] = None


async def get_redis() -> redis.Redis:
    return redis_client


async def init_redis():
    global redis_client
    redis_client = await redis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True
    )


async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()
