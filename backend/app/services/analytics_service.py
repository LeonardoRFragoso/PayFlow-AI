from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case, distinct
from typing import Dict, Optional
from datetime import datetime, timedelta
from decimal import Decimal
from app.repositories.user_event_repository import UserEventRepository
from app.repositories.user_repository import UserRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.repositories.payment_repository import PaymentRepository
from app.models.user import User
from app.models.subscription import Subscription
from app.models.payment_event import PaymentEvent
from app.core.logging import logger


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.event_repo = UserEventRepository(db)
        self.user_repo = UserRepository(db)
        self.subscription_repo = SubscriptionRepository(db)
        self.payment_repo = PaymentRepository(db)
    
    async def track_event(
        self, 
        user_id: int, 
        event_type: str, 
        event_data: Optional[Dict] = None
    ) -> None:
        try:
            await self.event_repo.create(user_id, event_type, event_data)
            logger.info(f"Event tracked: {event_type} for user {user_id}")
        except Exception as e:
            logger.error(f"Error tracking event: {str(e)}")
    
    async def get_conversion_rate(self) -> Dict:
        try:
            total_users_result = await self.db.execute(select(func.count(User.id)))
            total_users = total_users_result.scalar_one()
            
            pro_users_result = await self.db.execute(
                select(func.count(Subscription.id))
                .where(
                    and_(
                        Subscription.status == "active",
                        Subscription.plan == "pro"
                    )
                )
            )
            pro_users = pro_users_result.scalar_one()
            
            conversion_rate = (pro_users / total_users * 100) if total_users > 0 else 0
            
            return {
                "total_users": total_users,
                "pro_users": pro_users,
                "free_users": total_users - pro_users,
                "conversion_rate": round(conversion_rate, 2)
            }
        except Exception as e:
            logger.error(f"Error calculating conversion rate: {str(e)}")
            return {
                "total_users": 0,
                "pro_users": 0,
                "free_users": 0,
                "conversion_rate": 0
            }
    
    async def get_retention_rate(self, days: int = 30) -> Dict:
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            users_created_result = await self.db.execute(
                select(func.count(User.id))
                .where(User.created_at <= cutoff_date)
            )
            users_created = users_created_result.scalar_one()
            
            active_users = await self.event_repo.get_unique_users_by_event(
                "first_transaction",
                start_date=datetime.now() - timedelta(days=7)
            )
            
            retention_rate = (active_users / users_created * 100) if users_created > 0 else 0
            
            return {
                "period_days": days,
                "users_created": users_created,
                "active_users": active_users,
                "retention_rate": round(retention_rate, 2)
            }
        except Exception as e:
            logger.error(f"Error calculating retention rate: {str(e)}")
            return {
                "period_days": days,
                "users_created": 0,
                "active_users": 0,
                "retention_rate": 0
            }
    
    async def get_churn_rate(self) -> Dict:
        try:
            now = datetime.now()
            month_start = datetime(now.year, now.month, 1)
            
            if now.month == 1:
                last_month_start = datetime(now.year - 1, 12, 1)
            else:
                last_month_start = datetime(now.year, now.month - 1, 1)
            
            active_last_month_result = await self.db.execute(
                select(func.count(Subscription.id))
                .where(
                    and_(
                        Subscription.status == "active",
                        Subscription.created_at < month_start
                    )
                )
            )
            active_last_month = active_last_month_result.scalar_one()
            
            churned_this_month = await self.event_repo.count_by_type(
                "subscription_cancelled",
                start_date=month_start
            )
            
            churn_rate = (churned_this_month / active_last_month * 100) if active_last_month > 0 else 0
            
            return {
                "active_last_month": active_last_month,
                "churned_this_month": churned_this_month,
                "churn_rate": round(churn_rate, 2)
            }
        except Exception as e:
            logger.error(f"Error calculating churn rate: {str(e)}")
            return {
                "active_last_month": 0,
                "churned_this_month": 0,
                "churn_rate": 0
            }
    
    async def get_ltv_estimate(self) -> Dict:
        try:
            avg_subscription_months = 12
            monthly_price = Decimal("29.90")
            
            churn_data = await self.get_churn_rate()
            churn_rate = churn_data["churn_rate"]
            
            if churn_rate > 0:
                avg_lifetime_months = 1 / (churn_rate / 100)
            else:
                avg_lifetime_months = avg_subscription_months
            
            ltv = monthly_price * Decimal(str(avg_lifetime_months))
            
            return {
                "monthly_price": float(monthly_price),
                "avg_lifetime_months": round(avg_lifetime_months, 2),
                "estimated_ltv": round(float(ltv), 2),
                "churn_rate_used": churn_rate
            }
        except Exception as e:
            logger.error(f"Error calculating LTV: {str(e)}")
            return {
                "monthly_price": 29.90,
                "avg_lifetime_months": 12,
                "estimated_ltv": 358.80,
                "churn_rate_used": 0
            }
    
    async def get_funnel_metrics(self) -> Dict:
        try:
            total_registrations = await self.event_repo.count_by_type("user_registered")
            
            whatsapp_connected = await self.event_repo.count_by_type("whatsapp_connected")
            
            first_transaction = await self.event_repo.count_by_type("first_transaction")
            
            upgrade_clicked = await self.event_repo.count_by_type("upgrade_clicked")
            
            checkout_started = await self.event_repo.count_by_type("checkout_started")
            
            payment_success = await self.event_repo.count_by_type("payment_success")
            
            return {
                "total_registrations": total_registrations,
                "whatsapp_connected": whatsapp_connected,
                "first_transaction": first_transaction,
                "upgrade_clicked": upgrade_clicked,
                "checkout_started": checkout_started,
                "payment_success": payment_success,
                "conversion_rates": {
                    "registration_to_whatsapp": round((whatsapp_connected / total_registrations * 100) if total_registrations > 0 else 0, 2),
                    "whatsapp_to_transaction": round((first_transaction / whatsapp_connected * 100) if whatsapp_connected > 0 else 0, 2),
                    "upgrade_to_checkout": round((checkout_started / upgrade_clicked * 100) if upgrade_clicked > 0 else 0, 2),
                    "checkout_to_payment": round((payment_success / checkout_started * 100) if checkout_started > 0 else 0, 2),
                    "overall_free_to_pro": round((payment_success / total_registrations * 100) if total_registrations > 0 else 0, 2)
                }
            }
        except Exception as e:
            logger.error(f"Error calculating funnel metrics: {str(e)}")
            return {
                "total_registrations": 0,
                "whatsapp_connected": 0,
                "first_transaction": 0,
                "upgrade_clicked": 0,
                "checkout_started": 0,
                "payment_success": 0,
                "conversion_rates": {}
            }
    
    async def get_cohort_retention(self) -> Dict:
        try:
            cohorts = []
            
            for weeks_ago in range(8):
                week_start = datetime.now() - timedelta(weeks=weeks_ago + 1)
                week_end = week_start + timedelta(days=7)
                
                users_result = await self.db.execute(
                    select(User.id)
                    .where(
                        and_(
                            User.created_at >= week_start,
                            User.created_at < week_end
                        )
                    )
                )
                user_ids = [row[0] for row in users_result.all()]
                cohort_size = len(user_ids)
                
                if cohort_size == 0:
                    continue
                
                day_7_start = week_start + timedelta(days=7)
                day_7_end = day_7_start + timedelta(days=7)
                
                active_7_days_result = await self.db.execute(
                    select(func.count(func.distinct(self.db.query(UserEvent.user_id))))
                    .select_from(UserEvent)
                    .where(
                        and_(
                            UserEvent.user_id.in_(user_ids),
                            UserEvent.created_at >= day_7_start,
                            UserEvent.created_at < day_7_end
                        )
                    )
                )
                active_7_days = active_7_days_result.scalar_one() if active_7_days_result else 0
                
                day_30_start = week_start + timedelta(days=30)
                day_30_end = day_30_start + timedelta(days=7)
                
                active_30_days_result = await self.db.execute(
                    select(func.count(func.distinct(UserEvent.user_id)))
                    .where(
                        and_(
                            UserEvent.user_id.in_(user_ids),
                            UserEvent.created_at >= day_30_start,
                            UserEvent.created_at < day_30_end
                        )
                    )
                )
                active_30_days = active_30_days_result.scalar_one() if active_30_days_result else 0
                
                cohorts.append({
                    "week_start": week_start.strftime("%Y-%m-%d"),
                    "cohort_size": cohort_size,
                    "active_7_days": active_7_days,
                    "active_30_days": active_30_days,
                    "retention_7_days": round((active_7_days / cohort_size * 100) if cohort_size > 0 else 0, 2),
                    "retention_30_days": round((active_30_days / cohort_size * 100) if cohort_size > 0 else 0, 2)
                })
            
            return {"cohorts": cohorts}
        except Exception as e:
            logger.error(f"Error calculating cohort retention: {str(e)}")
            return {"cohorts": []}
