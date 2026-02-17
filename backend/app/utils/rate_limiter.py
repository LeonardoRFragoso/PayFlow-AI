from fastapi import HTTPException, status, Request
from typing import Optional
import time
from collections import defaultdict
from app.core.logging import logger


class RateLimiter:
    def __init__(self, requests_per_minute: int = 10):
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)
    
    async def check_rate_limit(self, identifier: str) -> bool:
        current_time = time.time()
        minute_ago = current_time - 60
        
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if req_time > minute_ago
        ]
        
        if len(self.requests[identifier]) >= self.requests_per_minute:
            logger.warning(f"Rate limit exceeded for {identifier}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later."
            )
        
        self.requests[identifier].append(current_time)
        return True
    
    def cleanup_old_entries(self):
        current_time = time.time()
        minute_ago = current_time - 60
        
        for identifier in list(self.requests.keys()):
            self.requests[identifier] = [
                req_time for req_time in self.requests[identifier]
                if req_time > minute_ago
            ]
            
            if not self.requests[identifier]:
                del self.requests[identifier]


whatsapp_rate_limiter = RateLimiter(requests_per_minute=20)
api_rate_limiter = RateLimiter(requests_per_minute=60)
