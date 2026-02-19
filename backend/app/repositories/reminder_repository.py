from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from datetime import datetime, timezone
from app.models.reminder import Reminder
from app.schemas.reminder import ReminderCreate, ReminderUpdate


class ReminderRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create(self, user_id: int, reminder_data: ReminderCreate) -> Reminder:
        reminder = Reminder(
            user_id=user_id,
            title=reminder_data.title,
            due_date=reminder_data.due_date,
            completed=0
        )
        self.db.add(reminder)
        await self.db.commit()
        await self.db.refresh(reminder)
        return reminder
    
    async def get_by_id(self, reminder_id: int, user_id: int) -> Optional[Reminder]:
        result = await self.db.execute(
            select(Reminder).where(
                and_(Reminder.id == reminder_id, Reminder.user_id == user_id)
            )
        )
        return result.scalar_one_or_none()
    
    async def get_all_by_user(
        self, 
        user_id: int, 
        include_completed: bool = False,
        limit: int = 100
    ) -> List[Reminder]:
        query = select(Reminder).where(Reminder.user_id == user_id)
        
        if not include_completed:
            query = query.where(Reminder.completed == 0)
        
        query = query.order_by(Reminder.due_date.asc()).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def get_upcoming(self, user_id: int, days: int = 7) -> List[Reminder]:
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(Reminder)
            .where(
                and_(
                    Reminder.user_id == user_id,
                    Reminder.completed == 0,
                    Reminder.due_date >= now
                )
            )
            .order_by(Reminder.due_date.asc())
            .limit(10)
        )
        return list(result.scalars().all())
    
    async def update(
        self, 
        reminder_id: int, 
        user_id: int, 
        reminder_data: ReminderUpdate
    ) -> Optional[Reminder]:
        reminder = await self.get_by_id(reminder_id, user_id)
        if not reminder:
            return None
        
        update_data = reminder_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "completed":
                setattr(reminder, field, 1 if value else 0)
            else:
                setattr(reminder, field, value)
        
        await self.db.commit()
        await self.db.refresh(reminder)
        return reminder
    
    async def delete(self, reminder_id: int, user_id: int) -> bool:
        reminder = await self.get_by_id(reminder_id, user_id)
        if not reminder:
            return False
        
        await self.db.delete(reminder)
        await self.db.commit()
        return True
