from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=True)
    plan = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False, default="active", index=True)
    stripe_customer_id = Column(String(255), unique=True, nullable=True)
    mp_subscription_id = Column(String(255), unique=True, nullable=True, index=True)
    mp_preapproval_id = Column(String(255), unique=True, nullable=True)
    current_period_start = Column(Date, nullable=True)
    current_period_end = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    user = relationship("User", back_populates="subscription")
    plan_obj = relationship("Plan")
