from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List
from datetime import datetime, timedelta
from app.repositories.user_repository import UserRepository
from app.repositories.user_event_repository import UserEventRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.integrations.twilio_whatsapp import TwilioWhatsAppService
from app.core.logging import logger
from app.models.user import User
from app.models.subscription import Subscription


class RetentionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.event_repo = UserEventRepository(db)
        self.subscription_repo = SubscriptionRepository(db)
        self.twilio_service = TwilioWhatsAppService()
    
    async def detect_inactive_users(self, days: int = 7) -> List[User]:
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            result = await self.db.execute(
                select(User)
                .outerjoin(User.events)
                .group_by(User.id)
                .having(
                    func.max(User.events.c.created_at) < cutoff_date
                )
            )
            
            return list(result.scalars().all())
        except Exception as e:
            logger.error(f"Error detecting inactive users: {str(e)}")
            return []
    
    async def detect_expiring_subscriptions(self, days_before: int = 3) -> List[Subscription]:
        try:
            target_date = datetime.now().date() + timedelta(days=days_before)
            
            result = await self.db.execute(
                select(Subscription)
                .where(
                    and_(
                        Subscription.status == "active",
                        Subscription.current_period_end == target_date
                    )
                )
            )
            
            return list(result.scalars().all())
        except Exception as e:
            logger.error(f"Error detecting expiring subscriptions: {str(e)}")
            return []
    
    async def send_reactivation_message(self, user: User) -> bool:
        try:
            message = f"""👋 Olá {user.name}!

Sentimos sua falta! 😊

Notamos que você não usa o Assistente Financeiro há alguns dias.

💡 Lembre-se que você pode:
✅ Registrar despesas e receitas
📊 Ver relatórios financeiros
📅 Criar lembretes
💰 Controlar seu dinheiro facilmente

Volte quando quiser! Estamos aqui para ajudar. 💚"""
            
            await self.twilio_service.send_message(
                f"whatsapp:{user.phone_number}",
                message
            )
            
            await self.event_repo.create(
                user.id,
                "reactivation_message_sent",
                {"reason": "inactive_user"}
            )
            
            logger.info(f"Reactivation message sent to user {user.id}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending reactivation message: {str(e)}")
            return False
    
    async def send_renewal_reminder(self, subscription: Subscription) -> bool:
        try:
            user = await self.user_repo.get_by_id(subscription.user_id)
            if not user:
                return False
            
            days_left = (subscription.current_period_end - datetime.now().date()).days
            
            message = f"""⏰ Lembrete de Renovação

Olá {user.name}!

Sua assinatura Pro vence em {days_left} dias ({subscription.current_period_end.strftime('%d/%m/%Y')}).

💎 Continue aproveitando:
✅ Transações ilimitadas
📊 Insights avançados
🎯 Suporte prioritário

Sua renovação será automática. Caso queira cancelar, acesse o dashboard.

Obrigado por confiar em nós! 💚"""
            
            await self.twilio_service.send_message(
                f"whatsapp:{user.phone_number}",
                message
            )
            
            await self.event_repo.create(
                user.id,
                "renewal_reminder_sent",
                {"days_left": days_left}
            )
            
            logger.info(f"Renewal reminder sent to user {user.id}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending renewal reminder: {str(e)}")
            return False
    
    async def send_cancellation_feedback(self, user_id: int) -> bool:
        try:
            user = await self.user_repo.get_by_id(user_id)
            if not user:
                return False
            
            message = f"""😢 Sentimos muito ver você partir, {user.name}

Sua assinatura foi cancelada com sucesso.

Gostaríamos muito de saber:
❓ O que poderíamos ter feito melhor?

Você ainda pode usar o plano gratuito:
✅ 20 transações por mês
📊 Dashboard básico
💬 WhatsApp integrado

Volte sempre que quiser! 💚"""
            
            await self.twilio_service.send_message(
                f"whatsapp:{user.phone_number}",
                message
            )
            
            await self.event_repo.create(
                user_id,
                "cancellation_feedback_sent",
                {}
            )
            
            logger.info(f"Cancellation feedback sent to user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending cancellation feedback: {str(e)}")
            return False
    
    async def send_limit_reached_upgrade(self, user_id: int, current_count: int, limit: int) -> bool:
        try:
            user = await self.user_repo.get_by_id(user_id)
            if not user:
                return False
            
            message = f"""⚠️ Limite Atingido!

Olá {user.name}!

Você atingiu {current_count} de {limit} transações do plano gratuito este mês.

💎 Faça upgrade para o Plano Pro:
✅ Transações ILIMITADAS
📊 Insights avançados com IA
🎯 Suporte prioritário
💰 Apenas R$ 29,90/mês

👉 Acesse: https://seudominio.com/plans

Continue controlando suas finanças sem limites! 🚀"""
            
            await self.twilio_service.send_message(
                f"whatsapp:{user.phone_number}",
                message
            )
            
            await self.event_repo.create(
                user_id,
                "limit_reached_upgrade_sent",
                {"current_count": current_count, "limit": limit}
            )
            
            logger.info(f"Limit reached upgrade message sent to user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending limit reached message: {str(e)}")
            return False
    
    async def process_retention_campaigns(self) -> dict:
        results = {
            "inactive_users_contacted": 0,
            "renewal_reminders_sent": 0,
            "errors": 0
        }
        
        try:
            inactive_users = await self.detect_inactive_users(days=7)
            for user in inactive_users[:10]:
                if await self.send_reactivation_message(user):
                    results["inactive_users_contacted"] += 1
                else:
                    results["errors"] += 1
            
            expiring_subs = await self.detect_expiring_subscriptions(days_before=3)
            for subscription in expiring_subs:
                if await self.send_renewal_reminder(subscription):
                    results["renewal_reminders_sent"] += 1
                else:
                    results["errors"] += 1
            
            logger.info(f"Retention campaigns processed: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Error processing retention campaigns: {str(e)}")
            return results
