from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract, and_
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from app.models.transaction import Transaction, TransactionType, PaymentMethod
from app.schemas.transaction import TransactionCreate, TransactionUpdate


class TransactionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create(self, user_id: int, transaction_data: TransactionCreate) -> Transaction:
        transaction = Transaction(
            user_id=user_id,
            type=transaction_data.type,
            amount=transaction_data.amount,
            category=transaction_data.category,
            description=transaction_data.description,
            payment_method=transaction_data.payment_method,
            affects_balance=transaction_data.affects_balance,
            date=transaction_data.date
        )
        self.db.add(transaction)
        await self.db.commit()
        await self.db.refresh(transaction)
        return transaction
    
    async def get_by_id(self, transaction_id: int, user_id: int) -> Optional[Transaction]:
        result = await self.db.execute(
            select(Transaction).where(
                and_(Transaction.id == transaction_id, Transaction.user_id == user_id)
            )
        )
        return result.scalar_one_or_none()
    
    async def get_all_by_user(self, user_id: int, limit: int = 100, offset: int = 0) -> List[Transaction]:
        result = await self.db.execute(
            select(Transaction)
            .where(Transaction.user_id == user_id)
            .order_by(Transaction.date.desc(), Transaction.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())
    
    async def get_by_date_range(
        self, 
        user_id: int, 
        start_date: date, 
        end_date: date
    ) -> List[Transaction]:
        result = await self.db.execute(
            select(Transaction)
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.date >= start_date,
                    Transaction.date <= end_date
                )
            )
            .order_by(Transaction.date.desc())
        )
        return list(result.scalars().all())
    
    async def count_by_month(self, user_id: int, year: int, month: int) -> int:
        result = await self.db.execute(
            select(func.count(Transaction.id))
            .where(
                and_(
                    Transaction.user_id == user_id,
                    extract('year', Transaction.date) == year,
                    extract('month', Transaction.date) == month
                )
            )
        )
        return result.scalar_one()

    async def get_by_month(self, user_id: int, year: int, month: int) -> List[Transaction]:
        result = await self.db.execute(
            select(Transaction)
            .where(
                and_(
                    Transaction.user_id == user_id,
                    extract('year', Transaction.date) == year,
                    extract('month', Transaction.date) == month
                )
            )
            .order_by(Transaction.date.desc())
        )
        return list(result.scalars().all())
    
    async def get_total_by_type(
        self, 
        user_id: int, 
        transaction_type: TransactionType,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Decimal:
        query = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            and_(
                Transaction.user_id == user_id,
                Transaction.type == transaction_type
            )
        )
        
        if start_date:
            query = query.where(Transaction.date >= start_date)
        if end_date:
            query = query.where(Transaction.date <= end_date)
        
        result = await self.db.execute(query)
        return result.scalar_one()
    
    async def get_by_category(
        self, 
        user_id: int, 
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[dict]:
        query = select(
            Transaction.category,
            Transaction.type,
            func.sum(Transaction.amount).label('total')
        ).where(Transaction.user_id == user_id)
        
        if start_date:
            query = query.where(Transaction.date >= start_date)
        if end_date:
            query = query.where(Transaction.date <= end_date)
        
        query = query.group_by(Transaction.category, Transaction.type)
        
        result = await self.db.execute(query)
        return [
            {"category": row.category, "type": row.type, "total": row.total}
            for row in result.all()
        ]
    
    async def get_balance_affecting_total(
        self,
        user_id: int,
        transaction_type: TransactionType,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Decimal:
        query = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            and_(
                Transaction.user_id == user_id,
                Transaction.type == transaction_type,
                Transaction.affects_balance == True
            )
        )
        if start_date:
            query = query.where(Transaction.date >= start_date)
        if end_date:
            query = query.where(Transaction.date <= end_date)
        result = await self.db.execute(query)
        return result.scalar_one()

    async def get_credit_card_total(
        self,
        user_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Decimal:
        query = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            and_(
                Transaction.user_id == user_id,
                Transaction.type == TransactionType.EXPENSE,
                Transaction.payment_method == PaymentMethod.CARTAO_CREDITO
            )
        )
        if start_date:
            query = query.where(Transaction.date >= start_date)
        if end_date:
            query = query.where(Transaction.date <= end_date)
        result = await self.db.execute(query)
        return result.scalar_one()

    async def update(
        self, 
        transaction_id: int, 
        user_id: int, 
        transaction_data: TransactionUpdate
    ) -> Optional[Transaction]:
        transaction = await self.get_by_id(transaction_id, user_id)
        if not transaction:
            return None
        
        update_data = transaction_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(transaction, field, value)
        
        await self.db.commit()
        await self.db.refresh(transaction)
        return transaction
    
    async def delete(self, transaction_id: int, user_id: int) -> bool:
        transaction = await self.get_by_id(transaction_id, user_id)
        if not transaction:
            return False
        
        await self.db.delete(transaction)
        await self.db.commit()
        return True
