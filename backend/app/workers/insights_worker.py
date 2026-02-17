import asyncio
from app.core.database import AsyncSessionLocal
from app.integrations.twilio_whatsapp import TwilioWhatsAppService
from app.services.insights_service import FinancialInsightsService
from app.repositories.user_repository import UserRepository
from app.core.logging import logger


async def send_insights_async(user_id: int):
    async with AsyncSessionLocal() as db:
        try:
            user_repo = UserRepository(db)
            user = await user_repo.get_by_id(user_id)
            
            if not user:
                logger.error(f"User {user_id} not found")
                return
            
            insights_service = FinancialInsightsService(db)
            insights = await insights_service.generate_insights(user_id)
            
            if not insights:
                logger.info(f"No insights generated for user {user_id}")
                return
            
            message = "📊 *Insights Financeiros Semanais*\n\n"
            
            for insight in insights:
                emoji = "🔴" if insight.severity == "high" else "🟡" if insight.severity == "medium" else "🟢"
                message += f"{emoji} {insight.message}\n\n"
            
            message += "💡 Acesse o dashboard para mais detalhes!"
            
            twilio_service = TwilioWhatsAppService()
            await twilio_service.send_message(f"whatsapp:{user.phone_number}", message)
            
            logger.info(f"Sent weekly insights to user {user_id}")
            
        except Exception as e:
            logger.error(f"Error sending insights: {str(e)}", exc_info=True)


def send_weekly_insights(user_id: int):
    asyncio.run(send_insights_async(user_id))
