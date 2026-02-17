from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class SubscriptionCreate(BaseModel):
    plan: str = Field(..., min_length=1, max_length=50)
    status: str = Field(default="active", max_length=50)
    stripe_customer_id: Optional[str] = Field(None, max_length=255)


class SubscriptionResponse(BaseModel):
    id: int
    user_id: int
    plan: str
    status: str
    stripe_customer_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
