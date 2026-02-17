from pydantic import BaseModel
from decimal import Decimal
from typing import Dict, List


class MetricsResponse(BaseModel):
    mrr: Decimal
    total_users: int
    active_users: int
    inactive_users: int
    total_revenue: Decimal
    churn_rate: float
    transactions_count: int
    avg_transaction_value: Decimal
    users_by_plan: Dict[str, int]
    revenue_by_plan: Dict[str, Decimal]


class InsightResponse(BaseModel):
    category: str
    message: str
    change_percentage: float
    severity: str


class DashboardMetrics(BaseModel):
    current_month_income: Decimal
    current_month_expenses: Decimal
    current_month_balance: Decimal
    transaction_count: int
    top_expense_category: str
    insights: List[InsightResponse]
