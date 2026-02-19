from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import date
from decimal import Decimal
from app.repositories.transaction_repository import TransactionRepository
from app.repositories.user_event_repository import UserEventRepository
from app.models.transaction import Transaction, TransactionType
from app.schemas.transaction import TransactionCreate, TransactionUpdate
from app.core.logging import logger


class TransactionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.transaction_repo = TransactionRepository(db)
        self.event_repo = UserEventRepository(db)
    
    async def create_transaction(
        self, 
        user_id: int, 
        transaction_data: TransactionCreate
    ) -> Transaction:
        user_transactions = await self.transaction_repo.get_all_by_user(user_id, limit=1)
        is_first_transaction = len(user_transactions) == 0
        
        transaction = await self.transaction_repo.create(user_id, transaction_data)
        
        if is_first_transaction:
            await self.event_repo.create(
                user_id,
                "first_transaction",
                {
                    "type": str(transaction.type),
                    "amount": float(transaction.amount),
                    "category": transaction.category
                }
            )
        
        logger.info(f"Transaction created for user {user_id}: {transaction.id}")
        return transaction
    
    async def get_transaction(self, transaction_id: int, user_id: int) -> Optional[Transaction]:
        return await self.transaction_repo.get_by_id(transaction_id, user_id)
    
    async def get_user_transactions(
        self, 
        user_id: int, 
        limit: int = 100, 
        offset: int = 0
    ) -> List[Transaction]:
        return await self.transaction_repo.get_all_by_user(user_id, limit, offset)
    
    async def get_transactions_by_date_range(
        self, 
        user_id: int, 
        start_date: date, 
        end_date: date
    ) -> List[Transaction]:
        return await self.transaction_repo.get_by_date_range(user_id, start_date, end_date)
    
    async def get_transactions_by_month(
        self, 
        user_id: int, 
        year: int, 
        month: int
    ) -> List[Transaction]:
        return await self.transaction_repo.get_by_month(user_id, year, month)
    
    async def get_total_income(
        self, 
        user_id: int, 
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Decimal:
        return await self.transaction_repo.get_total_by_type(
            user_id, 
            TransactionType.INCOME, 
            start_date, 
            end_date
        )
    
    async def get_total_expenses(
        self, 
        user_id: int, 
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Decimal:
        return await self.transaction_repo.get_total_by_type(
            user_id, 
            TransactionType.EXPENSE, 
            start_date, 
            end_date
        )
    
    async def get_balance(
        self, 
        user_id: int, 
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Decimal:
        income = await self.get_total_income(user_id, start_date, end_date)
        expenses = await self.get_total_expenses(user_id, start_date, end_date)
        return income - expenses
    
    async def get_account_balance(
        self,
        user_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Decimal:
        income = await self.transaction_repo.get_balance_affecting_total(
            user_id, TransactionType.INCOME, start_date, end_date
        )
        expenses = await self.transaction_repo.get_balance_affecting_total(
            user_id, TransactionType.EXPENSE, start_date, end_date
        )
        return income - expenses

    async def get_credit_card_total(
        self,
        user_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Decimal:
        return await self.transaction_repo.get_credit_card_total(
            user_id, start_date, end_date
        )

    async def count_current_month_transactions(self, user_id: int) -> int:
        from datetime import datetime
        now = datetime.now()
        return await self.transaction_repo.count_by_month(user_id, now.year, now.month)

    async def get_by_category(
        self, 
        user_id: int, 
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[dict]:
        return await self.transaction_repo.get_by_category(user_id, start_date, end_date)
    
    async def update_transaction(
        self, 
        transaction_id: int, 
        user_id: int, 
        transaction_data: TransactionUpdate
    ) -> Optional[Transaction]:
        return await self.transaction_repo.update(transaction_id, user_id, transaction_data)
    
    async def delete_transaction(self, transaction_id: int, user_id: int) -> bool:
        return await self.transaction_repo.delete(transaction_id, user_id)
