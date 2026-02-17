import mercadopago
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from app.core.config import settings
from app.core.logging import logger


class MercadoPagoService:
    def __init__(self):
        self.sdk = mercadopago.SDK(settings.MERCADO_PAGO_ACCESS_TOKEN)
    
    def create_subscription(
        self, 
        user_email: str, 
        plan_price: float,
        plan_name: str,
        user_id: int
    ) -> Dict[str, Any]:
        try:
            subscription_data = {
                "reason": plan_name,
                "auto_recurring": {
                    "frequency": 1,
                    "frequency_type": "months",
                    "transaction_amount": plan_price,
                    "currency_id": "BRL"
                },
                "back_url": f"{settings.FRONTEND_URL}/dashboard",
                "payer_email": user_email,
                "external_reference": str(user_id),
                "status": "pending"
            }
            
            response = self.sdk.preapproval().create(subscription_data)
            
            if response["status"] == 201:
                logger.info(f"Subscription created for user {user_id}: {response['response']['id']}")
                return {
                    "success": True,
                    "subscription_id": response["response"]["id"],
                    "init_point": response["response"]["init_point"],
                    "sandbox_init_point": response["response"].get("sandbox_init_point")
                }
            else:
                logger.error(f"Failed to create subscription: {response}")
                return {"success": False, "error": response}
                
        except Exception as e:
            logger.error(f"Error creating subscription: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def create_payment_preference(
        self,
        title: str,
        quantity: int,
        unit_price: float,
        payer_email: str,
        external_reference: str
    ) -> Dict[str, Any]:
        try:
            preference_data = {
                "items": [
                    {
                        "title": title,
                        "quantity": quantity,
                        "unit_price": unit_price,
                        "currency_id": "BRL"
                    }
                ],
                "payer": {
                    "email": payer_email
                },
                "back_urls": {
                    "success": f"{settings.FRONTEND_URL}/payment/success",
                    "failure": f"{settings.FRONTEND_URL}/payment/failure",
                    "pending": f"{settings.FRONTEND_URL}/payment/pending"
                },
                "auto_return": "approved",
                "external_reference": external_reference,
                "notification_url": f"{settings.BACKEND_URL}/webhook/mercado-pago",
                "statement_descriptor": "ASSISTENTE FINANCEIRO"
            }
            
            response = self.sdk.preference().create(preference_data)
            
            if response["status"] == 201:
                return {
                    "success": True,
                    "preference_id": response["response"]["id"],
                    "init_point": response["response"]["init_point"],
                    "sandbox_init_point": response["response"].get("sandbox_init_point")
                }
            else:
                logger.error(f"Failed to create preference: {response}")
                return {"success": False, "error": response}
                
        except Exception as e:
            logger.error(f"Error creating preference: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def get_payment(self, payment_id: str) -> Optional[Dict[str, Any]]:
        try:
            response = self.sdk.payment().get(payment_id)
            if response["status"] == 200:
                return response["response"]
            return None
        except Exception as e:
            logger.error(f"Error getting payment {payment_id}: {str(e)}")
            return None
    
    def get_subscription(self, subscription_id: str) -> Optional[Dict[str, Any]]:
        try:
            response = self.sdk.preapproval().get(subscription_id)
            if response["status"] == 200:
                return response["response"]
            return None
        except Exception as e:
            logger.error(f"Error getting subscription {subscription_id}: {str(e)}")
            return None
    
    def cancel_subscription(self, subscription_id: str) -> bool:
        try:
            response = self.sdk.preapproval().update(subscription_id, {"status": "cancelled"})
            return response["status"] == 200
        except Exception as e:
            logger.error(f"Error cancelling subscription {subscription_id}: {str(e)}")
            return False
    
    def validate_webhook_signature(self, data: Dict, headers: Dict) -> bool:
        try:
            x_signature = headers.get("x-signature")
            x_request_id = headers.get("x-request-id")
            
            if not x_signature or not x_request_id:
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating webhook signature: {str(e)}")
            return False
    
    def process_webhook_notification(self, notification_data: Dict) -> Dict[str, Any]:
        try:
            notification_type = notification_data.get("type")
            
            if notification_type == "payment":
                payment_id = notification_data.get("data", {}).get("id")
                if payment_id:
                    payment_info = self.get_payment(str(payment_id))
                    return {
                        "type": "payment",
                        "data": payment_info,
                        "status": payment_info.get("status") if payment_info else None
                    }
            
            elif notification_type == "subscription_preapproval":
                subscription_id = notification_data.get("data", {}).get("id")
                if subscription_id:
                    subscription_info = self.get_subscription(str(subscription_id))
                    return {
                        "type": "subscription",
                        "data": subscription_info,
                        "status": subscription_info.get("status") if subscription_info else None
                    }
            
            return {"type": "unknown", "data": notification_data}
            
        except Exception as e:
            logger.error(f"Error processing webhook: {str(e)}")
            return {"type": "error", "error": str(e)}
