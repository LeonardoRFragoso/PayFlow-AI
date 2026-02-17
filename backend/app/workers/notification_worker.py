import asyncio
from app.core.database import AsyncSessionLocal
from app.integrations.twilio_whatsapp import TwilioWhatsAppService
from app.repositories.user_repository import UserRepository
from app.core.logging import logger


async def send_notification_async(user_id: int, message: str, notification_type: str):
    async with AsyncSessionLocal() as db:
        try:
            user_repo = UserRepository(db)
            user = await user_repo.get_by_id(user_id)
            
            if not user:
                logger.error(f"User {user_id} not found")
                return
            
            twilio_service = TwilioWhatsAppService()
            await twilio_service.send_message(f"whatsapp:{user.phone_number}", message)
            
            logger.info(f"Sent {notification_type} notification to user {user_id}")
            
        except Exception as e:
            logger.error(f"Error sending notification: {str(e)}", exc_info=True)


def send_notification(user_id: int, message: str, notification_type: str):
    asyncio.run(send_notification_async(user_id, message, notification_type))
