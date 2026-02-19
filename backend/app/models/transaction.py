from sqlalchemy import Column, Integer, String, Numeric, Boolean, ForeignKey, DateTime, Date, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class TransactionType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"


class PaymentMethod(str, enum.Enum):
    CONTA_CORRENTE = "conta_corrente"
    CARTAO_CREDITO = "cartao_credito"
    CARTAO_DEBITO = "cartao_debito"
    PIX = "pix"
    DINHEIRO = "dinheiro"
    OUTROS = "outros"


class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(Enum(TransactionType), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    description = Column(String(500), nullable=True)
    payment_method = Column(Enum(PaymentMethod, values_callable=lambda x: [e.value for e in x]), nullable=False, default=PaymentMethod.CONTA_CORRENTE)
    affects_balance = Column(Boolean, nullable=False, default=True)
    date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    user = relationship("User", back_populates="transactions")
