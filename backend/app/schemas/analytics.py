from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime


class EventCreate(BaseModel):
    event_type: str
    event_data: Optional[Dict] = None


class EventResponse(BaseModel):
    id: int
    user_id: int
    event_type: str
    event_data: Optional[Dict]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ConversionMetrics(BaseModel):
    total_users: int
    pro_users: int
    free_users: int
    conversion_rate: float


class RetentionMetrics(BaseModel):
    period_days: int
    users_created: int
    active_users: int
    retention_rate: float


class ChurnMetrics(BaseModel):
    active_last_month: int
    churned_this_month: int
    churn_rate: float


class LTVMetrics(BaseModel):
    monthly_price: float
    avg_lifetime_months: float
    estimated_ltv: float
    churn_rate_used: float


class FunnelMetrics(BaseModel):
    total_registrations: int
    whatsapp_connected: int
    first_transaction: int
    upgrade_clicked: int
    checkout_started: int
    payment_success: int
    conversion_rates: Dict[str, float]


class CohortData(BaseModel):
    week_start: str
    cohort_size: int
    active_7_days: int
    active_30_days: int
    retention_7_days: float
    retention_30_days: float


class CohortMetrics(BaseModel):
    cohorts: List[CohortData]


class DashboardMetrics(BaseModel):
    mrr: float
    total_revenue: float
    new_users_today: int
    new_users_this_week: int
    new_users_this_month: int
    conversion_rate: float
    churn_rate: float
    estimated_ltv: float
    cac_estimate: float
    active_subscriptions: int
    total_transactions: int
