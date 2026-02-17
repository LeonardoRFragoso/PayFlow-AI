from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict
from decimal import Decimal


class PaymentEventCreate(BaseModel):
    mp_payment_id: Optional[str] = None
    mp_subscription_id: Optional[str] = None
    status: str
    event_type: str
    amount: Optional[Decimal] = None
    currency: Optional[str] = "BRL"
    payment_method: Optional[str] = None
    raw_data: Optional[Dict] = None


class PaymentEventResponse(BaseModel):
    id: int
    user_id: int
    mp_payment_id: Optional[str]
    mp_subscription_id: Optional[str]
    status: str
    event_type: str
    amount: Optional[Decimal]
    currency: Optional[str]
    payment_method: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class CheckoutRequest(BaseModel):
    plan_id: int
    payment_method: str = "credit_card"


class CheckoutResponse(BaseModel):
    checkout_url: str
    subscription_id: str
    init_point: str
