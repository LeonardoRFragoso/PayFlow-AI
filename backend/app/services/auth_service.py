from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from datetime import timedelta
from typing import Optional
from app.repositories.user_repository import UserRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.repositories.user_event_repository import UserEventRepository
from app.schemas.user import UserCreate, UserLogin, Token
from app.schemas.subscription import SubscriptionCreate
from app.core.security import verify_password, create_access_token
from app.core.config import settings
from app.core.logging import logger
from app.models.user import User


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.subscription_repo = SubscriptionRepository(db)
        self.event_repo = UserEventRepository(db)
    
    async def register(self, user_data: UserCreate) -> Token:
        if await self.user_repo.exists_by_email(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        if await self.user_repo.exists_by_phone(user_data.phone_number):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already registered"
            )
        
        user = await self.user_repo.create(user_data)
        
        subscription_data = SubscriptionCreate(
            plan="free",
            status="active"
        )
        await self.subscription_repo.create(user.id, subscription_data)
        
        await self.event_repo.create(
            user.id,
            "user_registered",
            {"email": user.email, "plan": "free"}
        )
        
        logger.info(f"User registered: {user.email}")
        
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return Token(access_token=access_token)
    
    async def login(self, credentials: UserLogin) -> Token:
        user = await self.user_repo.get_by_email(credentials.email)
        
        if not user or not verify_password(credentials.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return Token(access_token=access_token)
    
    async def get_current_user(self, user_id: int) -> Optional[User]:
        return await self.user_repo.get_by_id(user_id)
