from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import Dict
import time
from collections import defaultdict
from app.core.logging import logger

limiter = Limiter(key_func=get_remote_address)

class LoginAttemptTracker:
    def __init__(self, max_attempts: int = 5, window_seconds: int = 300):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.attempts: Dict[str, list] = defaultdict(list)
    
    def record_attempt(self, identifier: str) -> bool:
        current_time = time.time()
        cutoff_time = current_time - self.window_seconds
        
        self.attempts[identifier] = [
            t for t in self.attempts[identifier] if t > cutoff_time
        ]
        
        if len(self.attempts[identifier]) >= self.max_attempts:
            logger.warning(f"Brute force attempt detected for {identifier}")
            return False
        
        self.attempts[identifier].append(current_time)
        return True
    
    def clear_attempts(self, identifier: str):
        if identifier in self.attempts:
            del self.attempts[identifier]


login_tracker = LoginAttemptTracker()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        return response


class IPRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 100):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, list] = defaultdict(list)
    
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()
        minute_ago = current_time - 60
        
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if req_time > minute_ago
        ]
        
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            logger.warning(f"Rate limit exceeded for IP {client_ip}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Please try again later."}
            )
        
        self.requests[client_ip].append(current_time)
        
        response = await call_next(request)
        return response


def check_brute_force(email: str) -> bool:
    return login_tracker.record_attempt(email)


def clear_login_attempts(email: str):
    login_tracker.clear_attempts(email)
