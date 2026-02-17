from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.models.conversation_state import ConversationState


class ConversationStateRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_or_create(self, user_id: int) -> ConversationState:
        result = await self.db.execute(
            select(ConversationState).where(ConversationState.user_id == user_id)
        )
        state = result.scalar_one_or_none()
        
        if not state:
            state = ConversationState(user_id=user_id)
            self.db.add(state)
            await self.db.commit()
            await self.db.refresh(state)
        
        return state
    
    async def update_state(
        self,
        user_id: int,
        current_intent: Optional[str] = None,
        pending_field: Optional[str] = None,
        context_data: Optional[dict] = None
    ) -> ConversationState:
        state = await self.get_or_create(user_id)
        
        if current_intent is not None:
            state.current_intent = current_intent
        if pending_field is not None:
            state.pending_field = pending_field
        if context_data is not None:
            state.context_data = context_data
        
        await self.db.commit()
        await self.db.refresh(state)
        return state
    
    async def clear_state(self, user_id: int) -> None:
        state = await self.get_or_create(user_id)
        state.current_intent = None
        state.pending_field = None
        state.context_data = None
        await self.db.commit()
