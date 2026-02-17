from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
from app.repositories.transaction_repository import TransactionRepository
from app.models.transaction import TransactionType
from app.schemas.metrics import InsightResponse
from app.core.logging import logger


class FinancialInsightsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.transaction_repo = TransactionRepository(db)
    
    async def generate_insights(self, user_id: int) -> List[InsightResponse]:
        insights = []
        
        try:
            current_month_insight = await self._analyze_monthly_spending(user_id)
            if current_month_insight:
                insights.append(current_month_insight)
            
            category_insight = await self._analyze_top_category(user_id)
            if category_insight:
                insights.append(category_insight)
            
            trend_insight = await self._analyze_spending_trend(user_id)
            if trend_insight:
                insights.append(trend_insight)
            
            balance_insight = await self._analyze_balance(user_id)
            if balance_insight:
                insights.append(balance_insight)
            
        except Exception as e:
            logger.error(f"Error generating insights: {str(e)}")
        
        return insights
    
    async def _analyze_monthly_spending(self, user_id: int) -> Optional[InsightResponse]:
        now = datetime.now()
        current_month_start = datetime(now.year, now.month, 1).date()
        
        if now.month == 1:
            last_month_start = datetime(now.year - 1, 12, 1).date()
            last_month_end = datetime(now.year, 1, 1).date() - timedelta(days=1)
        else:
            last_month_start = datetime(now.year, now.month - 1, 1).date()
            last_month_end = current_month_start - timedelta(days=1)
        
        current_expenses = await self.transaction_repo.get_total_by_type(
            user_id, TransactionType.EXPENSE, current_month_start, now.date()
        )
        
        last_expenses = await self.transaction_repo.get_total_by_type(
            user_id, TransactionType.EXPENSE, last_month_start, last_month_end
        )
        
        if last_expenses > 0:
            change = ((current_expenses - last_expenses) / last_expenses) * 100
            
            if abs(change) > 10:
                severity = "high" if change > 20 else "medium"
                direction = "aumentaram" if change > 0 else "diminuíram"
                
                return InsightResponse(
                    category="spending_trend",
                    message=f"Suas despesas {direction} {abs(change):.1f}% em relação ao mês passado.",
                    change_percentage=float(change),
                    severity=severity
                )
        
        return None
    
    async def _analyze_top_category(self, user_id: int) -> Optional[InsightResponse]:
        now = datetime.now()
        month_start = datetime(now.year, now.month, 1).date()
        
        by_category = await self.transaction_repo.get_by_category(
            user_id, month_start, now.date()
        )
        
        expenses_by_cat = [c for c in by_category if c["type"] == TransactionType.EXPENSE]
        
        if expenses_by_cat:
            top_category = max(expenses_by_cat, key=lambda x: x["total"])
            total_expenses = sum(c["total"] for c in expenses_by_cat)
            
            if total_expenses > 0:
                percentage = (top_category["total"] / total_expenses) * 100
                
                if percentage > 30:
                    return InsightResponse(
                        category="top_category",
                        message=f"Você gastou {percentage:.1f}% do seu orçamento em {top_category['category']} este mês.",
                        change_percentage=float(percentage),
                        severity="medium" if percentage > 50 else "low"
                    )
        
        return None
    
    async def _analyze_spending_trend(self, user_id: int) -> Optional[InsightResponse]:
        now = datetime.now()
        last_7_days = now.date() - timedelta(days=7)
        last_14_days = now.date() - timedelta(days=14)
        
        recent_expenses = await self.transaction_repo.get_total_by_type(
            user_id, TransactionType.EXPENSE, last_7_days, now.date()
        )
        
        previous_expenses = await self.transaction_repo.get_total_by_type(
            user_id, TransactionType.EXPENSE, last_14_days, last_7_days
        )
        
        if previous_expenses > 0:
            change = ((recent_expenses - previous_expenses) / previous_expenses) * 100
            
            if change > 25:
                return InsightResponse(
                    category="weekly_trend",
                    message=f"Atenção! Seus gastos aumentaram {change:.1f}% na última semana.",
                    change_percentage=float(change),
                    severity="high"
                )
        
        return None
    
    async def _analyze_balance(self, user_id: int) -> Optional[InsightResponse]:
        now = datetime.now()
        month_start = datetime(now.year, now.month, 1).date()
        
        income = await self.transaction_repo.get_total_by_type(
            user_id, TransactionType.INCOME, month_start, now.date()
        )
        
        expenses = await self.transaction_repo.get_total_by_type(
            user_id, TransactionType.EXPENSE, month_start, now.date()
        )
        
        balance = income - expenses
        
        if income > 0:
            savings_rate = (balance / income) * 100
            
            if savings_rate < 10 and balance > 0:
                return InsightResponse(
                    category="savings",
                    message=f"Você está economizando apenas {savings_rate:.1f}% da sua renda. Considere reduzir gastos.",
                    change_percentage=float(savings_rate),
                    severity="medium"
                )
            elif balance < 0:
                return InsightResponse(
                    category="deficit",
                    message=f"Atenção! Você está gastando mais do que ganha este mês (déficit de R$ {abs(balance):.2f}).",
                    change_percentage=float((balance / income) * 100),
                    severity="high"
                )
        
        return None


from typing import Optional
