from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.models.subscription import Subscription
from app.schemas.subscription import SubscriptionCreate


class SubscriptionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create(self, user_id: int, subscription_data: SubscriptionCreate) -> Subscription:
        subscription = Subscription(
            user_id=user_id,
            plan=subscription_data.plan,
            status=subscription_data.status,
            stripe_customer_id=subscription_data.stripe_customer_id
        )
        self.db.add(subscription)
        await self.db.commit()
        await self.db.refresh(subscription)
        return subscription
    
    async def get_by_user_id(self, user_id: int) -> Optional[Subscription]:
        result = await self.db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def update_status(self, user_id: int, status: str) -> Optional[Subscription]:
        subscription = await self.get_by_user_id(user_id)
        if not subscription:
            return None
        
        subscription.status = status
        await self.db.commit()
        await self.db.refresh(subscription)
        return subscription
    
    async def is_active(self, user_id: int) -> bool:
        subscription = await self.get_by_user_id(user_id)
        return subscription is not None and subscription.status == "active"
