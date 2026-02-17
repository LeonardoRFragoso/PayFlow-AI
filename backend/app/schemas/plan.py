from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, Optional
from decimal import Decimal


class PlanCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=50)
    price: Decimal = Field(..., ge=0, decimal_places=2)
    currency: str = Field(default="BRL", max_length=3)
    billing_cycle: str = Field(default="monthly", max_length=20)
    features: Dict
    transaction_limit: Optional[int] = None
    is_active: bool = True


class PlanUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    price: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    features: Optional[Dict] = None
    transaction_limit: Optional[int] = None
    is_active: Optional[bool] = None


class PlanResponse(BaseModel):
    id: int
    name: str
    slug: str
    price: Decimal
    currency: str
    billing_cycle: str
    features: Dict
    transaction_limit: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
