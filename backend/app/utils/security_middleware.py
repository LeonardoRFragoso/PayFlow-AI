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
from datetime import datetime, timedelta
from typing import Optional
from app.core.logging import logger
from app.core.redis import get_redis

limiter = Limiter(key_func=get_remote_address)

class LoginAttemptTracker:
    def __init__(self):
        self.redis = None
        self.ttl_seconds = 900  # 15 minutos
    
    async def _get_redis(self):
        """Obtém conexão Redis lazy"""
        if self.redis is None:
            self.redis = await get_redis()
        return self.redis
    
    async def track_attempt(self, identifier: str) -> int:
        """Registra tentativa de login e retorna total de tentativas"""
        try:
            redis = await self._get_redis()
            key = f"login_attempts:{identifier}"
            
            # Incrementa contador
            attempts = await redis.incr(key)
            
            # Define TTL apenas na primeira tentativa
            if attempts == 1:
                await redis.expire(key, self.ttl_seconds)
            
            logger.info(f"Login attempt {attempts} for {identifier}")
            return attempts
            
        except Exception as e:
            logger.error(f"Error tracking login attempt: {e}")
            # Fallback: permitir login se Redis falhar
            return 0
    
    async def is_blocked(self, identifier: str) -> bool:
        """Verifica se identificador está bloqueado"""
        try:
            redis = await self._get_redis()
            key = f"login_attempts:{identifier}"
            attempts = await redis.get(key)
            
            if attempts is None:
                return False
            
            return int(attempts) >= 5
            
        except Exception as e:
            logger.error(f"Error checking if blocked: {e}")
            # Fallback: permitir login se Redis falhar
            return False
    
    async def clear_attempts(self, identifier: str):
        """Limpa tentativas após login bem-sucedido"""
        try:
            redis = await self._get_redis()
            key = f"login_attempts:{identifier}"
            await redis.delete(key)
            logger.info(f"Cleared login attempts for {identifier}")
            
        except Exception as e:
            logger.error(f"Error clearing attempts: {e}")


login_attempt_tracker = LoginAttemptTracker()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
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
