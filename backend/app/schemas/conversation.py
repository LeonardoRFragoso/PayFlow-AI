from pydantic import BaseModel
from datetime import datetime
from app.models.conversation_log import MessageRole


class ConversationLogCreate(BaseModel):
    message: str
    role: MessageRole


class ConversationLogResponse(BaseModel):
    id: int
    user_id: int
    message: str
    role: MessageRole
    created_at: datetime
    
    class Config:
        from_attributes = True
