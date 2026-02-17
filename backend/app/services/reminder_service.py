from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.repositories.reminder_repository import ReminderRepository
from app.models.reminder import Reminder
from app.schemas.reminder import ReminderCreate, ReminderUpdate


class ReminderService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ReminderRepository(db)
    
    async def create_reminder(self, user_id: int, reminder_data: ReminderCreate) -> Reminder:
        return await self.repo.create(user_id, reminder_data)
    
    async def get_reminder(self, reminder_id: int, user_id: int) -> Optional[Reminder]:
        return await self.repo.get_by_id(reminder_id, user_id)
    
    async def get_user_reminders(
        self, 
        user_id: int, 
        include_completed: bool = False
    ) -> List[Reminder]:
        return await self.repo.get_all_by_user(user_id, include_completed)
    
    async def get_upcoming_reminders(self, user_id: int, days: int = 7) -> List[Reminder]:
        return await self.repo.get_upcoming(user_id, days)
    
    async def update_reminder(
        self, 
        reminder_id: int, 
        user_id: int, 
        reminder_data: ReminderUpdate
    ) -> Optional[Reminder]:
        return await self.repo.update(reminder_id, user_id, reminder_data)
    
    async def mark_completed(self, reminder_id: int, user_id: int) -> Optional[Reminder]:
        update_data = ReminderUpdate(completed=True)
        return await self.repo.update(reminder_id, user_id, update_data)
    
    async def delete_reminder(self, reminder_id: int, user_id: int) -> bool:
        return await self.repo.delete(reminder_id, user_id)
