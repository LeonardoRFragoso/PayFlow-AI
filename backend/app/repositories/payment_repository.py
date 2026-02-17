from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from app.models.payment_event import PaymentEvent
from app.schemas.payment import PaymentEventCreate


class PaymentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create(self, user_id: int, event_data: PaymentEventCreate) -> PaymentEvent:
        event = PaymentEvent(
            user_id=user_id,
            **event_data.model_dump()
        )
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event
    
    async def get_by_mp_payment_id(self, mp_payment_id: str) -> Optional[PaymentEvent]:
        result = await self.db.execute(
            select(PaymentEvent).where(PaymentEvent.mp_payment_id == mp_payment_id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_user(self, user_id: int, limit: int = 50) -> List[PaymentEvent]:
        result = await self.db.execute(
            select(PaymentEvent)
            .where(PaymentEvent.user_id == user_id)
            .order_by(PaymentEvent.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
    
    async def get_successful_payments_by_user(self, user_id: int) -> List[PaymentEvent]:
        result = await self.db.execute(
            select(PaymentEvent)
            .where(
                and_(
                    PaymentEvent.user_id == user_id,
                    PaymentEvent.status == "approved"
                )
            )
            .order_by(PaymentEvent.created_at.desc())
        )
        return list(result.scalars().all())
