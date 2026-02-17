from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.models.plan import Plan
from app.schemas.plan import PlanCreate, PlanUpdate


class PlanRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create(self, plan_data: PlanCreate) -> Plan:
        plan = Plan(**plan_data.model_dump())
        self.db.add(plan)
        await self.db.commit()
        await self.db.refresh(plan)
        return plan
    
    async def get_by_id(self, plan_id: int) -> Optional[Plan]:
        result = await self.db.execute(
            select(Plan).where(Plan.id == plan_id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_slug(self, slug: str) -> Optional[Plan]:
        result = await self.db.execute(
            select(Plan).where(Plan.slug == slug)
        )
        return result.scalar_one_or_none()
    
    async def get_all_active(self) -> List[Plan]:
        result = await self.db.execute(
            select(Plan).where(Plan.is_active == True).order_by(Plan.price)
        )
        return list(result.scalars().all())
    
    async def update(self, plan_id: int, plan_data: PlanUpdate) -> Optional[Plan]:
        plan = await self.get_by_id(plan_id)
        if not plan:
            return None
        
        update_data = plan_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(plan, field, value)
        
        await self.db.commit()
        await self.db.refresh(plan)
        return plan
