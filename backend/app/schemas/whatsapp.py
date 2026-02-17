from pydantic import BaseModel, Field
from typing import Optional


class WhatsAppMessage(BaseModel):
    From: str = Field(..., alias="From")
    Body: str = Field(..., alias="Body")
    MessageSid: Optional[str] = Field(None, alias="MessageSid")
    
    class Config:
        populate_by_name = True


class WhatsAppResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
