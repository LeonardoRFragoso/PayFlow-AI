from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ReminderCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    due_date: datetime


class ReminderUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    due_date: Optional[datetime] = None
    completed: Optional[bool] = None


class ReminderResponse(BaseModel):
    id: int
    user_id: int
    title: str
    due_date: datetime
    completed: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
