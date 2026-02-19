from pydantic import BaseModel, Field, field_validator
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from app.models.transaction import TransactionType, PaymentMethod


class TransactionCreate(BaseModel):
    type: TransactionType
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    category: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    payment_method: PaymentMethod = PaymentMethod.CONTA_CORRENTE
    affects_balance: bool = True
    date: date
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError('Amount must be greater than 0')
        return round(v, 2)


class TransactionUpdate(BaseModel):
    type: Optional[TransactionType] = None
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    payment_method: Optional[PaymentMethod] = None
    affects_balance: Optional[bool] = None
    date: Optional[date] = None


class TransactionResponse(BaseModel):
    id: int
    user_id: int
    type: TransactionType
    amount: Decimal
    category: str
    description: Optional[str]
    payment_method: PaymentMethod
    affects_balance: bool
    date: date
    created_at: datetime
    
    class Config:
        from_attributes = True
