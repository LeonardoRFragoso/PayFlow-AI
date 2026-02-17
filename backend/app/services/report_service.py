from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List
from datetime import date, datetime, timedelta
from decimal import Decimal
from app.services.transaction_service import TransactionService
from app.services.reminder_service import ReminderService


class ReportService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.transaction_service = TransactionService(db)
        self.reminder_service = ReminderService(db)
    
    async def get_monthly_summary(self, user_id: int, year: int, month: int) -> Dict[str, Any]:
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month + 1, 1) - timedelta(days=1)
        
        transactions = await self.transaction_service.get_transactions_by_month(
            user_id, year, month
        )
        
        total_income = await self.transaction_service.get_total_income(
            user_id, start_date, end_date
        )
        total_expenses = await self.transaction_service.get_total_expenses(
            user_id, start_date, end_date
        )
        balance = total_income - total_expenses
        
        by_category = await self.transaction_service.get_by_category(
            user_id, start_date, end_date
        )
        
        return {
            "period": f"{year}-{month:02d}",
            "total_income": float(total_income),
            "total_expenses": float(total_expenses),
            "balance": float(balance),
            "transaction_count": len(transactions),
            "by_category": [
                {
                    "category": item["category"],
                    "type": item["type"].value,
                    "total": float(item["total"])
                }
                for item in by_category
            ]
        }
    
    async def get_current_month_summary(self, user_id: int) -> Dict[str, Any]:
        now = datetime.now()
        return await self.get_monthly_summary(user_id, now.year, now.month)
    
    async def get_dashboard_data(self, user_id: int) -> Dict[str, Any]:
        now = datetime.now()
        start_of_month = date(now.year, now.month, 1)
        
        monthly_summary = await self.get_current_month_summary(user_id)
        
        recent_transactions = await self.transaction_service.get_user_transactions(
            user_id, limit=10
        )
        
        upcoming_reminders = await self.reminder_service.get_upcoming_reminders(
            user_id, days=7
        )
        
        return {
            "summary": monthly_summary,
            "recent_transactions": [
                {
                    "id": t.id,
                    "type": t.type.value,
                    "amount": float(t.amount),
                    "category": t.category,
                    "description": t.description,
                    "date": t.date.isoformat()
                }
                for t in recent_transactions
            ],
            "upcoming_reminders": [
                {
                    "id": r.id,
                    "title": r.title,
                    "due_date": r.due_date.isoformat()
                }
                for r in upcoming_reminders
            ]
        }
    
    async def get_period_comparison(
        self, 
        user_id: int, 
        start_date: date, 
        end_date: date
    ) -> Dict[str, Any]:
        total_income = await self.transaction_service.get_total_income(
            user_id, start_date, end_date
        )
        total_expenses = await self.transaction_service.get_total_expenses(
            user_id, start_date, end_date
        )
        
        by_category = await self.transaction_service.get_by_category(
            user_id, start_date, end_date
        )
        
        return {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "total_income": float(total_income),
            "total_expenses": float(total_expenses),
            "balance": float(total_income - total_expenses),
            "by_category": [
                {
                    "category": item["category"],
                    "type": item["type"].value,
                    "total": float(item["total"])
                }
                for item in by_category
            ]
        }
