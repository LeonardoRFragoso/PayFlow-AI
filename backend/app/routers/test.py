from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.core.database import get_db
from app.integrations.twilio_whatsapp import TwilioWhatsAppService
from app.core.logging import logger

router = APIRouter(prefix="/test", tags=["Test"])


class WhatsAppTestMessage(BaseModel):
    to: str
    message: str


@router.post("/send-whatsapp")
async def test_send_whatsapp(
    data: WhatsAppTestMessage,
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint de teste para enviar mensagem WhatsApp via Twilio.
    
    Exemplo:
    {
        "to": "+5521999999999",
        "message": "Olá! Esta é uma mensagem de teste."
    }
    """
    try:
        twilio_service = TwilioWhatsAppService()
        success = await twilio_service.send_message(data.to, data.message)
        
        if success:
            logger.info(f"Test message sent successfully to {data.to}")
            return {
                "success": True,
                "message": "Mensagem enviada com sucesso!",
                "to": data.to
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Falha ao enviar mensagem. Verifique os logs."
            )
            
    except Exception as e:
        logger.error(f"Error in test endpoint: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao enviar mensagem: {str(e)}"
        )


@router.get("/twilio-status")
async def check_twilio_status():
    """
    Verifica se as credenciais do Twilio estão configuradas.
    """
    try:
        from app.core.config import settings
        
        has_account_sid = bool(settings.TWILIO_ACCOUNT_SID and 
                              settings.TWILIO_ACCOUNT_SID != "your_twilio_account_sid")
        has_auth_token = bool(settings.TWILIO_AUTH_TOKEN and 
                             settings.TWILIO_AUTH_TOKEN != "your_twilio_auth_token")
        has_whatsapp_number = bool(settings.TWILIO_WHATSAPP_NUMBER)
        
        return {
            "configured": has_account_sid and has_auth_token and has_whatsapp_number,
            "account_sid_set": has_account_sid,
            "auth_token_set": has_auth_token,
            "whatsapp_number_set": has_whatsapp_number,
            "whatsapp_number": settings.TWILIO_WHATSAPP_NUMBER if has_whatsapp_number else None
        }
        
    except Exception as e:
        logger.error(f"Error checking Twilio status: {str(e)}")
        return {
            "configured": False,
            "error": str(e)
        }
