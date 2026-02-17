from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class PaymentEvent(Base):
    __tablename__ = "payment_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    mp_payment_id = Column(String(255), unique=True, nullable=True, index=True)
    mp_subscription_id = Column(String(255), nullable=True, index=True)
    status = Column(String(50), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    amount = Column(Numeric(10, 2), nullable=True)
    currency = Column(String(3), default="BRL", nullable=True)
    payment_method = Column(String(50), nullable=True)
    raw_data = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    user = relationship("User", backref="payment_events")
