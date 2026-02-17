from sqlalchemy import Column, Integer, String, Numeric, Boolean, JSON, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class Plan(Base):
    __tablename__ = "plans"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    slug = Column(String(50), unique=True, nullable=False, index=True)
    price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="BRL", nullable=False)
    billing_cycle = Column(String(20), default="monthly", nullable=False)
    features = Column(JSON, nullable=False)
    transaction_limit = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
