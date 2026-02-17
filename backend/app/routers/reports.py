from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any
from datetime import date
from app.core.database import get_db
from app.services.report_service import ReportService
from app.utils.dependencies import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/dashboard", response_model=Dict[str, Any])
async def get_dashboard(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    service = ReportService(db)
    return await service.get_dashboard_data(current_user.id)


@router.get("/monthly/{year}/{month}", response_model=Dict[str, Any])
async def get_monthly_summary(
    year: int = Path(..., ge=2000, le=2100),
    month: int = Path(..., ge=1, le=12),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    service = ReportService(db)
    return await service.get_monthly_summary(current_user.id, year, month)


@router.get("/current-month", response_model=Dict[str, Any])
async def get_current_month_summary(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    service = ReportService(db)
    return await service.get_current_month_summary(current_user.id)


@router.get("/period", response_model=Dict[str, Any])
async def get_period_comparison(
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    service = ReportService(db)
    return await service.get_period_comparison(current_user.id, start_date, end_date)
