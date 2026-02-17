#!/usr/bin/env python
"""
RQ Worker para processar jobs em background
Execute: python worker.py
"""
from redis import Redis
from rq import Worker, Queue, Connection
from app.core.config import settings
from app.core.logging import logger

redis_conn = Redis.from_url(settings.REDIS_URL, decode_responses=False)

if __name__ == '__main__':
    logger.info("Starting RQ workers...")
    
    with Connection(redis_conn):
        queues = [
            Queue('whatsapp'),
            Queue('insights'),
            Queue('notifications')
        ]
        
        worker = Worker(queues, connection=redis_conn)
        logger.info(f"Worker listening on queues: {[q.name for q in queues]}")
        worker.work()
