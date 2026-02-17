from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from app.models.user_event import UserEvent


class UserEventRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create(self, user_id: int, event_type: str, event_data: Optional[Dict] = None) -> UserEvent:
        event = UserEvent(
            user_id=user_id,
            event_type=event_type,
            event_data=event_data
        )
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event
    
    async def get_by_user(self, user_id: int, limit: int = 100) -> List[UserEvent]:
        result = await self.db.execute(
            select(UserEvent)
            .where(UserEvent.user_id == user_id)
            .order_by(UserEvent.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
    
    async def get_by_type(self, event_type: str, limit: int = 100) -> List[UserEvent]:
        result = await self.db.execute(
            select(UserEvent)
            .where(UserEvent.event_type == event_type)
            .order_by(UserEvent.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
    
    async def count_by_type(self, event_type: str, start_date: Optional[datetime] = None) -> int:
        query = select(func.count(UserEvent.id)).where(UserEvent.event_type == event_type)
        
        if start_date:
            query = query.where(UserEvent.created_at >= start_date)
        
        result = await self.db.execute(query)
        return result.scalar_one()
    
    async def get_unique_users_by_event(self, event_type: str, start_date: Optional[datetime] = None) -> int:
        query = select(func.count(func.distinct(UserEvent.user_id))).where(
            UserEvent.event_type == event_type
        )
        
        if start_date:
            query = query.where(UserEvent.created_at >= start_date)
        
        result = await self.db.execute(query)
        return result.scalar_one()
    
    async def get_events_by_date_range(
        self, 
        start_date: datetime, 
        end_date: datetime,
        event_type: Optional[str] = None
    ) -> List[UserEvent]:
        query = select(UserEvent).where(
            and_(
                UserEvent.created_at >= start_date,
                UserEvent.created_at <= end_date
            )
        )
        
        if event_type:
            query = query.where(UserEvent.event_type == event_type)
        
        query = query.order_by(UserEvent.created_at.desc())
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def get_event_counts_by_day(
        self,
        event_type: str,
        days: int = 30
    ) -> List[Dict]:
        start_date = datetime.now() - timedelta(days=days)
        
        result = await self.db.execute(
            select(
                func.date(UserEvent.created_at).label('date'),
                func.count(UserEvent.id).label('count')
            )
            .where(
                and_(
                    UserEvent.event_type == event_type,
                    UserEvent.created_at >= start_date
                )
            )
            .group_by(func.date(UserEvent.created_at))
            .order_by(func.date(UserEvent.created_at))
        )
        
        return [{"date": row.date, "count": row.count} for row in result.all()]
