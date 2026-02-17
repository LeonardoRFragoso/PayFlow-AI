from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract
from datetime import datetime
from app.repositories.subscription_repository import SubscriptionRepository
from app.repositories.plan_repository import PlanRepository
from app.repositories.transaction_repository import TransactionRepository
from app.repositories.user_event_repository import UserEventRepository
from app.core.logging import logger


class PlanLimitService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.subscription_repo = SubscriptionRepository(db)
        self.plan_repo = PlanRepository(db)
        self.transaction_repo = TransactionRepository(db)
        self.event_repo = UserEventRepository(db)
    
    async def check_transaction_limit(self, user_id: int) -> tuple[bool, str]:
        try:
            subscription = await self.subscription_repo.get_by_user_id(user_id)
            
            if not subscription or subscription.status != "active":
                return False, "Assinatura inativa. Ative sua assinatura para continuar."
            
            if not subscription.plan_id:
                if subscription.plan == "free":
                    return await self._check_free_plan_limit(user_id)
                return True, ""
            
            plan = await self.plan_repo.get_by_id(subscription.plan_id)
            
            if not plan:
                return True, ""
            
            if plan.transaction_limit is None:
                return True, ""
            
            now = datetime.now()
            month_start = datetime(now.year, now.month, 1).date()
            
            transactions = await self.transaction_repo.get_by_month(
                user_id, now.year, now.month
            )
            
            current_count = len(transactions)
            
            if current_count >= plan.transaction_limit:
                await self.event_repo.create(
                    user_id,
                    "limit_reached",
                    {"plan": plan.name, "limit": plan.transaction_limit, "current": current_count}
                )
                
                return False, f"""⚠️ Limite atingido!

Você atingiu o limite de {plan.transaction_limit} transações do plano {plan.name}.

💎 Faça upgrade para o plano Pro e tenha transações ilimitadas!
👉 Acesse: {self._get_upgrade_url()}"""
            
            return True, ""
            
        except Exception as e:
            logger.error(f"Error checking transaction limit: {str(e)}")
            return True, ""
    
    async def _check_free_plan_limit(self, user_id: int) -> tuple[bool, str]:
        FREE_PLAN_LIMIT = 20
        
        now = datetime.now()
        transactions = await self.transaction_repo.get_by_month(
            user_id, now.year, now.month
        )
        
        current_count = len(transactions)
        
        if current_count >= FREE_PLAN_LIMIT:
            await self.event_repo.create(
                user_id,
                "limit_reached",
                {"plan": "free", "limit": FREE_PLAN_LIMIT, "current": current_count}
            )
            
            return False, f"""⚠️ Limite do Plano Gratuito Atingido!

Você atingiu o limite de {FREE_PLAN_LIMIT} transações mensais.

💎 Faça upgrade para o Plano Pro:
✅ Transações ilimitadas
✅ Insights avançados
✅ Suporte prioritário
✅ Apenas R$ 29,90/mês

👉 Acesse: {self._get_upgrade_url()}"""
        
        remaining = FREE_PLAN_LIMIT - current_count
        
        if remaining <= 5:
            warning = f"""⚠️ Atenção!

Você tem apenas {remaining} transações restantes no plano gratuito este mês.

Considere fazer upgrade para o Plano Pro! 💎"""
            return True, warning
        
        return True, ""
    
    async def get_usage_stats(self, user_id: int) -> dict:
        subscription = await self.subscription_repo.get_by_user_id(user_id)
        
        if not subscription:
            return {
                "plan": "none",
                "limit": 0,
                "used": 0,
                "remaining": 0,
                "percentage": 0
            }
        
        now = datetime.now()
        transactions = await self.transaction_repo.get_by_month(
            user_id, now.year, now.month
        )
        
        used = len(transactions)
        
        if subscription.plan_id:
            plan = await self.plan_repo.get_by_id(subscription.plan_id)
            limit = plan.transaction_limit if plan and plan.transaction_limit else None
        else:
            limit = 20 if subscription.plan == "free" else None
        
        if limit is None:
            return {
                "plan": subscription.plan,
                "limit": "unlimited",
                "used": used,
                "remaining": "unlimited",
                "percentage": 0
            }
        
        remaining = max(0, limit - used)
        percentage = (used / limit * 100) if limit > 0 else 0
        
        return {
            "plan": subscription.plan,
            "limit": limit,
            "used": used,
            "remaining": remaining,
            "percentage": round(percentage, 1)
        }
    
    def _get_upgrade_url(self) -> str:
        from app.core.config import settings
        return f"{settings.FRONTEND_URL}/plans"
