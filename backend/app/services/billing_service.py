from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from app.integrations.mercado_pago import MercadoPagoService
from app.repositories.subscription_repository import SubscriptionRepository
from app.repositories.payment_repository import PaymentRepository
from app.repositories.plan_repository import PlanRepository
from app.repositories.user_event_repository import UserEventRepository
from app.schemas.payment import PaymentEventCreate, CheckoutResponse
from app.core.logging import logger


class BillingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.mp_service = MercadoPagoService()
        self.subscription_repo = SubscriptionRepository(db)
        self.payment_repo = PaymentRepository(db)
        self.plan_repo = PlanRepository(db)
        self.event_repo = UserEventRepository(db)
    
    async def create_checkout(
        self,
        user_id: int,
        user_email: str,
        plan_id: int
    ) -> Optional[CheckoutResponse]:
        try:
            plan = await self.plan_repo.get_by_id(plan_id)
            if not plan or not plan.is_active:
                logger.error(f"Plan {plan_id} not found or inactive")
                return None
            
            result = self.mp_service.create_subscription(
                user_email=user_email,
                plan_price=float(plan.price),
                plan_name=plan.name,
                user_id=user_id
            )
            
            if result.get("success"):
                subscription = await self.subscription_repo.get_by_user_id(user_id)
                if subscription:
                    subscription.mp_preapproval_id = result["subscription_id"]
                    subscription.status = "pending"
                    await self.db.commit()
                
                await self.event_repo.create(
                    user_id,
                    "checkout_started",
                    {"plan_id": plan_id, "plan_name": plan.name, "price": float(plan.price)}
                )
                
                return CheckoutResponse(
                    checkout_url=result.get("init_point", result.get("sandbox_init_point", "")),
                    subscription_id=result["subscription_id"],
                    init_point=result.get("init_point", result.get("sandbox_init_point", ""))
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Error creating checkout: {str(e)}")
            return None
    
    async def process_payment_webhook(
        self,
        notification_data: Dict[str, Any]
    ) -> bool:
        try:
            processed = self.mp_service.process_webhook_notification(notification_data)
            
            if processed["type"] == "payment":
                payment_data = processed["data"]
                if not payment_data:
                    return False
                
                external_ref = payment_data.get("external_reference")
                if not external_ref:
                    return False
                
                user_id = int(external_ref)
                
                event_data = PaymentEventCreate(
                    mp_payment_id=str(payment_data.get("id")),
                    status=payment_data.get("status"),
                    event_type="payment",
                    amount=payment_data.get("transaction_amount"),
                    currency=payment_data.get("currency_id"),
                    payment_method=payment_data.get("payment_method_id"),
                    raw_data=payment_data
                )
                
                await self.payment_repo.create(user_id, event_data)
                
                if payment_data.get("status") == "approved":
                    await self._activate_subscription(user_id)
                    await self.event_repo.create(
                        user_id,
                        "payment_success",
                        {"amount": payment_data.get("transaction_amount"), "payment_id": str(payment_data.get("id"))}
                    )
                elif payment_data.get("status") in ["rejected", "cancelled"]:
                    await self.event_repo.create(
                        user_id,
                        "payment_failed",
                        {"status": payment_data.get("status"), "payment_id": str(payment_data.get("id"))}
                    )
                
                return True
            
            elif processed["type"] == "subscription":
                subscription_data = processed["data"]
                if not subscription_data:
                    return False
                
                external_ref = subscription_data.get("external_reference")
                if not external_ref:
                    return False
                
                user_id = int(external_ref)
                
                event_data = PaymentEventCreate(
                    mp_subscription_id=str(subscription_data.get("id")),
                    status=subscription_data.get("status"),
                    event_type="subscription",
                    raw_data=subscription_data
                )
                
                await self.payment_repo.create(user_id, event_data)
                
                if subscription_data.get("status") == "authorized":
                    await self._activate_subscription(user_id)
                elif subscription_data.get("status") in ["cancelled", "paused"]:
                    await self._deactivate_subscription(user_id)
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error processing payment webhook: {str(e)}")
            return False
    
    async def _activate_subscription(self, user_id: int) -> None:
        subscription = await self.subscription_repo.get_by_user_id(user_id)
        if subscription:
            subscription.status = "active"
            subscription.current_period_start = datetime.now().date()
            subscription.current_period_end = (datetime.now() + timedelta(days=30)).date()
            await self.db.commit()
            logger.info(f"Subscription activated for user {user_id}")
    
    async def _deactivate_subscription(self, user_id: int) -> None:
        subscription = await self.subscription_repo.get_by_user_id(user_id)
        if subscription:
            subscription.status = "inactive"
            await self.db.commit()
            logger.info(f"Subscription deactivated for user {user_id}")
    
    async def cancel_subscription(self, user_id: int) -> bool:
        try:
            subscription = await self.subscription_repo.get_by_user_id(user_id)
            if not subscription or not subscription.mp_preapproval_id:
                return False
            
            success = self.mp_service.cancel_subscription(subscription.mp_preapproval_id)
            
            if success:
                await self._deactivate_subscription(user_id)
                await self.event_repo.create(
                    user_id,
                    "subscription_cancelled",
                    {"plan": subscription.plan}
                )
            
            return success
            
        except Exception as e:
            logger.error(f"Error cancelling subscription: {str(e)}")
            return False
