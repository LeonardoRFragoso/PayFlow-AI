from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.models.conversation_log import ConversationLog, MessageRole
from app.schemas.conversation import ConversationLogCreate


class ConversationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create(self, user_id: int, log_data: ConversationLogCreate) -> ConversationLog:
        log = ConversationLog(
            user_id=user_id,
            message=log_data.message,
            role=log_data.role
        )
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)
        return log
    
    async def get_recent_by_user(self, user_id: int, limit: int = 50) -> List[ConversationLog]:
        result = await self.db.execute(
            select(ConversationLog)
            .where(ConversationLog.user_id == user_id)
            .order_by(ConversationLog.created_at.desc())
            .limit(limit)
        )
        logs = list(result.scalars().all())
        return list(reversed(logs))
    
    async def get_context(self, user_id: int, limit: int = 10) -> str:
        logs = await self.get_recent_by_user(user_id, limit)
        context = []
        for log in logs:
            role_prefix = "Usuário" if log.role == MessageRole.USER else "Assistente"
            context.append(f"{role_prefix}: {log.message}")
        return "\n".join(context)
